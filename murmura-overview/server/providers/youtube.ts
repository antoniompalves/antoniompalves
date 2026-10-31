import type { Config } from '../config.ts'
import { pkce } from '../crypto.ts'
import { youtubeTitle } from '../rules.ts'
import { call, rawFetch, withQuery } from './http.ts'
import { ProviderError, invalid } from './types.ts'
import type { Exchanged, Provider, PublishContext, PublishResult, Tokens } from './types.ts'

const TOKEN = 'https://oauth2.googleapis.com/token'
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly']

/**
 * YouTube Data API v3 with Google OAuth (offline access, PKCE). A post is one
 * video: its first line becomes the title (or options.youtube.title), the
 * text the description. Uploads use the resumable protocol.
 */
export function youtubeProvider(c: Config['google']): Provider {
  const toTokens = (d: Record<string, unknown>, prev?: Tokens): Tokens => {
    const now = Date.now()
    return {
      accessToken: String(d.access_token),
      expiresAt: now + Number(d.expires_in ?? 3600) * 1000,
      refreshToken: d.refresh_token ? String(d.refresh_token) : prev?.refreshToken,
      scopes: d.scope ? String(d.scope).split(' ') : (prev?.scopes ?? SCOPES),
      issuedAt: now,
    }
  }

  const exchange = async (code: string, redirectUri: string, verifier?: string): Promise<Exchanged> => {
    const t = await call('youtube', TOKEN, {
      form: { code, client_id: c.clientId, client_secret: c.clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: verifier },
    })
    const tokens = toTokens(t.data)
    if (!tokens.refreshToken) throw new ProviderError('auth', 'youtube: Google sent no refresh token; remove the app at myaccount.google.com/permissions and connect again', { provider: 'youtube' })
    const ch = await call('youtube', 'https://www.googleapis.com/youtube/v3/channels', { bearer: tokens.accessToken, query: { part: 'snippet', mine: true } })
    const items: { id: string; snippet: { title: string; customUrl?: string; thumbnails?: { default?: { url?: string } } } }[] = ch.data.items ?? []
    if (!items.length) throw invalid('youtube: this Google account has no YouTube channel yet', 'youtube')
    return {
      tokens,
      subject: items[0].id,
      label: items[0].snippet.title,
      accounts: items.map((it) => ({
        id: `youtube:${it.id}`,
        network: 'youtube',
        remoteId: it.id,
        name: it.snippet.title,
        handle: it.snippet.customUrl,
        avatar: it.snippet.thumbnails?.default?.url,
      })),
    }
  }

  const publish = async ({ connection, post, media }: PublishContext): Promise<PublishResult> => {
    const clip = post.media.find((m) => m.kind === 'video')
    if (!clip) throw invalid('youtube: a YouTube post needs a video', 'youtube')
    const o = post.options?.youtube ?? {}
    const file = await media.load(clip.url)
    const token = connection.tokens.accessToken
    const init = await call('youtube', 'https://www.googleapis.com/upload/youtube/v3/videos', {
      bearer: token,
      query: { uploadType: 'resumable', part: 'snippet,status' },
      headers: { 'x-upload-content-length': String(file.size), 'x-upload-content-type': file.mime || 'video/*' },
      json: {
        snippet: { title: youtubeTitle(post), description: post.text.replace(/[<>]/g, ''), categoryId: o.categoryId ?? '22', ...(o.tags?.length && { tags: o.tags }) },
        status: { privacyStatus: o.privacy ?? 'public', selfDeclaredMadeForKids: !!o.madeForKids },
      },
    })
    const session = init.headers.get('location')
    if (!session) throw new ProviderError('transient', 'youtube: no upload session returned', { provider: 'youtube' })
    const res = await rawFetch(session, {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': file.mime || 'video/*', 'content-length': String(file.size) },
      body: file.bytes,
      signal: AbortSignal.timeout(30 * 60_000),
    })
    const body: any = await res.json().catch(() => ({}))
    if (!res.ok) {
      const reason = body?.error?.errors?.[0]?.reason ?? ''
      const code = /quota|LimitExceeded/i.test(reason) ? 'rate_limit' : res.status >= 500 ? 'transient' : 'media'
      throw new ProviderError(code, `youtube: upload failed (${body?.error?.message ?? `HTTP ${res.status}`})`, { provider: 'youtube', status: res.status })
    }
    const note =
      body?.status?.privacyStatus === 'private' && (o.privacy ?? 'public') !== 'private'
        ? 'YouTube kept it private: uploads from Google Cloud projects that have not passed the YouTube API audit stay private.'
        : undefined
    return { remoteId: body.id, url: `https://www.youtube.com/watch?v=${body.id}`, status: 'published', note }
  }

  return {
    id: 'youtube',
    networks: ['youtube'],
    configured: !!(c.clientId && c.clientSecret),
    authorize(state, redirectUri) {
      const { verifier, challenge } = pkce()
      return {
        verifier,
        url: withQuery('https://accounts.google.com/o/oauth2/v2/auth', {
          client_id: c.clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: SCOPES.join(' '),
          access_type: 'offline',
          prompt: 'consent',
          include_granted_scopes: true,
          state,
          code_challenge: challenge,
          code_challenge_method: 'S256',
        }),
      }
    },
    exchange,
    async refresh(tokens) {
      if (!tokens.refreshToken) throw new ProviderError('auth', 'youtube: the sign-in expired; connect YouTube again', { provider: 'youtube' })
      const r = await call('youtube', TOKEN, { form: { client_id: c.clientId, client_secret: c.clientSecret, refresh_token: tokens.refreshToken, grant_type: 'refresh_token' } })
      return toTokens(r.data, tokens)
    },
    publish,
  }
}
