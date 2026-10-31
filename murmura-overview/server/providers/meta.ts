import type { Config } from '../config.ts'
import { call, poll, withQuery } from './http.ts'
import { ProviderError, invalid } from './types.ts'
import type { Account, Exchanged, Provider, PublishContext, PublishResult, Tokens } from './types.ts'

/** Permissions for posting to Pages and their Instagram accounts (+ the first comment). */
export const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'business_management',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_comments',
]

interface PageNode {
  id: string
  name: string
  access_token: string
  tasks?: string[]
  picture?: { data?: { url?: string } }
  instagram_business_account?: { id: string; username?: string; name?: string; profile_picture_url?: string }
}

/** Container states the Graph API reports while Meta fetches and processes media. */
type ContainerStatus = 'IN_PROGRESS' | 'FINISHED' | 'PUBLISHED' | 'ERROR' | 'EXPIRED'

/**
 * Meta through Facebook Login for Business: one sign-in lists the Pages the
 * person can post to and the Instagram professional accounts linked to them.
 * Both post with the Page access token, which has no expiry of its own when
 * it comes from a long-lived user token.
 */
export function metaProvider(c: Config['meta'], opts: { pollMs?: number } = {}): Provider {
  const graph = `https://graph.facebook.com/${c.version}`
  const video = `https://graph-video.facebook.com/${c.version}`
  const pollMs = opts.pollMs ?? 5000

  const exchange = async (code: string, redirectUri: string): Promise<Exchanged> => {
    const short = await call('meta', `${graph}/oauth/access_token`, {
      query: { client_id: c.appId, client_secret: c.appSecret, redirect_uri: redirectUri, code },
    })
    const long = await call('meta', `${graph}/oauth/access_token`, {
      query: { grant_type: 'fb_exchange_token', client_id: c.appId, client_secret: c.appSecret, fb_exchange_token: short.data.access_token },
    })
    const token: string = long.data.access_token
    const me = await call('meta', `${graph}/me`, { bearer: token, query: { fields: 'id,name' } })
    const granted = await call('meta', `${graph}/me/permissions`, { bearer: token })
    const pages: PageNode[] = []
    let next: string | undefined = withQuery(`${graph}/me/accounts`, {
      fields: 'id,name,access_token,tasks,picture{url},instagram_business_account{id,username,name,profile_picture_url}',
      limit: 100,
    })
    for (let i = 0; next && i < 10; i++) {
      const r: { data: { data: PageNode[]; paging?: { next?: string } } } = await call('meta', next, { bearer: token })
      pages.push(...r.data.data)
      next = r.data.paging?.next
    }
    const accounts: Account[] = []
    for (const p of pages) {
      // Posting needs the "Create content" task on the Page.
      if (p.tasks && !p.tasks.includes('CREATE_CONTENT')) continue
      accounts.push({ id: `facebook:${p.id}`, network: 'facebook', remoteId: p.id, name: p.name, avatar: p.picture?.data?.url, token: p.access_token })
      const ig = p.instagram_business_account
      if (ig)
        accounts.push({
          id: `instagram:${ig.id}`,
          network: 'instagram',
          remoteId: ig.id,
          name: ig.name ?? ig.username ?? p.name,
          handle: ig.username,
          avatar: ig.profile_picture_url,
          token: p.access_token,
          meta: { pageId: p.id },
        })
    }
    const now = Date.now()
    const tokens: Tokens = {
      accessToken: token,
      expiresAt: long.data.expires_in ? now + Number(long.data.expires_in) * 1000 : undefined,
      scopes: (granted.data.data ?? []).filter((x: { status: string }) => x.status === 'granted').map((x: { permission: string }) => x.permission),
      issuedAt: now,
    }
    return { tokens, subject: me.data.id, label: me.data.name, accounts }
  }

  /* ───── Facebook Pages ───── */

  const permalink = async (id: string, token: string, field: 'permalink_url' | 'permalink') => {
    try {
      const r = await call('meta', `${graph}/${id}`, { bearer: token, query: { fields: field } })
      return r.data[field] as string | undefined
    } catch {
      return undefined
    }
  }

  const publishFacebook = async ({ account, post }: PublishContext): Promise<PublishResult> => {
    const page = account.remoteId
    const token = account.token!
    const photos = post.media.filter((m) => m.kind === 'image')
    const clip = post.media.find((m) => m.kind === 'video')
    let id: string
    if (clip) {
      const r = await call('meta', `${video}/${page}/videos`, { bearer: token, form: { file_url: clip.url, description: post.text } })
      return { remoteId: r.data.id, url: `https://www.facebook.com/${page}/videos/${r.data.id}`, status: 'published' }
    }
    if (photos.length === 1) {
      const r = await call('meta', `${graph}/${page}/photos`, { bearer: token, form: { url: photos[0].url, message: post.text } })
      id = r.data.post_id ?? r.data.id
    } else if (photos.length > 1) {
      // Each photo goes up unpublished, then one post carries them all.
      const ids: string[] = []
      for (const ph of photos) {
        const r = await call('meta', `${graph}/${page}/photos`, { bearer: token, form: { url: ph.url, published: false } })
        ids.push(r.data.id)
      }
      const form: Record<string, string> = { message: post.text }
      ids.forEach((m, i) => (form[`attached_media[${i}]`] = JSON.stringify({ media_fbid: m })))
      const r = await call('meta', `${graph}/${page}/feed`, { bearer: token, form })
      id = r.data.id
    } else {
      const r = await call('meta', `${graph}/${page}/feed`, { bearer: token, form: { message: post.text, link: post.link } })
      id = r.data.id
    }
    return { remoteId: id, url: await permalink(id, token, 'permalink_url'), status: 'published' }
  }

  /* ───── Instagram ───── */

  const container = (ig: string, token: string, form: Record<string, string | boolean | undefined>) =>
    call('meta', `${graph}/${ig}/media`, { bearer: token, form }).then((r) => r.data.id as string)

  const status = (id: string, token: string) =>
    call('meta', `${graph}/${id}`, { bearer: token, query: { fields: 'status_code,status' } }).then((r) => r.data as { status_code: ContainerStatus; status?: string })

  /** Meta fetches and transcodes media first; a container can be published once it's FINISHED (checked once a minute for 5 min by Meta's advice; faster here). */
  const ready = async (id: string, token: string) => {
    const s = await poll(() => status(id, token), (v) => v.status_code !== 'IN_PROGRESS', { attempts: 60, intervalMs: pollMs })
    if (s.status_code === 'ERROR') throw new ProviderError('media', `meta: Instagram couldn't process the media (${s.status ?? 'error'})`, { provider: 'meta' })
    if (s.status_code === 'EXPIRED') throw new ProviderError('media', 'meta: the Instagram container expired before publishing', { provider: 'meta', retryable: true })
    if (s.status_code === 'IN_PROGRESS') throw new ProviderError('transient', 'meta: Instagram is still processing the video', { provider: 'meta' })
  }

  const publishInstagram = async ({ account, post }: PublishContext): Promise<PublishResult> => {
    const ig = account.remoteId
    const token = account.token!
    const quota = await call('meta', `${graph}/${ig}/content_publishing_limit`, { bearer: token, query: { fields: 'quota_usage,config' } })
    const q = quota.data.data?.[0]
    if (q && q.config && q.quota_usage >= q.config.quota_total)
      throw new ProviderError('rate_limit', `meta: this Instagram account has used its ${q.config.quota_total} API posts for the last 24 hours`, { provider: 'meta' })

    let creation: string
    if (post.media.length === 1) {
      const m = post.media[0]
      creation = await container(
        ig,
        token,
        m.kind === 'video' ? { media_type: 'REELS', video_url: m.url, caption: post.text, share_to_feed: true } : { image_url: m.url, caption: post.text, alt_text: m.alt },
      )
      await ready(creation, token)
    } else {
      const children: string[] = []
      for (const m of post.media)
        children.push(await container(ig, token, m.kind === 'video' ? { media_type: 'VIDEO', video_url: m.url, is_carousel_item: true } : { image_url: m.url, is_carousel_item: true }))
      for (const ch of children) await ready(ch, token)
      creation = await container(ig, token, { media_type: 'CAROUSEL', children: children.join(','), caption: post.text })
      await ready(creation, token)
    }

    let mediaId: string
    try {
      const r = await call('meta', `${graph}/${ig}/media_publish`, { bearer: token, form: { creation_id: creation } })
      mediaId = r.data.id
    } catch (e) {
      // A failed reply doesn't prove nothing went out: the container knows.
      const s = await status(creation, token).catch(() => null)
      if (s?.status_code !== 'PUBLISHED') throw e
      return { remoteId: creation, status: 'published', note: 'Published; Instagram did not return the post id.' }
    }
    let note: string | undefined
    if (post.firstComment?.trim()) {
      try {
        await call('meta', `${graph}/${mediaId}/comments`, { bearer: token, form: { message: post.firstComment.trim() } })
      } catch (e) {
        note = `The first comment wasn't added: ${(e as Error).message}`
      }
    }
    return { remoteId: mediaId, url: await permalink(mediaId, token, 'permalink'), status: 'published', note }
  }

  return {
    id: 'meta',
    networks: ['facebook', 'instagram'],
    configured: !!(c.appId && c.appSecret),
    authorize(state, redirectUri) {
      const q: Record<string, string> = { client_id: c.appId, redirect_uri: redirectUri, state, response_type: 'code' }
      if (c.configId) q.config_id = c.configId
      else q.scope = META_SCOPES.join(',')
      return { url: withQuery(`https://www.facebook.com/${c.version}/dialog/oauth`, q) }
    },
    exchange,
    publish(ctx) {
      if (!ctx.account.token) throw invalid('meta: this account has no Page token; sign in again', 'meta')
      return ctx.account.network === 'instagram' ? publishInstagram(ctx) : publishFacebook(ctx)
    },
  }
}
