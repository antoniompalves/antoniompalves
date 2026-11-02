import { generateKeyPairSync, sign } from 'node:crypto'
import type { KeyObject } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Mail, Mailer } from '../accounts/mail.ts'
import { createHandler } from '../app.ts'
import { readConfig } from '../config.ts'
import { keyFrom } from '../crypto.ts'
import { openDb } from '../db.ts'
import type { Db } from '../db.ts'
import { createKataru } from '../kataru.ts'
import type { Kataru } from '../kataru.ts'
import { MediaLibrary } from '../media.ts'
import { Store } from '../store.ts'

/** A Kataru server on a free port, with a fake mailbox, for the accounts tests. */

export const dirs: string[] = []
export async function tmp() {
  const d = await mkdtemp(join(tmpdir(), 'kataru-acc-'))
  dirs.push(d)
  return d
}
export const cleanup = () => Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))

/** A database for a test: a new SQLite file, or the MySQL/MariaDB in TEST_MYSQL_URL emptied first. */
export async function freshDb(kind: 'sqlite' | 'mysql'): Promise<{ url: string; db: Db }> {
  if (kind === 'sqlite') {
    const url = `sqlite:${join(await tmp(), 'kataru.db')}`
    return { url, db: await openDb(url) }
  }
  const url = process.env.TEST_MYSQL_URL!
  const probe = await openDb(url)
  for (const t of ['kt_users', 'kt_sessions', 'kt_tokens', 'kt_identities', 'kt_attempts', 'kt_ephemeral', 'kt_workspace', 'kt_events', 'kt_archive', 'kt_backups', 'kt_meta']) await probe.run(`DROP TABLE IF EXISTS ${t}`)
  await probe.close()
  return { url, db: await openDb(url) }
}

export interface Booted {
  base: string
  kataru: Kataru
  mails: Mail[]
  db: Db
  url: string
  server: Server
  clock: { now: number }
  close(): Promise<void>
}

export async function boot(o: { db: Db; url: string; env?: Record<string, string>; clock?: { now: number }; fetch?: typeof fetch }): Promise<Booted> {
  const server = createServer()
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const dir = await tmp()
  const config = readConfig({
    PUBLISHER_SECRET: 's'.repeat(40),
    PUBLISHER_PUBLIC_URL: base,
    PUBLISHER_DATA_DIR: dir,
    PUBLISHER_APP_ORIGIN: 'http://app.test',
    KATARU_APP_URL: 'http://app.test',
    KATARU_SETUP_CODE: 'ABCDE-12345',
    DATABASE_URL: o.url,
    ...o.env,
  })
  const mails: Mail[] = []
  const mailer: Mailer = {
    configured: true,
    async send(m) {
      mails.push(m)
      return true
    },
  }
  const clock = o.clock ?? { now: Date.now() }
  const kataru = await createKataru(config, { db: o.db, mailer, now: () => clock.now, log: () => undefined, fetch: o.fetch })
  const store = await new Store(dir, keyFrom(config.secret)).load()
  const media = new MediaLibrary(dir, store, config.publicUrl, config.maxMediaBytes)
  server.on('request', createHandler(config, { store, providers: {} as never, media, kataru }))
  return {
    base,
    kataru,
    mails,
    db: o.db,
    url: o.url,
    server,
    clock,
    async close() {
      server.closeAllConnections()
      await new Promise<void>((r) => server.close(() => r()))
      await kataru.close()
      await o.db.close()
    },
  }
}

export interface Reply {
  status: number
  body: any
  headers: Headers
}

/** A browser: keeps the session cookie and sends the X-Kataru header. */
export class Browser {
  cookie = ''
  base: string
  constructor(base: string) {
    this.base = base
  }
  async req(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Reply> {
    const res = await fetch(this.base + path, {
      method,
      redirect: 'manual',
      headers: { 'content-type': 'application/json', 'x-kataru': '1', ...(this.cookie && { cookie: this.cookie }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(';')
      const [k, v] = kv!.split('=')
      if (k === 'kataru_session') this.cookie = v ? `kataru_session=${v}` : ''
    }
    const text = await res.text()
    let parsed: unknown = text
    try {
      parsed = JSON.parse(text)
    } catch {
      /* not JSON */
    }
    return { status: res.status, body: parsed, headers: res.headers }
  }
  get = (p: string) => this.req('GET', p)
  post = (p: string, b: unknown = {}) => this.req('POST', p, b)
  patch = (p: string, b: unknown = {}) => this.req('PATCH', p, b)
  del = (p: string) => this.req('DELETE', p)

  /** Opens the live stream and collects its events. */
  async stream() {
    const ctrl = new AbortController()
    const res = await fetch(`${this.base}/api/workspace/stream`, { headers: { cookie: this.cookie }, signal: ctrl.signal })
    const events: { event: string; data: any }[] = []
    const waiters: (() => void)[] = []
    let closed = false
    void (async () => {
      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let buf = ''
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          let i
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const chunk = buf.slice(0, i)
            buf = buf.slice(i + 2)
            const ev = /^event: (.*)$/m.exec(chunk)?.[1] ?? 'message'
            const data = /^data: (.*)$/m.exec(chunk)?.[1]
            if (data) events.push({ event: ev, data: JSON.parse(data) })
            waiters.splice(0).forEach((w) => w())
          }
        }
      } catch {
        /* aborted */
      }
      closed = true
      waiters.splice(0).forEach((w) => w())
    })()
    return {
      status: res.status,
      events,
      get closed() {
        return closed
      },
      /** Waits until `n` events arrived (or the stream ends). */
      async until(n: number, ms = 3000) {
        const start = Date.now()
        while (events.length < n && !closed && Date.now() - start < ms) await new Promise<void>((r) => (waiters.push(r), setTimeout(r, 50)))
        return events
      },
      close: () => ctrl.abort(),
    }
  }
}

/* ───────────── a fake OpenID provider ───────────── */

export interface FakeIdp {
  issuer: string
  /** Who signs in next: set before following the redirect. */
  next: { sub: string; email: string; name: string; email_verified?: boolean }
  /** Completes the provider's side: the code the browser would bring back. */
  approve(authorizeUrl: string): { code: string; state: string }
  close(): Promise<void>
}

export async function fakeIdp(): Promise<FakeIdp> {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const jwk = { ...(publicKey as KeyObject).export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' }
  const codes = new Map<string, { nonce: string; who: FakeIdp['next']; clientId: string }>()
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', issuer)
    const json = (b: unknown, status = 200) => (res.writeHead(status, { 'content-type': 'application/json' }), res.end(JSON.stringify(b)))
    if (url.pathname === '/.well-known/openid-configuration') return json({ issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/jwks` })
    if (url.pathname === '/jwks') return json({ keys: [jwk] })
    if (url.pathname === '/token' && req.method === 'POST') {
      let raw = ''
      req.on('data', (c) => (raw += c))
      req.on('end', () => {
        const form = new URLSearchParams(raw)
        const entry = codes.get(form.get('code') ?? '')
        if (!entry || !form.get('code_verifier')) return json({ error: 'invalid_grant' }, 400)
        codes.delete(form.get('code')!)
        const now = Math.floor(Date.now() / 1000)
        const head = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' })).toString('base64url')
        const body = Buffer.from(JSON.stringify({ iss: issuer, aud: entry.clientId, sub: entry.who.sub, email: entry.who.email, email_verified: entry.who.email_verified ?? true, name: entry.who.name, nonce: entry.nonce, iat: now, exp: now + 300 })).toString('base64url')
        const sig = sign('sha256', Buffer.from(`${head}.${body}`), privateKey).toString('base64url')
        json({ id_token: `${head}.${body}.${sig}`, access_token: 'at', token_type: 'Bearer' })
      })
      return
    }
    json({ error: 'not_found' }, 404)
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const idp: FakeIdp = {
    issuer,
    next: { sub: 'sub-1', email: 'someone@example.com', name: 'Someone' },
    approve(authorizeUrl) {
      const u = new URL(authorizeUrl)
      const code = `code-${Math.random().toString(36).slice(2)}`
      codes.set(code, { nonce: u.searchParams.get('nonce')!, who: { ...idp.next }, clientId: u.searchParams.get('client_id')! })
      return { code, state: u.searchParams.get('state')! }
    },
    close: () => new Promise<void>((r) => server.close(() => r())),
  }
  return idp
}
