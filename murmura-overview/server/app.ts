import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ConnectMessage, PublishAccount, PublishJob, PublishProvider, PublishRejection, PublishRequest, PublisherHealth } from '../src/data/publishing.ts'
import { configured } from './config.ts'
import type { Config } from './config.ts'
import { randomId, safeEqual } from './crypto.ts'
import type { MediaLibrary } from './media.ts'
import { ensureFresh, runJob } from './publish.ts'
import type { Deps } from './publish.ts'
import { linkedinProvider } from './providers/linkedin.ts'
import { metaProvider } from './providers/meta.ts'
import { threadsProvider } from './providers/threads.ts'
import { tiktokProvider } from './providers/tiktok.ts'
import type { CreatorInfo } from './providers/tiktok.ts'
import { ProviderError } from './providers/types.ts'
import type { Account, Connection, Provider } from './providers/types.ts'
import { youtubeProvider } from './providers/youtube.ts'
import { issues } from './rules.ts'
import type { Job } from './store.ts'

export const API_VERSION = 1
const PROVIDERS: PublishProvider[] = ['meta', 'threads', 'linkedin', 'tiktok', 'youtube']
const STATE_TTL = 15 * 60_000

export function buildProviders(c: Config): Record<PublishProvider, Provider> {
  return {
    meta: metaProvider(c.meta),
    threads: threadsProvider(c.threads),
    linkedin: linkedinProvider(c.linkedin),
    tiktok: tiktokProvider(c.tiktok),
    youtube: youtubeProvider(c.google),
  }
}

export const accountSummary = (c: Connection, a: Account): PublishAccount => ({
  id: a.id,
  network: a.network,
  provider: c.provider,
  connectionId: c.id,
  name: a.name,
  handle: a.handle,
  avatar: a.avatar,
  status: c.status,
  expiresAt: c.provider === 'meta' || !c.tokens.expiresAt ? undefined : new Date(c.tokens.refreshExpiresAt ?? c.tokens.expiresAt).toISOString(),
})

export const jobSummary = (j: Job): PublishJob => ({
  id: j.id,
  batchId: j.batchId,
  accountId: j.accountId,
  network: j.network,
  status: j.status,
  publishAt: new Date(j.publishAt).toISOString(),
  attempts: j.attempts,
  ref: j.ref,
  result: j.result && { remoteId: j.result.remoteId, url: j.result.url, note: j.result.note },
  error: j.error,
})

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`)

/** The page the sign-in popup lands on: tells the app what happened, then closes. */
function popupPage(origin: string, msg: ConnectMessage) {
  const json = JSON.stringify(msg).replace(/</g, '\\u003c')
  const text = msg.ok ? 'Connected. You can close this window.' : `Couldn't connect: ${msg.error ?? 'unknown error'}`
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Kataru</title><body style="font:16px system-ui;padding:32px"><p>${escapeHtml(text)}</p><script>
if (window.opener) window.opener.postMessage(${json}, ${JSON.stringify(origin)}); window.close()
</script></body></html>`
}

/**
 * The service's HTTP API. Everything under /api needs the API key; /auth and
 * /media are reached by the networks and the sign-in popup, so they carry
 * their own checks (an unguessable state, unguessable media ids).
 */
export function createHandler(config: Config, deps: Deps & { media: MediaLibrary }) {
  const pending = new Map<string, { provider: PublishProvider; verifier?: string; origin: string; at: number }>()
  const now = () => deps.now?.() ?? Date.now()
  const redirectUri = (p: PublishProvider) => `${config.publicUrl}/auth/${p}/callback`

  const cors = (req: IncomingMessage, res: ServerResponse) => {
    const origin = req.headers.origin
    if (origin && config.appOrigins.includes(origin)) {
      res.setHeader('access-control-allow-origin', origin)
      res.setHeader('vary', 'origin')
      res.setHeader('access-control-allow-headers', 'authorization, content-type')
      res.setHeader('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS')
      res.setHeader('access-control-max-age', '600')
    }
  }
  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify(body))
  }
  const fail = (res: ServerResponse, status: number, error: string, message: string) => send(res, status, { error, message })

  const read = (req: IncomingMessage, limit: number) =>
    new Promise<Buffer>((resolve, reject) => {
      const parts: Buffer[] = []
      let size = 0
      req.on('data', (b: Buffer) => {
        size += b.length
        if (size > limit) {
          reject(new ProviderError('invalid', 'Request body too large'))
          req.destroy()
        } else parts.push(b)
      })
      req.on('end', () => resolve(Buffer.concat(parts)))
      req.on('error', reject)
    })
  const readJson = async <T>(req: IncomingMessage): Promise<T> => {
    try {
      return JSON.parse((await read(req, 1024 * 1024)).toString('utf8') || '{}')
    } catch (e) {
      throw e instanceof ProviderError ? e : new ProviderError('invalid', 'Body is not JSON')
    }
  }

  const accounts = () => deps.store.data.connections.flatMap((c) => c.accounts.map((a) => accountSummary(c, a)))

  async function callback(res: ServerResponse, provider: PublishProvider, url: URL) {
    const state = url.searchParams.get('state') ?? ''
    const entry = pending.get(state)
    pending.delete(state)
    if (!entry || entry.provider !== provider || now() - entry.at > STATE_TTL) {
      res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' })
      return res.end('<!doctype html><p>This sign-in link has expired. Start again from Kataru.</p>')
    }
    const page = (msg: ConnectMessage) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      res.end(popupPage(entry.origin, msg))
    }
    const denied = url.searchParams.get('error_description') ?? url.searchParams.get('error')
    const code = url.searchParams.get('code')
    if (denied || !code) return page({ type: 'kataru:publisher', ok: false, provider, error: denied ?? 'No authorization code' })
    try {
      const got = await deps.providers[provider].exchange(code, redirectUri(provider), entry.verifier)
      const t = now()
      const saved = deps.store.upsert({ id: randomId('c'), provider, subject: got.subject, label: got.label, tokens: got.tokens, accounts: got.accounts, status: 'ok', createdAt: t, updatedAt: t })
      await deps.store.save()
      page({ type: 'kataru:publisher', ok: true, provider, accounts: saved.accounts.map((a) => accountSummary(saved, a)) })
    } catch (e) {
      page({ type: 'kataru:publisher', ok: false, provider, error: (e as Error).message })
    }
  }

  async function createPosts(req: IncomingMessage, res: ServerResponse) {
    const body = await readJson<PublishRequest>(req)
    if (!Array.isArray(body.accountIds) || !body.accountIds.length || typeof body.post?.text !== 'string' || !Array.isArray(body.post.media))
      return fail(res, 400, 'invalid', 'Expected { accountIds: string[], post: { text, media[] } }')
    const at = body.publishAt ? Date.parse(body.publishAt) : now()
    if (Number.isNaN(at)) return fail(res, 400, 'invalid', 'publishAt is not a date')
    const rejection: PublishRejection = { error: 'invalid', issues: [] }
    const targets = body.accountIds.map((id) => ({ id, found: deps.store.account(id) }))
    for (const { id, found } of targets) {
      const messages = found ? issues(found.account.network, body.post) : ['This account is not connected.']
      if (messages.length) rejection.issues.push({ accountId: id, messages })
    }
    if (rejection.issues.length) return send(res, 422, rejection)
    const batchId = randomId('b')
    const t = now()
    const jobs: Job[] = targets.map(({ id, found }) => ({
      id: randomId('j'),
      batchId,
      accountId: id,
      connectionId: found!.connection.id,
      network: found!.account.network,
      post: body.post,
      publishAt: Math.max(at, t),
      status: 'scheduled',
      attempts: 0,
      ref: body.ref,
      createdAt: t,
      updatedAt: t,
    }))
    deps.store.data.jobs.push(...jobs)
    await deps.store.save()
    // Due now: publish straight away, without waiting for the scheduler (videos can take minutes, so the reply doesn't wait either).
    if (at <= t) for (const j of jobs) void runJob(deps, j)
    send(res, 202, { batchId, jobs: jobs.map(jobSummary) })
  }

  async function route(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', config.publicUrl)
    const path = url.pathname.replace(/\/+$/, '') || '/'
    const method = req.method ?? 'GET'
    cors(req, res)
    if (method === 'OPTIONS') return res.writeHead(204).end()

    if (path === '/health' && method === 'GET') {
      const health: PublisherHealth = { ok: true, version: API_VERSION, providers: configured(config) }
      return send(res, 200, health)
    }
    let m = path.match(/^\/auth\/(\w+)\/callback$/)
    if (m && method === 'GET' && PROVIDERS.includes(m[1] as PublishProvider)) return callback(res, m[1] as PublishProvider, url)
    m = path.match(/^\/media\/([\w-]+)$/)
    if (m && method === 'GET') {
      const rec = deps.media.record(m[1])
      if (!rec) return fail(res, 404, 'not_found', 'No such media')
      res.writeHead(200, { 'content-type': rec.mime, 'content-length': rec.size, 'cache-control': 'public, max-age=86400' })
      return res.end(await deps.media.read(rec.id))
    }

    if (!path.startsWith('/api/')) return fail(res, 404, 'not_found', 'Not found')
    const auth = req.headers.authorization ?? ''
    if (!auth.startsWith('Bearer ') || !safeEqual(auth.slice(7), config.apiKey)) return fail(res, 401, 'unauthorized', 'Missing or wrong API key')

    if (path === '/api/accounts' && method === 'GET') return send(res, 200, accounts())

    m = path.match(/^\/api\/connect\/(\w+)$/)
    if (m && method === 'POST') {
      const provider = m[1] as PublishProvider
      if (!PROVIDERS.includes(provider)) return fail(res, 404, 'not_found', 'Unknown network')
      if (!deps.providers[provider].configured) return fail(res, 409, 'not_configured', `${provider} has no app credentials on the server`)
      const origin = req.headers.origin && config.appOrigins.includes(req.headers.origin) ? req.headers.origin : config.appOrigins[0]
      const state = randomId('s', 24)
      const auth = deps.providers[provider].authorize(state, redirectUri(provider))
      for (const [k, v] of pending) if (now() - v.at > STATE_TTL) pending.delete(k)
      pending.set(state, { provider, verifier: auth.verifier, origin, at: now() })
      return send(res, 200, { url: auth.url })
    }
    m = path.match(/^\/api\/connections\/([\w-]+)$/)
    if (m && method === 'DELETE') {
      const id = m[1]
      deps.store.data.connections = deps.store.data.connections.filter((c) => c.id !== id)
      for (const j of deps.store.data.jobs) if (j.connectionId === id && j.status === 'scheduled') deps.store.patchJob(j.id, { status: 'canceled' })
      await deps.store.save()
      return send(res, 200, { ok: true })
    }

    if (path === '/api/media' && method === 'POST') {
      const mime = String(req.headers['content-type'] ?? '').split(';')[0]
      const rec = await deps.media.save(await read(req, config.maxMediaBytes), mime)
      return send(res, 201, { id: rec.id, url: rec.url, mime: rec.mime, size: rec.size })
    }

    if (path === '/api/posts' && method === 'POST') return createPosts(req, res)
    m = path.match(/^\/api\/posts\/([\w-]+)$/)
    if (m && method === 'GET') return send(res, 200, deps.store.data.jobs.filter((j) => j.batchId === m![1]).map(jobSummary))

    if (path === '/api/jobs' && method === 'GET') {
      const status = url.searchParams.get('status')
      const ref = url.searchParams.get('ref')
      return send(res, 200, deps.store.data.jobs.filter((j) => (!status || j.status === status) && (!ref || j.ref === ref)).map(jobSummary))
    }
    m = path.match(/^\/api\/jobs\/([\w-]+)$/)
    if (m && method === 'DELETE') {
      const j = deps.store.job(m[1])
      if (!j) return fail(res, 404, 'not_found', 'No such job')
      if (j.status !== 'scheduled') return fail(res, 409, 'invalid', `Can't cancel a ${j.status} job`)
      deps.store.patchJob(j.id, { status: 'canceled' })
      await deps.store.save()
      return send(res, 200, jobSummary(j))
    }

    m = path.match(/^\/api\/tiktok\/([\w:-]+)\/creator$/)
    if (m && method === 'GET') {
      const found = deps.store.account(m[1])
      if (!found || found.account.network !== 'tiktok') return fail(res, 404, 'not_found', 'No such TikTok account')
      await ensureFresh(deps, found.connection)
      const tiktok = deps.providers.tiktok as Provider & { creatorInfo(token: string): Promise<CreatorInfo> }
      return send(res, 200, await tiktok.creatorInfo(found.connection.tokens.accessToken))
    }

    return fail(res, 404, 'not_found', 'Not found')
  }

  return (req: IncomingMessage, res: ServerResponse) => {
    route(req, res).catch((e) => {
      const err = e instanceof ProviderError ? e : new ProviderError('unknown', (e as Error).message)
      if (!res.headersSent) fail(res, err.code === 'invalid' ? 400 : err.code === 'auth' ? 401 : 502, err.code, err.message)
      else res.end()
    })
  }
}
