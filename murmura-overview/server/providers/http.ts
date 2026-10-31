import type { PublishErrorCode, PublishProvider } from '../../src/data/publishing.ts'
import { ProviderError } from './types.ts'

/** Swappable for tests. */
let fetchImpl: typeof fetch = (input, init) => fetch(input, init)
let sleepImpl = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const setFetch = (f: typeof fetch) => {
  fetchImpl = f
}
export const setSleep = (f: (ms: number) => Promise<void>) => {
  sleepImpl = f
}
export const sleep = (ms: number) => sleepImpl(ms)
export const rawFetch = (input: string, init?: RequestInit) => fetchImpl(input, init)

export interface CallOptions {
  method?: string
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined>
  /** Sent as application/json. */
  json?: unknown
  /** Sent as application/x-www-form-urlencoded. */
  form?: Record<string, string | number | boolean | undefined>
  /** Sent as is. */
  body?: Uint8Array
  bearer?: string
  timeoutMs?: number
}

export interface Reply<T = any> {
  status: number
  headers: Headers
  data: T
}

const params = (o: Record<string, string | number | boolean | undefined>) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(o)) if (v !== undefined) p.set(k, String(v))
  return p
}

export const withQuery = (url: string, query?: CallOptions['query']) => (query ? `${url}${url.includes('?') ? '&' : '?'}${params(query)}` : url)

/** One request to a network's API; non-2xx (and TikTok's "200 with an error") become a ProviderError. */
export async function call<T = any>(provider: PublishProvider, url: string, o: CallOptions = {}): Promise<Reply<T>> {
  const headers: Record<string, string> = { accept: 'application/json', ...o.headers }
  if (o.bearer) headers.authorization = `Bearer ${o.bearer}`
  let body: RequestInit['body']
  if (o.json !== undefined) {
    headers['content-type'] = 'application/json; charset=UTF-8'
    body = JSON.stringify(o.json)
  } else if (o.form) {
    headers['content-type'] = 'application/x-www-form-urlencoded'
    body = params(o.form).toString()
  } else if (o.body) body = o.body
  let res: Response
  try {
    res = await fetchImpl(withQuery(url, o.query), {
      method: o.method ?? (body ? 'POST' : 'GET'),
      headers,
      body,
      signal: AbortSignal.timeout(o.timeoutMs ?? 60_000),
    })
  } catch (e) {
    throw new ProviderError('transient', `${provider}: network error (${(e as Error).message})`, { provider })
  }
  const text = await res.text()
  let data: any = text
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    /* not JSON */
  }
  if (!res.ok) throw toError(provider, res.status, data)
  if (provider === 'tiktok' && data?.error?.code && data.error.code !== 'ok') throw toError(provider, res.status, data)
  return { status: res.status, headers: res.headers, data }
}

const messageOf = (data: any): string =>
  data?.error?.message ?? data?.error_description ?? data?.message ?? (typeof data?.error === 'string' ? data.error : '') ?? ''

/** Each network words its errors differently; this sorts them into what the app can act on. */
export function toError(provider: PublishProvider, status: number, data: any): ProviderError {
  const message = `${provider}: ${messageOf(data) || `HTTP ${status}`}`
  let code: PublishErrorCode = status === 401 ? 'auth' : status === 403 ? 'permission' : status === 429 ? 'rate_limit' : status >= 500 ? 'transient' : 'invalid'

  if (provider === 'meta' || provider === 'threads') {
    const c = Number(data?.error?.code)
    if (c === 190 || c === 102) code = 'auth'
    else if ([4, 17, 32, 613, 80001, 80002].includes(c) || data?.error?.error_subcode === 2207042) code = 'rate_limit'
    else if (c === 10 || (c >= 200 && c < 300)) code = 'permission'
    else if (c === 1 || c === 2) code = 'transient'
    else if (data?.error?.error_subcode === 2207026 || data?.error?.error_subcode === 2207052) code = 'media'
  } else if (provider === 'youtube') {
    const reason = data?.error?.errors?.[0]?.reason ?? ''
    if (/quotaExceeded|rateLimitExceeded|uploadLimitExceeded|userRateLimitExceeded/.test(reason)) code = 'rate_limit'
    else if (reason === 'forbidden' || reason === 'insufficientPermissions') code = 'permission'
    else if (reason === 'invalid_grant' || data?.error === 'invalid_grant') code = 'auth'
  } else if (provider === 'tiktok') {
    const c = String(data?.error?.code ?? data?.error ?? '')
    if (/access_token_invalid|invalid_grant|token/.test(c)) code = 'auth'
    else if (/scope_not_authorized|scope_permission/.test(c)) code = 'permission'
    else if (/rate_limit|spam_risk|reached_active_user_cap/.test(c)) code = 'rate_limit'
    else if (/internal_error/.test(c)) code = 'transient'
    else if (c && c !== 'ok') code = status >= 500 ? 'transient' : 'invalid'
  } else if (provider === 'linkedin') {
    if (data?.serviceErrorCode === 65600 || data?.code === 'EXPIRED_ACCESS_TOKEN') code = 'auth'
  }
  if (data?.error === 'invalid_grant') code = 'auth'
  return new ProviderError(code, message, { status, provider })
}

/** Polls `read` until `done` says so, `attempts` times at most. */
export async function poll<T>(read: () => Promise<T>, done: (v: T) => boolean, { attempts, intervalMs }: { attempts: number; intervalMs: number }) {
  let last = await read()
  for (let i = 1; i < attempts && !done(last); i++) {
    await sleep(intervalMs)
    last = await read()
  }
  return last
}
