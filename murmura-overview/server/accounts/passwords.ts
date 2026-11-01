import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

/**
 * Passwords are kept as scrypt hashes: "scrypt$N$r$p$salt$hash" (base64url).
 * N = 2^15 takes ~50 ms here, slow enough to make guessing expensive.
 */

const N = 32768
const R = 8
const P = 1
const LEN = 32

const derive = (password: string, salt: Buffer, n: number, r: number, p: number) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, LEN, { N: n, r, p, maxmem: 128 * n * r * 2 }, (err, key) => (err ? reject(err) : resolve(key))),
  )

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const key = await derive(password, salt, N, R, P)
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${key.toString('base64url')}`
}

export async function verifyPassword(password: string, stored: string | null | undefined) {
  const parts = (stored ?? '').split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    // Same work either way, so a missing account doesn't answer faster.
    await derive(password, randomBytes(16), N, R, P)
    return false
  }
  const [, n, r, p, salt, hash] = parts
  const want = Buffer.from(hash!, 'base64url')
  const got = await derive(password, Buffer.from(salt!, 'base64url'), Number(n), Number(r), Number(p))
  return got.length === want.length && timingSafeEqual(got, want)
}

/** What a new password must be: 10+ characters, not just one character repeated, not the email. */
export function passwordProblem(password: string, email = ''): 'short' | 'long' | 'weak' | null {
  if (password.length < 10) return 'short'
  if (password.length > 200) return 'long'
  const lower = password.toLowerCase()
  if (new Set(lower).size < 4 || (email && lower.includes(email.split('@')[0]!.toLowerCase()) && email.split('@')[0]!.length >= 4)) return 'weak'
  if (['password', 'qwerty', '123456', 'kataru'].some((w) => lower.startsWith(w) && lower.length < w.length + 4)) return 'weak'
  return null
}
