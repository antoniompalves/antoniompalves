import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** A 256-bit key from PUBLISHER_SECRET. */
export const keyFrom = (secret: string) => createHash('sha256').update(secret).digest()

/** AES-256-GCM: "v1.<iv|tag|ciphertext in base64url>". */
export function seal(key: Buffer, plain: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return `v1.${Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url')}`
}

export function unseal(key: Buffer, sealed: string) {
  if (!sealed.startsWith('v1.')) throw new Error('Unknown sealed format')
  const raw = Buffer.from(sealed.slice(3), 'base64url')
  const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12))
  decipher.setAuthTag(raw.subarray(12, 28))
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')
}

export const randomId = (prefix: string, bytes = 12) => `${prefix}_${randomBytes(bytes).toString('base64url')}`

/** PKCE (RFC 7636, S256). */
export function pkce() {
  const verifier = randomBytes(48).toString('base64url')
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') }
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}
