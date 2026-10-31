import type { Config } from '../config.ts'
import { call, poll, rawFetch, withQuery } from './http.ts'
import { ProviderError } from './types.ts'
import type { Account, Exchanged, Provider, PublishContext, PublishResult, Tokens } from './types.ts'

const OAUTH = 'https://www.linkedin.com/oauth/v2'
const REST = 'https://api.linkedin.com/rest'

/**
 * LinkedIn's "little text" format treats these as markup; unescaped, text
 * after a bracket can vanish. Hashtags (#) are left alone so they still link.
 */
export const littleText = (s: string) => s.replace(/[\\|{}@[\]()<>*_~]/g, (ch) => `\\${ch}`)

/**
 * LinkedIn's versioned API (/rest, "LinkedIn-Version: YYYYMM"). A member
 * posts as themselves with "Share on LinkedIn" (w_member_social); Company
 * Pages need the Community Management API (w_organization_social), which
 * LinkedIn approves separately.
 */
export function linkedinProvider(c: Config['linkedin'], opts: { pollMs?: number } = {}): Provider {
  const pollMs = opts.pollMs ?? 3000
  const scopes = ['openid', 'profile', 'w_member_social', ...(c.organizations ? ['w_organization_social', 'r_organization_admin'] : [])]
  const rest = (token: string) => ({ bearer: token, headers: { 'LinkedIn-Version': c.version, 'X-Restli-Protocol-Version': '2.0.0' } })

  const toTokens = (d: Record<string, unknown>, fallbackScopes: string[]): Tokens => {
    const now = Date.now()
    return {
      accessToken: String(d.access_token),
      expiresAt: d.expires_in ? now + Number(d.expires_in) * 1000 : undefined,
      refreshToken: d.refresh_token ? String(d.refresh_token) : undefined,
      refreshExpiresAt: d.refresh_token_expires_in ? now + Number(d.refresh_token_expires_in) * 1000 : undefined,
      scopes: d.scope ? String(d.scope).split(/[ ,]/).filter(Boolean) : fallbackScopes,
      issuedAt: now,
    }
  }

  const exchange = async (code: string, redirectUri: string): Promise<Exchanged> => {
    const t = await call('linkedin', `${OAUTH}/accessToken`, {
      form: { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: c.clientId, client_secret: c.clientSecret },
    })
    const tokens = toTokens(t.data, scopes)
    const me = (await call('linkedin', 'https://api.linkedin.com/v2/userinfo', { bearer: tokens.accessToken })).data
    const accounts: Account[] = [
      { id: `linkedin:${me.sub}`, network: 'linkedin', remoteId: me.sub, name: me.name, avatar: me.picture, meta: { author: `urn:li:person:${me.sub}`, kind: 'member' } },
    ]
    if (tokens.scopes.includes('w_organization_social')) {
      const acls = await call('linkedin', `${REST}/organizationAcls`, { ...rest(tokens.accessToken), query: { q: 'roleAssignee', role: 'ADMINISTRATOR', state: 'APPROVED' } })
      for (const el of acls.data.elements ?? []) {
        const urn: string = el.organization
        const id = urn.split(':').pop()!
        const org = await call('linkedin', `${REST}/organizations/${id}`, rest(tokens.accessToken)).then((r) => r.data).catch(() => ({}))
        accounts.push({
          id: `linkedin:org-${id}`,
          network: 'linkedin',
          remoteId: id,
          name: org.localizedName ?? `Organization ${id}`,
          handle: org.vanityName,
          meta: { author: urn, kind: 'organization' },
        })
      }
    }
    return { tokens, subject: me.sub, label: me.name, accounts }
  }

  /** PUT to a LinkedIn upload URL (which also wants the token); returns the part's ETag. */
  const put = async (url: string, token: string, bytes: Uint8Array, mime: string) => {
    const res = await rawFetch(url, { method: 'PUT', headers: { authorization: `Bearer ${token}`, 'content-type': mime }, body: bytes, signal: AbortSignal.timeout(300_000) })
    if (!res.ok) throw new ProviderError(res.status >= 500 ? 'transient' : 'media', `linkedin: upload failed (HTTP ${res.status})`, { provider: 'linkedin', status: res.status })
    return res.headers.get('etag') ?? ''
  }

  const uploadImage = async (ctx: PublishContext, author: string, url: string) => {
    const token = ctx.connection.tokens.accessToken
    const init = await call('linkedin', `${REST}/images`, { ...rest(token), query: { action: 'initializeUpload' }, json: { initializeUploadRequest: { owner: author } } })
    const { uploadUrl, image } = init.data.value
    const file = await ctx.media.load(url)
    await put(uploadUrl, token, file.bytes, file.mime)
    return image as string
  }

  const uploadVideo = async (ctx: PublishContext, author: string, url: string) => {
    const token = ctx.connection.tokens.accessToken
    const file = await ctx.media.load(url)
    const init = await call('linkedin', `${REST}/videos`, {
      ...rest(token),
      query: { action: 'initializeUpload' },
      json: { initializeUploadRequest: { owner: author, fileSizeBytes: file.size, uploadCaptions: false, uploadThumbnail: false } },
    })
    const { video, uploadToken, uploadInstructions } = init.data.value as { video: string; uploadToken?: string; uploadInstructions: { uploadUrl: string; firstByte: number; lastByte: number }[] }
    const etags: string[] = []
    for (const part of uploadInstructions) etags.push(await put(part.uploadUrl, token, file.bytes.subarray(part.firstByte, part.lastByte + 1), 'application/octet-stream'))
    await call('linkedin', `${REST}/videos`, {
      ...rest(token),
      query: { action: 'finalizeUpload' },
      json: { finalizeUploadRequest: { video, uploadToken: uploadToken ?? '', uploadedPartIds: etags } },
    })
    // Posting works once processing starts; wait a little so the post doesn't go out empty.
    await poll(
      () => call('linkedin', `${REST}/videos/${encodeURIComponent(video)}`, rest(token)).then((r) => r.data.status as string).catch(() => 'PROCESSING'),
      (s) => s === 'AVAILABLE' || s === 'PROCESSING_FAILED',
      { attempts: 20, intervalMs: pollMs },
    ).then((s) => {
      if (s === 'PROCESSING_FAILED') throw new ProviderError('media', "linkedin: LinkedIn couldn't process the video", { provider: 'linkedin' })
    })
    return video
  }

  const publish = async (ctx: PublishContext): Promise<PublishResult> => {
    const { account, post } = ctx
    const author = account.meta?.author ?? `urn:li:person:${account.remoteId}`
    const photos = post.media.filter((m) => m.kind === 'image')
    const clip = post.media.find((m) => m.kind === 'video')
    let content: Record<string, unknown> | undefined
    if (clip) content = { media: { id: await uploadVideo(ctx, author, clip.url) } }
    else if (photos.length === 1) content = { media: { id: await uploadImage(ctx, author, photos[0].url), altText: photos[0].alt } }
    else if (photos.length > 1) {
      const images = []
      for (const ph of photos) images.push({ id: await uploadImage(ctx, author, ph.url), altText: ph.alt })
      content = { multiImage: { images } }
    } else if (post.link) content = { article: { source: post.link, title: (post.text.split('\n')[0] || post.link).slice(0, 200) } }

    const r = await call('linkedin', `${REST}/posts`, {
      ...rest(ctx.connection.tokens.accessToken),
      json: {
        author,
        commentary: littleText(post.text),
        visibility: post.options?.linkedin?.visibility ?? 'PUBLIC',
        distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
        ...(content && { content }),
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      },
    })
    const urn = r.headers.get('x-restli-id') ?? r.headers.get('x-linkedin-id') ?? r.data?.id ?? ''
    return { remoteId: urn, url: urn ? `https://www.linkedin.com/feed/update/${urn}/` : undefined, status: 'published' }
  }

  return {
    id: 'linkedin',
    networks: ['linkedin'],
    configured: !!(c.clientId && c.clientSecret),
    authorize(state, redirectUri) {
      return { url: withQuery(`${OAUTH}/authorization`, { response_type: 'code', client_id: c.clientId, redirect_uri: redirectUri, state, scope: scopes.join(' ') }) }
    },
    exchange,
    async refresh(tokens) {
      // Refresh tokens are only issued to approved partners; otherwise people sign in again every 60 days.
      if (!tokens.refreshToken) throw new ProviderError('auth', 'linkedin: the sign-in expired; connect LinkedIn again', { provider: 'linkedin' })
      const r = await call('linkedin', `${OAUTH}/accessToken`, {
        form: { grant_type: 'refresh_token', refresh_token: tokens.refreshToken, client_id: c.clientId, client_secret: c.clientSecret },
      })
      const next = toTokens(r.data, tokens.scopes)
      return { ...next, refreshToken: next.refreshToken ?? tokens.refreshToken, refreshExpiresAt: next.refreshExpiresAt ?? tokens.refreshExpiresAt }
    },
    publish,
  }
}
