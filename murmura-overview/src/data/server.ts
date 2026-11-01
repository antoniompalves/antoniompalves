import type { Workspace } from './types'

/**
 * Talking to the Kataru server (server/kataru.ts). Where the app finds it:
 *
 * - `VITE_KATARU_API` unset: the app asks `api/session` next to the page; a
 *   Kataru server answers when it serves the app (one address, as on cPanel),
 *   anything else means the demo, saved in this browser only.
 * - `VITE_KATARU_API=https://kataru.example.com`: that server (the app is
 *   hosted elsewhere; the server must list the app in PUBLISHER_APP_ORIGIN).
 * - `VITE_KATARU_API=off`: always the demo.
 */

const ENV = (import.meta.env.VITE_KATARU_API as string | undefined)?.trim()

/** Prefix for API paths: "" (next to the page) or "https://server/". */
let base = ENV && ENV !== 'off' && ENV !== 'same' && ENV !== '/' ? `${ENV.replace(/\/$/, '')}/` : ''

export const apiUrl = (path: string) => `${base}api${path}`

export class ApiError extends Error {
  status: number
  code: string
  data: Record<string, unknown>
  constructor(status: number, code: string, message: string, data: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.data = data
  }
}

/** A JSON request with the session cookie and the header the server asks for on changes. */
export async function api<T = Record<string, unknown>>(method: string, path: string, body?: unknown, opts: { timeout?: number } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(apiUrl(path), {
      method,
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-kataru': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeout ?? 20_000),
    })
  } catch (e) {
    throw new ApiError(0, 'network', (e as Error).message)
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new ApiError(res.status, String(data.error ?? 'http'), String(data.message ?? res.statusText), data)
  return data as T
}

export interface SessionUser {
  id: string
  memberId: string
  email: string
  name: string
  stage: 'full' | 'mfa'
  method: string
  mfa: boolean
  hasPassword: boolean
  mustEnroll: boolean
}

export interface SessionInfo {
  setup: boolean
  company: string | null
  sso: { id: string; name: string }[]
  mail: boolean
  user: SessionUser | null
}

export interface Snapshot {
  version: number
  ws: Workspace
}

export type Backend = { kind: 'demo' } | { kind: 'server'; session: SessionInfo } | { kind: 'unreachable' }

/** Which one this is: a Kataru server answering, or the demo. */
export async function detect(): Promise<Backend> {
  if (ENV === 'off') return { kind: 'demo' }
  try {
    const s = await api<SessionInfo>('GET', '/session', undefined, { timeout: 6000 })
    if (typeof s.setup === 'boolean') return { kind: 'server', session: s }
  } catch {
    /* no server here */
  }
  // Configured to use a server that doesn't answer: say so rather than open the demo.
  return ENV ? { kind: 'unreachable' } : { kind: 'demo' }
}

/** For tests: point the app at another server. */
export const setApiBase = (url: string) => {
  base = url ? `${url.replace(/\/$/, '')}/` : ''
}

/** Where to send the browser to sign in with a provider (or link one, from the account dialog). */
export const ssoUrl = (id: string, link = false) => apiUrl(link ? `/account/sso/${id}` : `/auth/sso/${id}/start`)
