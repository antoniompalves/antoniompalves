import { setFetch, setSleep } from '../providers/http.ts'
import type { Account, Connection, MediaSource, PublishContext } from '../providers/types.ts'
import type { PublishPost } from '../../src/data/publishing.ts'

export interface Call {
  method: string
  url: URL
  headers: Record<string, string>
  /** Parsed JSON or form body. */
  body: any
  /** Size of a binary body. */
  bytes?: number
}

export interface Reply {
  status?: number
  json?: unknown
  text?: string
  headers?: Record<string, string>
}

type Handler = Reply | ((c: Call, n: number) => Reply)

/** Replaces fetch with a route table and records every request; the first matching route answers. */
export function fakeNetwork(routes: [method: string, match: string | RegExp, reply: Handler][]) {
  const calls: Call[] = []
  const counts = new Map<number, number>()
  setSleep(async () => {})
  setFetch(async (input, init = {}) => {
    const url = new URL(String(input))
    const method = (init.method ?? 'GET').toUpperCase()
    const headers = Object.fromEntries(Object.entries((init.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), String(v)]))
    const call: Call = { method, url, headers, body: undefined }
    if (typeof init.body === 'string') {
      const ct = headers['content-type'] ?? ''
      call.body = ct.includes('json') ? JSON.parse(init.body) : ct.includes('form') ? Object.fromEntries(new URLSearchParams(init.body)) : init.body
    } else if (init.body instanceof Uint8Array) call.bytes = init.body.length
    calls.push(call)
    const i = routes.findIndex(([m, p]) => m === method && (typeof p === 'string' ? url.href.startsWith(p) : p.test(url.href)))
    if (i < 0) return new Response(JSON.stringify({ error: { message: `no fake route for ${method} ${url.href}` } }), { status: 501 })
    const n = (counts.get(i) ?? 0) + 1
    counts.set(i, n)
    const h = routes[i][2]
    const r = typeof h === 'function' ? h(call, n) : h
    return new Response(r.text ?? JSON.stringify(r.json ?? {}), { status: r.status ?? 200, headers: { 'content-type': 'application/json', ...r.headers } })
  })
  return {
    calls,
    find: (method: string, pattern: string | RegExp) => calls.filter((c) => c.method === method && (typeof pattern === 'string' ? c.url.href.includes(pattern) : pattern.test(c.url.href))),
  }
}

/** Media by URL: videos are `size` bytes of zeros. */
export const fakeMedia = (sizes: Record<string, number> = {}): MediaSource => ({
  async load(url) {
    const size = sizes[url] ?? 1000
    return { bytes: Buffer.alloc(size), mime: url.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg', size }
  },
})

export function ctx(account: Partial<Account> & Pick<Account, 'network' | 'remoteId'>, post: PublishPost, media: MediaSource = fakeMedia(), token = 'user-token'): PublishContext {
  const acc: Account = { id: `${account.network}:${account.remoteId}`, name: 'Ember & Oak', ...account }
  const connection: Connection = {
    id: 'c_1',
    provider: account.network === 'facebook' || account.network === 'instagram' ? 'meta' : account.network === 'youtube' ? 'youtube' : (account.network as Connection['provider']),
    subject: 'me',
    label: 'Me',
    tokens: { accessToken: token, scopes: [], issuedAt: Date.now() },
    accounts: [acc],
    status: 'ok',
    createdAt: 0,
    updatedAt: 0,
  }
  return { connection, account: acc, post, media }
}

export const post = (p: Partial<PublishPost> = {}): PublishPost => ({ text: 'New harvest is in (Huila) — @friends #coffee', media: [], ...p })
