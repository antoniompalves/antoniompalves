import { createHash, randomBytes } from 'node:crypto'
import { seal, unseal } from '../crypto.ts'
import type { Db } from '../db.ts'
import { upsert } from '../db.ts'
import { matchStep, newRecoveryCodes, newSecret, useRecoveryCode } from './totp.ts'

/**
 * Sign-in accounts, kept in the database next to (not inside) the shared
 * workspace: each account belongs to one teammate (`member_id`). Passwords
 * are scrypt hashes, two-factor secrets are sealed with the server secret,
 * and sessions, invitations and reset links are stored only as hashes of the
 * random tokens people hold.
 */

export interface User {
  id: string
  member_id: string
  email: string
  name: string
  password_hash: string | null
  totp_secret: string | null
  totp_last: number | null
  recovery: string | null
  password_at: number
  created_at: number
}

/** "full": signed in. "mfa": password right, waiting for the authenticator code. */
export type Stage = 'full' | 'mfa'

export interface Session {
  id: string
  user_id: string
  stage: Stage
  /** "password", "reset", "invite" or "sso:<provider>". */
  method: string
  created_at: number
  seen_at: number
  expires_at: number
  ip: string | null
  agent: string | null
}

export type TokenKind = 'invite' | 'reset'

const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const token = () => randomBytes(32).toString('base64url')
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))

const DAY = 86_400_000
export const SESSION_DAYS = 30
const MFA_MINUTES = 10

function userOf(row: Record<string, unknown> | undefined): User | undefined {
  if (!row) return undefined
  return { ...(row as unknown as User), totp_last: num(row.totp_last), password_at: Number(row.password_at), created_at: Number(row.created_at) }
}

function sessionOf(row: Record<string, unknown> | undefined): Session | undefined {
  if (!row) return undefined
  return { ...(row as unknown as Session), created_at: Number(row.created_at), seen_at: Number(row.seen_at), expires_at: Number(row.expires_at) }
}

export class Accounts {
  db: Db
  private key: Buffer
  private now: () => number
  constructor(db: Db, key: Buffer, now: () => number = Date.now) {
    this.db = db
    this.key = key
    this.now = now
  }

  /* ───── people ───── */

  async byEmail(email: string, db = this.db) {
    return userOf(await db.get<Record<string, unknown>>('SELECT * FROM kt_users WHERE email = ?', [email.trim().toLowerCase()]))
  }
  async byId(id: string, db = this.db) {
    return userOf(await db.get<Record<string, unknown>>('SELECT * FROM kt_users WHERE id = ?', [id]))
  }
  async byMember(memberId: string, db = this.db) {
    return userOf(await db.get<Record<string, unknown>>('SELECT * FROM kt_users WHERE member_id = ?', [memberId]))
  }
  async all() {
    return (await this.db.all<Record<string, unknown>>('SELECT * FROM kt_users')).map((r) => userOf(r)!)
  }

  async create(u: { memberId: string; email: string; name: string; passwordHash?: string | null }, db = this.db): Promise<User> {
    const t = this.now()
    const id = `u_${randomBytes(12).toString('base64url')}`
    await db.run('INSERT INTO kt_users (id, member_id, email, name, password_hash, password_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, u.memberId, u.email.trim().toLowerCase(), u.name, u.passwordHash ?? null, t, t])
    return (await this.byId(id, db))!
  }

  async remove(userId: string) {
    await this.db.tx(async (db) => {
      await db.run('DELETE FROM kt_sessions WHERE user_id = ?', [userId])
      await db.run('DELETE FROM kt_tokens WHERE user_id = ?', [userId])
      await db.run('DELETE FROM kt_identities WHERE user_id = ?', [userId])
      await db.run('DELETE FROM kt_users WHERE id = ?', [userId])
    })
  }

  async rename(userId: string, name: string) {
    await this.db.run('UPDATE kt_users SET name = ? WHERE id = ?', [name, userId])
  }

  async setPassword(userId: string, passwordHash: string) {
    await this.db.run('UPDATE kt_users SET password_hash = ?, password_at = ? WHERE id = ?', [passwordHash, this.now(), userId])
  }

  /* ───── sessions ───── */

  /** A new session; the token goes in the cookie, only its hash is kept. */
  async startSession(userId: string, stage: Stage, method: string, ip: string | null, agent: string | null) {
    const t = this.now()
    const raw = token()
    const ttl = stage === 'mfa' ? MFA_MINUTES * 60_000 : SESSION_DAYS * DAY
    await this.db.run('INSERT INTO kt_sessions (id, user_id, stage, method, created_at, seen_at, expires_at, ip, agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      hash(raw),
      userId,
      stage,
      method,
      t,
      t,
      t + ttl,
      ip?.slice(0, 64) ?? null,
      agent?.slice(0, 255) ?? null,
    ])
    return raw
  }

  /** The session behind a cookie token, kept alive while used (at most one write a minute). */
  async session(raw: string | undefined): Promise<{ session: Session; user: User } | null> {
    if (!raw || raw.length > 100) return null
    const s = sessionOf(await this.db.get<Record<string, unknown>>('SELECT * FROM kt_sessions WHERE id = ?', [hash(raw)]))
    const t = this.now()
    if (!s) return null
    if (s.expires_at <= t) {
      await this.db.run('DELETE FROM kt_sessions WHERE id = ?', [s.id])
      return null
    }
    const user = await this.byId(s.user_id)
    if (!user) return null
    if (s.stage === 'full' && t - s.seen_at > 60_000) {
      s.seen_at = t
      s.expires_at = t + SESSION_DAYS * DAY
      await this.db.run('UPDATE kt_sessions SET seen_at = ?, expires_at = ? WHERE id = ?', [s.seen_at, s.expires_at, s.id])
    }
    return { session: s, user }
  }

  async endSession(sessionId: string) {
    await this.db.run('DELETE FROM kt_sessions WHERE id = ?', [sessionId])
  }

  /** Signs someone out everywhere, except (optionally) the session in hand. */
  async endSessions(userId: string, except?: string) {
    await this.db.run(except ? 'DELETE FROM kt_sessions WHERE user_id = ? AND id <> ?' : 'DELETE FROM kt_sessions WHERE user_id = ?', except ? [userId, except] : [userId])
  }

  async sessions(userId: string) {
    const rows = await this.db.all<Record<string, unknown>>("SELECT * FROM kt_sessions WHERE user_id = ? AND stage = 'full' AND expires_at > ? ORDER BY seen_at DESC", [userId, this.now()])
    return rows.map((r) => sessionOf(r)!)
  }

  /* ───── invitations and reset links ───── */

  /** A one-time link token; earlier ones of the same kind stop working. */
  async issue(kind: TokenKind, userId: string, ttlMs: number) {
    const raw = token()
    const t = this.now()
    await this.db.tx(async (db) => {
      await db.run('DELETE FROM kt_tokens WHERE user_id = ? AND kind = ?', [userId, kind])
      await db.run('INSERT INTO kt_tokens (id, kind, user_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)', [hash(raw), kind, userId, t, t + ttlMs])
    })
    return raw
  }

  /** Who a link is for, without using it up. */
  async peek(kind: TokenKind, raw: string) {
    const row = await this.db.get<{ user_id: string; expires_at: number | string; used_at: number | string | null }>('SELECT user_id, expires_at, used_at FROM kt_tokens WHERE id = ? AND kind = ?', [hash(raw), kind])
    if (!row || row.used_at !== null || Number(row.expires_at) <= this.now()) return null
    return (await this.byId(row.user_id)) ?? null
  }

  /** Uses a link up; null when it's unknown, used or expired. */
  async take(kind: TokenKind, raw: string) {
    const t = this.now()
    const r = await this.db.run('UPDATE kt_tokens SET used_at = ? WHERE id = ? AND kind = ? AND used_at IS NULL AND expires_at > ?', [t, hash(raw), kind, t])
    if (!r.changes) return null
    const row = await this.db.get<{ user_id: string }>('SELECT user_id FROM kt_tokens WHERE id = ?', [hash(raw)])
    return row ? ((await this.byId(row.user_id)) ?? null) : null
  }

  async revokeTokens(userId: string, kind?: TokenKind) {
    await this.db.run(kind ? 'DELETE FROM kt_tokens WHERE user_id = ? AND kind = ?' : 'DELETE FROM kt_tokens WHERE user_id = ?', kind ? [userId, kind] : [userId])
  }

  /* ───── two-factor ───── */

  /** A secret for the authenticator app, kept aside until the first code confirms it. */
  async startTotp(userId: string) {
    const secret = newSecret()
    await this.putEphemeral(`totp:${userId}`, seal(this.key, secret), 15 * 60_000)
    return secret
  }

  /** Turns two-factor on once a code from the new secret matches; returns the recovery codes. */
  async confirmTotp(userId: string, code: string) {
    const sealed = await this.getEphemeral(`totp:${userId}`)
    if (!sealed) return null
    const secret = unseal(this.key, sealed)
    const step = matchStep(secret, code, this.now())
    if (step === null) return null
    const { codes, hashes } = newRecoveryCodes()
    await this.db.run('UPDATE kt_users SET totp_secret = ?, totp_last = ?, recovery = ? WHERE id = ?', [seal(this.key, secret), step, JSON.stringify(hashes), userId])
    await this.dropEphemeral(`totp:${userId}`)
    return codes
  }

  async disableTotp(userId: string) {
    await this.db.run('UPDATE kt_users SET totp_secret = NULL, totp_last = NULL, recovery = NULL WHERE id = ?', [userId])
  }

  async newRecovery(userId: string) {
    const { codes, hashes } = newRecoveryCodes()
    await this.db.run('UPDATE kt_users SET recovery = ? WHERE id = ?', [JSON.stringify(hashes), userId])
    return codes
  }

  /** Checks an authenticator code (each works once) or a recovery code (used up). */
  async checkSecondFactor(user: User, code: string): Promise<'totp' | 'recovery' | null> {
    if (!user.totp_secret) return null
    const step = matchStep(unseal(this.key, user.totp_secret), code, this.now(), user.totp_last)
    if (step !== null) {
      // Only if nobody used this step in the meantime.
      const r = await this.db.run('UPDATE kt_users SET totp_last = ? WHERE id = ? AND (totp_last IS NULL OR totp_last < ?)', [step, user.id, step])
      return r.changes ? 'totp' : null
    }
    const left = useRecoveryCode(JSON.parse(user.recovery ?? '[]') as string[], code)
    if (!left) return null
    const r = await this.db.run('UPDATE kt_users SET recovery = ? WHERE id = ? AND recovery = ?', [JSON.stringify(left), user.id, user.recovery])
    return r.changes ? 'recovery' : null
  }

  recoveryLeft(user: User) {
    return (JSON.parse(user.recovery ?? '[]') as string[]).length
  }

  /* ───── single sign-on identities ───── */

  async byIdentity(provider: string, subject: string) {
    const row = await this.db.get<{ user_id: string }>('SELECT user_id FROM kt_identities WHERE provider = ? AND subject = ?', [provider, subject])
    return row ? this.byId(row.user_id) : undefined
  }

  async link(provider: string, subject: string, userId: string) {
    await upsert(this.db, 'kt_identities', ['provider', 'subject'], { provider, subject, user_id: userId, created_at: this.now() })
  }

  async identities(userId: string) {
    return (await this.db.all<{ provider: string }>('SELECT provider FROM kt_identities WHERE user_id = ?', [userId])).map((r) => r.provider)
  }

  async unlink(provider: string, userId: string) {
    await this.db.run('DELETE FROM kt_identities WHERE provider = ? AND user_id = ?', [provider, userId])
  }

  /* ───── short-lived things (sign-in states, pending secrets) ───── */

  async putEphemeral(k: string, v: string, ttlMs: number) {
    await upsert(this.db, 'kt_ephemeral', ['k'], { k, v, expires_at: this.now() + ttlMs })
  }
  async getEphemeral(k: string) {
    const row = await this.db.get<{ v: string; expires_at: number | string }>('SELECT v, expires_at FROM kt_ephemeral WHERE k = ?', [k])
    return row && Number(row.expires_at) > this.now() ? row.v : null
  }
  /** Reads and deletes in one go, so a state works once. */
  async takeEphemeral(k: string) {
    const v = await this.getEphemeral(k)
    if (v === null) return null
    const r = await this.db.run('DELETE FROM kt_ephemeral WHERE k = ?', [k])
    return r.changes ? v : null
  }
  async dropEphemeral(k: string) {
    await this.db.run('DELETE FROM kt_ephemeral WHERE k = ?', [k])
  }

  /* ───── slowing down guessing ───── */

  /** Whether `key` has failed `limit` times within `windowMs`. */
  async limited(key: string, limit: number, windowMs: number) {
    const row = await this.db.get<{ n: number | string }>('SELECT COUNT(*) AS n FROM kt_attempts WHERE k = ? AND at > ?', [key, this.now() - windowMs])
    return Number(row?.n ?? 0) >= limit
  }
  async failed(key: string) {
    await this.db.run('INSERT INTO kt_attempts (k, at) VALUES (?, ?)', [key, this.now()])
  }
  async forgive(key: string) {
    await this.db.run('DELETE FROM kt_attempts WHERE k = ?', [key])
  }

  /** Clears out expired sessions, links, states and old attempts. */
  async sweep() {
    const t = this.now()
    await this.db.run('DELETE FROM kt_sessions WHERE expires_at < ?', [t])
    await this.db.run('DELETE FROM kt_tokens WHERE expires_at < ?', [t - DAY])
    await this.db.run('DELETE FROM kt_ephemeral WHERE expires_at < ?', [t])
    await this.db.run('DELETE FROM kt_attempts WHERE at < ?', [t - DAY])
  }
}

export const sessionHash = hash
