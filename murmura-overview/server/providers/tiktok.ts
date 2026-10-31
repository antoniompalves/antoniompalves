import type { TikTokPrivacy } from '../../src/data/publishing.ts'
import type { Config } from '../config.ts'
import { call, poll, rawFetch, withQuery } from './http.ts'
import { ProviderError, invalid } from './types.ts'
import type { Exchanged, Provider, PublishContext, PublishResult, Tokens } from './types.ts'

const API = 'https://open.tiktokapis.com/v2'
const MB = 1024 * 1024
/** TikTok's chunk rules: 5–64 MB per chunk, the last one may be bigger; under 5 MB goes in one piece. */
const CHUNK = 10 * MB

export interface CreatorInfo {
  creator_username: string
  creator_nickname: string
  creator_avatar_url: string
  privacy_level_options: TikTokPrivacy[]
  comment_disabled: boolean
  duet_disabled: boolean
  stitch_disabled: boolean
  max_video_post_duration_sec: number
}

/** How a file of `size` bytes is cut for FILE_UPLOAD. */
export function chunksFor(size: number) {
  const chunk = size < 5 * MB ? size : CHUNK
  const count = Math.max(1, Math.floor(size / chunk))
  return { chunk, count, ranges: Array.from({ length: count }, (_, i) => [i * chunk, i === count - 1 ? size - 1 : (i + 1) * chunk - 1] as const) }
}

/**
 * TikTok's Content Posting API, "Direct Post". Every post first asks for the
 * creator's current settings (the composer must show them), uses an audience
 * the creator allows, and is checked on afterwards: TikTok processes and
 * moderates on its own time. Until TikTok audits the app, posts can only be
 * private ("SELF_ONLY").
 */
export function tiktokProvider(c: Config['tiktok'], opts: { pollMs?: number } = {}): Provider & { creatorInfo(token: string): Promise<CreatorInfo> } {
  const pollMs = opts.pollMs ?? 5000
  const scopes = ['user.info.basic', 'user.info.profile', 'video.publish']

  const toTokens = (d: Record<string, unknown>): Tokens => {
    const now = Date.now()
    return {
      accessToken: String(d.access_token),
      expiresAt: now + Number(d.expires_in ?? 86400) * 1000,
      refreshToken: d.refresh_token ? String(d.refresh_token) : undefined,
      refreshExpiresAt: d.refresh_expires_in ? now + Number(d.refresh_expires_in) * 1000 : undefined,
      scopes: d.scope ? String(d.scope).split(',') : scopes,
      issuedAt: now,
    }
  }

  const token = (form: Record<string, string>) =>
    call('tiktok', `${API}/oauth/token/`, { form: { client_key: c.clientKey, client_secret: c.clientSecret, ...form }, headers: { 'cache-control': 'no-cache' } })

  const exchange = async (code: string, redirectUri: string): Promise<Exchanged> => {
    const t = await token({ code, grant_type: 'authorization_code', redirect_uri: redirectUri })
    if (!t.data.access_token) throw new ProviderError('auth', `tiktok: ${t.data.error_description ?? 'no access token'}`, { provider: 'tiktok' })
    const tokens = toTokens(t.data)
    const u = (await call('tiktok', `${API}/user/info/`, { bearer: tokens.accessToken, query: { fields: 'open_id,avatar_url,display_name,username' } })).data.data.user
    return {
      tokens,
      subject: u.open_id,
      label: u.display_name,
      accounts: [{ id: `tiktok:${u.open_id}`, network: 'tiktok', remoteId: u.open_id, name: u.display_name, handle: u.username, avatar: u.avatar_url }],
    }
  }

  const creatorInfo = async (accessToken: string) =>
    (await call<{ data: CreatorInfo }>('tiktok', `${API}/post/publish/creator_info/query/`, { bearer: accessToken, json: {} })).data.data

  const pullable = (url: string) => c.pullPrefixes.some((p) => url.startsWith(p))

  const status = async (accessToken: string, publishId: string) =>
    (await call('tiktok', `${API}/post/publish/status/fetch/`, { bearer: accessToken, json: { publish_id: publishId } })).data.data as {
      status: 'PROCESSING_UPLOAD' | 'PROCESSING_DOWNLOAD' | 'SEND_TO_USER_INBOX' | 'PUBLISH_COMPLETE' | 'FAILED'
      fail_reason?: string
      publicaly_available_post_id?: (number | string)[]
    }

  const result = (ctx: PublishContext, publishId: string, s: Awaited<ReturnType<typeof status>>): PublishResult => {
    if (s.status === 'FAILED') throw new ProviderError('media', `tiktok: publishing failed (${s.fail_reason ?? 'unknown reason'})`, { provider: 'tiktok' })
    const postId = s.publicaly_available_post_id?.[0]
    if (s.status === 'PUBLISH_COMPLETE')
      return {
        remoteId: postId ? String(postId) : publishId,
        url: postId && ctx.account.handle ? `https://www.tiktok.com/@${ctx.account.handle}/video/${postId}` : undefined,
        status: 'published',
        note: postId ? undefined : 'Posted; TikTok shows it publicly once moderation finishes (private posts never get a public link).',
      }
    return { remoteId: publishId, status: 'processing' }
  }

  const publish = async (ctx: PublishContext): Promise<PublishResult> => {
    const { post } = ctx
    const access = ctx.connection.tokens.accessToken
    const o = post.options?.tiktok
    if (!o?.privacy) throw invalid('tiktok: pick who can see this post', 'tiktok')
    const info = await creatorInfo(access)
    if (!info.privacy_level_options.includes(o.privacy))
      throw invalid(`tiktok: ${info.creator_nickname} can't post to "${o.privacy}" (allowed: ${info.privacy_level_options.join(', ')})`, 'tiktok')
    // The creator's own settings win over the post's.
    const interactions = {
      disable_comment: info.comment_disabled || !!o.disableComment,
      ...(post.media[0]?.kind === 'video' && { disable_duet: info.duet_disabled || !!o.disableDuet, disable_stitch: info.stitch_disabled || !!o.disableStitch }),
      brand_content_toggle: !!o.brandContent,
      brand_organic_toggle: !!o.brandOrganic,
      ...(o.aiGenerated && { is_aigc: true }),
    }

    let publishId: string
    const clip = post.media.find((m) => m.kind === 'video')
    if (clip) {
      const postInfo = { title: post.text, privacy_level: o.privacy, ...interactions }
      if (pullable(clip.url)) {
        publishId = (await call('tiktok', `${API}/post/publish/video/init/`, { bearer: access, json: { post_info: postInfo, source_info: { source: 'PULL_FROM_URL', video_url: clip.url } } })).data.data.publish_id
      } else {
        const file = await ctx.media.load(clip.url)
        const { chunk, count, ranges } = chunksFor(file.size)
        const init = await call('tiktok', `${API}/post/publish/video/init/`, {
          bearer: access,
          json: { post_info: postInfo, source_info: { source: 'FILE_UPLOAD', video_size: file.size, chunk_size: chunk, total_chunk_count: count } },
        })
        publishId = init.data.data.publish_id
        for (const [first, last] of ranges) {
          const res = await rawFetch(init.data.data.upload_url, {
            method: 'PUT',
            headers: { 'content-type': file.mime || 'video/mp4', 'content-length': String(last - first + 1), 'content-range': `bytes ${first}-${last}/${file.size}` },
            body: file.bytes.subarray(first, last + 1),
            signal: AbortSignal.timeout(300_000),
          })
          if (!res.ok) throw new ProviderError(res.status >= 500 ? 'transient' : 'media', `tiktok: upload failed (HTTP ${res.status})`, { provider: 'tiktok', status: res.status })
        }
      }
    } else {
      const urls = post.media.map((m) => m.url)
      if (!urls.every(pullable))
        throw invalid('tiktok: photo posts are pulled from a verified domain; host the photos under a prefix listed in TIKTOK_PULL_PREFIXES', 'tiktok')
      const title = (o.photoTitle ?? post.text.split('\n')[0] ?? '').slice(0, 90)
      publishId = (
        await call('tiktok', `${API}/post/publish/content/init/`, {
          bearer: access,
          json: {
            post_info: { title, description: post.text, privacy_level: o.privacy, auto_add_music: true, ...interactions },
            source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: urls },
            post_mode: 'DIRECT_POST',
            media_type: 'PHOTO',
          },
        })
      ).data.data.publish_id
    }
    const s = await poll(() => status(access, publishId), (v) => v.status === 'PUBLISH_COMPLETE' || v.status === 'FAILED', { attempts: 12, intervalMs: pollMs })
    return result(ctx, publishId, s)
  }

  return {
    id: 'tiktok',
    networks: ['tiktok'],
    configured: !!(c.clientKey && c.clientSecret),
    authorize(state, redirectUri) {
      return { url: withQuery('https://www.tiktok.com/v2/auth/authorize/', { client_key: c.clientKey, scope: scopes.join(','), response_type: 'code', redirect_uri: redirectUri, state }) }
    },
    exchange,
    async refresh(tokens) {
      if (!tokens.refreshToken) throw new ProviderError('auth', 'tiktok: the sign-in expired; connect TikTok again', { provider: 'tiktok' })
      const r = await token({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken })
      return toTokens(r.data)
    },
    publish,
    async check(ctx, publishId) {
      return result(ctx, publishId, await status(ctx.connection.tokens.accessToken, publishId))
    },
    creatorInfo,
  }
}
