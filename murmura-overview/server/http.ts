import type { IncomingMessage, ServerResponse } from 'node:http'

/** Small HTTP helpers for the accounts API. */

export class HttpError extends Error {
  status: number
  code: string
  extra?: Record<string, unknown>
  constructor(status: number, code: string, message: string, extra?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.code = code
    this.extra = extra
  }
}

export function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string | string[]> = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers })
  res.end(JSON.stringify(body))
}

export function readBody(req: IncomingMessage, limit: number) {
  return new Promise<Buffer>((resolve, reject) => {
    const parts: Buffer[] = []
    let size = 0
    req.on('data', (b: Buffer) => {
      size += b.length
      if (size > limit) {
        reject(new HttpError(413, 'too_large', 'Request body too large'))
        req.destroy()
      } else parts.push(b)
    })
    req.on('end', () => resolve(Buffer.concat(parts)))
    req.on('error', reject)
  })
}

export async function readJson<T = Record<string, unknown>>(req: IncomingMessage, limit = 256 * 1024): Promise<T> {
  const raw = (await readBody(req, limit)).toString('utf8')
  try {
    const v = JSON.parse(raw || '{}') as unknown
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error()
    return v as T
  } catch {
    throw new HttpError(400, 'invalid', 'Body is not a JSON object')
  }
}

export function cookies(req: IncomingMessage) {
  const out: Record<string, string> = {}
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    const k = part.slice(0, i).trim()
    if (k && !(k in out)) out[k] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

export function cookie(name: string, value: string, o: { maxAge?: number; secure: boolean; path: string }) {
  return [`${name}=${encodeURIComponent(value)}`, `Path=${o.path}`, 'HttpOnly', 'SameSite=Lax', o.secure && 'Secure', o.maxAge !== undefined && `Max-Age=${o.maxAge}`].filter(Boolean).join('; ')
}

export function clientIp(req: IncomingMessage, trustProxy: boolean) {
  const forwarded = trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0]?.trim() : ''
  return forwarded || req.socket.remoteAddress || 'unknown'
}

export const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
export const isEmail = (s: string) => /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/.test(s) && s.length <= 254
