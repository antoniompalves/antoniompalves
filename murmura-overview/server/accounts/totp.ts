import { createHash, createHmac, randomBytes } from 'node:crypto'

/**
 * Two-factor codes from an authenticator app (RFC 6238 TOTP: SHA-1, 6 digits,
 * 30-second steps), and one-time recovery codes for when the phone is lost.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32(buf: Buffer) {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

export function fromBase32(s: string) {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

export const newSecret = () => base32(randomBytes(20))

/** The code for time step `step` (RFC 4226 HOTP over the step counter). */
export function codeAt(secret: string, step: number, digits = 6) {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const mac = createHmac('sha1', fromBase32(secret)).update(counter).digest()
  const offset = mac[mac.length - 1]! & 15
  const n = (mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits
  return String(n).padStart(digits, '0')
}

export const stepOf = (ms: number) => Math.floor(ms / 1000 / 30)

/**
 * The step a code matches (one step of clock drift either way), or null.
 * Steps at or before `after` are refused, so a code works only once.
 */
export function matchStep(secret: string, code: string, ms: number, after: number | null = null): number | null {
  const digits = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(digits)) return null
  const now = stepOf(ms)
  for (const step of [now, now - 1, now + 1]) {
    if (after !== null && step <= after) continue
    if (codeAt(secret, step) === digits) return step
  }
  return null
}

/** What authenticator apps scan: otpauth://totp/Issuer:email?secret=…&issuer=Issuer */
export const otpauthUrl = (secret: string, account: string, issuer: string) =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`

const hashCode = (code: string) => createHash('sha256').update(code.toLowerCase().replace(/[^a-z0-9]/g, '')).digest('hex')

/** Ten recovery codes like "k7q2-m9xd", and their hashes to keep. */
export function newRecoveryCodes() {
  const codes = Array.from({ length: 10 }, () => {
    const raw = base32(randomBytes(5)).toLowerCase().slice(0, 8)
    return `${raw.slice(0, 4)}-${raw.slice(4)}`
  })
  return { codes, hashes: codes.map(hashCode) }
}

/** The hashes left once `code` is used, or null when it isn't one of them. */
export function useRecoveryCode(hashes: string[], code: string): string[] | null {
  const h = hashCode(code)
  return hashes.includes(h) ? hashes.filter((x) => x !== h) : null
}
