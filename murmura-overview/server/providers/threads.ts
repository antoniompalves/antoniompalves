import type { Config } from '../config.ts'
import { call, poll, withQuery } from './http.ts'
import { ProviderError } from './types.ts'
import type { Exchanged, Provider, PublishContext, PublishResult, Tokens } from './types.ts'

const HOST = 'https://graph.threads.com'
const API = `${HOST}/v1.0`
const DAY = 86_400_000

/**
 * Threads has its own sign-in and app secret (the "Threads" use case of a
 * Meta app). Tokens last an hour, are swapped for 60-day ones, and must be
 * refreshed (once at least a day old) before they lapse.
 */
export function threadsProvider(c: Config['threads'], opts: { pollMs?: number } = {}): Provider {
  const pollMs = opts.pollMs ?? 5000

  const longLived = (data: { access_token: string; expires_in?: number }, scopes: string[]): Tokens => {
    const now = Date.now()
    return { accessToken: data.access_token, expiresAt: now + Number(data.expires_in ?? 60 * 86400) * 1000, scopes, issuedAt: now }
  }

  const exchange = async (code: string, redirectUri: string): Promise<Exchanged> => {
    const short = await call('threads', `${HOST}/oauth/access_token`, {
      form: { client_id: c.appId, client_secret: c.appSecret, grant_type: 'authorization_code', redirect_uri: redirectUri, code },
    })
    const long = await call('threads', `${HOST}/access_token`, {
      query: { grant_type: 'th_exchange_token', client_secret: c.appSecret, access_token: short.data.access_token },
    })
    const token = long.data.access_token
    const me = await call('threads', `${API}/me`, { bearer: token, query: { fields: 'id,username,name,threads_profile_picture_url' } })
    const u = me.data
    return {
      tokens: longLived(long.data, ['threads_basic', 'threads_content_publish']),
      subject: u.id,
      label: u.name ?? u.username,
      accounts: [{ id: `threads:${u.id}`, network: 'threads', remoteId: u.id, name: u.name ?? u.username, handle: u.username, avatar: u.threads_profile_picture_url }],
    }
  }

  const container = (user: string, token: string, form: Record<string, string | boolean | undefined>) =>
    call('threads', `${API}/${user}/threads`, { bearer: token, form }).then((r) => r.data.id as string)

  const status = (id: string, token: string) =>
    call('threads', `${API}/${id}`, { bearer: token, query: { fields: 'status,error_message' } }).then((r) => r.data as { status: string; error_message?: string })

  const ready = async (id: string, token: string) => {
    const s = await poll(() => status(id, token), (v) => v.status !== 'IN_PROGRESS', { attempts: 60, intervalMs: pollMs })
    if (s.status === 'ERROR') throw new ProviderError('media', `threads: the media couldn't be processed (${s.error_message ?? 'error'})`, { provider: 'threads' })
    if (s.status === 'EXPIRED') throw new ProviderError('media', 'threads: the container expired before publishing', { provider: 'threads', retryable: true })
    if (s.status === 'IN_PROGRESS') throw new ProviderError('transient', 'threads: still processing the media', { provider: 'threads' })
  }

  const publish = async ({ account, connection, post }: PublishContext): Promise<PublishResult> => {
    const user = account.remoteId
    const token = connection.tokens.accessToken
    const limit = await call('threads', `${API}/${user}/threads_publishing_limit`, { bearer: token, query: { fields: 'quota_usage,config' } })
    const q = limit.data.data?.[0]
    if (q?.config && q.quota_usage >= q.config.quota_total)
      throw new ProviderError('rate_limit', `threads: this profile has used its ${q.config.quota_total} posts for the last 24 hours`, { provider: 'threads' })

    let creation: string
    if (!post.media.length) {
      creation = await container(user, token, { media_type: 'TEXT', text: post.text, link_attachment: post.link })
    } else if (post.media.length === 1) {
      const m = post.media[0]
      creation = await container(user, token, m.kind === 'video' ? { media_type: 'VIDEO', video_url: m.url, text: post.text } : { media_type: 'IMAGE', image_url: m.url, text: post.text, alt_text: m.alt })
    } else {
      const children: string[] = []
      for (const m of post.media)
        children.push(await container(user, token, m.kind === 'video' ? { media_type: 'VIDEO', video_url: m.url, is_carousel_item: true } : { media_type: 'IMAGE', image_url: m.url, is_carousel_item: true, alt_text: m.alt }))
      for (const ch of children) await ready(ch, token)
      creation = await container(user, token, { media_type: 'CAROUSEL', children: children.join(','), text: post.text })
    }
    await ready(creation, token)

    let id: string
    try {
      id = (await call('threads', `${API}/${user}/threads_publish`, { bearer: token, form: { creation_id: creation } })).data.id
    } catch (e) {
      // Threads sometimes answers "media not found" while the container is being published: ask the container.
      const s = await status(creation, token).catch(() => null)
      if (s?.status !== 'PUBLISHED') throw e
      return { remoteId: creation, status: 'published', note: 'Published; Threads did not return the post id.' }
    }
    let url: string | undefined
    try {
      url = (await call('threads', `${API}/${id}`, { bearer: token, query: { fields: 'permalink' } })).data.permalink
    } catch {
      url = account.handle ? `https://www.threads.com/@${account.handle}` : undefined
    }
    return { remoteId: id, url, status: 'published' }
  }

  return {
    id: 'threads',
    networks: ['threads'],
    configured: !!(c.appId && c.appSecret),
    authorize(state, redirectUri) {
      return {
        url: withQuery('https://threads.com/oauth/authorize', {
          client_id: c.appId,
          redirect_uri: redirectUri,
          scope: 'threads_basic,threads_content_publish',
          response_type: 'code',
          state,
        }),
      }
    },
    exchange,
    async refresh(tokens) {
      // Only tokens at least a day old can be refreshed.
      if (Date.now() - tokens.issuedAt < DAY) return tokens
      const r = await call('threads', `${HOST}/refresh_access_token`, { query: { grant_type: 'th_refresh_token', access_token: tokens.accessToken } })
      return longLived(r.data, tokens.scopes)
    },
    publish,
  }
}
