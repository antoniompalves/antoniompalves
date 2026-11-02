import { randomBytes } from 'node:crypto'
import { createReadStream, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { can } from '../src/data/access.ts'
import { emptyWorkspace, shiftDates, slugOf } from '../src/data/defaults.ts'
import type { WorkspaceAction } from '../src/data/reducer.ts'
import type { AuditAction, Permission, TeamMember, Workspace } from '../src/data/types.ts'
import { inviteMail, mailer, resetMail } from './accounts/mail.ts'
import type { MailLocale, Mailer } from './accounts/mail.ts'
import { Oidc, SsoError, ssoProviders } from './accounts/oidc.ts'
import type { SsoProvider } from './accounts/oidc.ts'
import { hashPassword, passwordProblem, verifyPassword } from './accounts/passwords.ts'
import { Accounts, SESSION_DAYS, sessionHash } from './accounts/service.ts'
import type { Session, User } from './accounts/service.ts'
import { otpauthUrl } from './accounts/totp.ts'
import type { Config } from './config.ts'
import { keyFrom, pkce, safeEqual } from './crypto.ts'
import type { Db } from './db.ts'
import { upsert } from './db.ts'
import { HttpError, clientIp, cookie, cookies, isEmail, readJson, send, str } from './http.ts'
import { Hub } from './workspace/hub.ts'
import { Refused } from './workspace/policy.ts'
import { DEFAULT_ARCHIVE_DAYS, allArchived, archiveStats, archived, daily, listArchive, listBackups, makeBackup, readBackup, restoreArchived, restoreWorkspace, runArchive, workspaceOf } from './workspace/archive.ts'
import { ARCHIVE_LISTS } from '../src/data/archive.ts'
import type { ArchiveList } from '../src/data/archive.ts'

/**
 * Kataru's accounts API: the first-run setup, signing in (password, two-factor
 * codes, single sign-on), invitations and password resets, everyone's own
 * account and sessions, managing the team, and the shared workspace with its
 * live updates. Mounted under /api by app.ts, which also serves the built app.
 */

const COOKIE = 'kataru_session'
const INVITE_DAYS = 7
const RESET_MINUTES = 30
const MIN = 60_000

export interface KataruDeps {
  db: Db
  /** The publishing service's files, for the storage figures. */
  media?: { stats(): { previews: { count: number; bytes: number }; originals: { count: number; bytes: number } } }
  now?: () => number
  log?: (s: string) => void
  mailer?: Mailer
  fetch?: typeof fetch
}

interface Me {
  session: Session
  user: User
  member: TeamMember
  ws: Workspace
}

const LOCALES: MailLocale[] = ['en', 'pt-PT']
const localeOf = (v: unknown): MailLocale => (LOCALES.includes(v as MailLocale) ? (v as MailLocale) : 'en')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

export async function createKataru(config: Config, deps: KataruDeps) {
  const a = config.accounts
  const now = deps.now ?? Date.now
  const log = deps.log ?? ((s: string) => console.log(s))
  const db = deps.db
  const accounts = new Accounts(db, keyFrom(config.secret), now)
  const hub = new Hub(db, { now, log })
  const mail = deps.mailer ?? mailer(a.smtpUrl, a.mailFrom, log)
  const sso = ssoProviders(a.env)
  const oidc = new Oidc(deps.fetch ?? fetch, now)
  const iso = () => new Date(now()).toISOString()
  const cookiePath = `${a.basePath}/` || '/'

  await hub.load()

  /** The setup code, shared by every process through the database. */
  async function setupCode() {
    if (a.setupCode) return a.setupCode
    const row = await db.get<{ v: string }>('SELECT v FROM kt_meta WHERE k = ?', ['setup_code'])
    if (row) return row.v
    const raw = randomBytes(5).toString('hex').toUpperCase()
    const code = `${raw.slice(0, 5)}-${raw.slice(5)}`
    await db.run(db.dialect === 'mysql' ? 'INSERT IGNORE INTO kt_meta (k, v) VALUES (?, ?)' : 'INSERT OR IGNORE INTO kt_meta (k, v) VALUES (?, ?)', ['setup_code', code])
    return (await db.get<{ v: string }>('SELECT v FROM kt_meta WHERE k = ?', ['setup_code']))!.v
  }
  if (!hub.ready) log(`Kataru isn't set up yet. Open ${a.appUrl} and use the setup code ${await setupCode()} (or set KATARU_SETUP_CODE).`)

  const sweeper = setInterval(() => void accounts.sweep().catch(() => undefined), 60 * MIN)
  sweeper.unref?.()
  // Once a day: a backup, then old items to the archive (archive.ts).
  const runDaily = () => void daily(db, hub, now(), log).catch((e) => log(`[daily] ${(e as Error).message}`))
  const dailyTimer = setInterval(runDaily, 60 * MIN)
  dailyTimer.unref?.()
  const firstDaily = setTimeout(runDaily, 15_000)
  firstDaily.unref?.()

  /* ───── helpers ───── */

  const setSession = (res: ServerResponse, token: string, stage: 'full' | 'mfa') =>
    res.setHeader('set-cookie', cookie(COOKIE, token, { secure: a.cookieSecure, path: cookiePath, maxAge: stage === 'mfa' ? 600 : SESSION_DAYS * 86_400 }))
  const clearSession = (res: ServerResponse) => res.setHeader('set-cookie', cookie(COOKIE, '', { secure: a.cookieSecure, path: cookiePath, maxAge: 0 }))

  const ip = (req: IncomingMessage) => clientIp(req, a.trustProxy)
  const agent = (req: IncomingMessage) => String(req.headers['user-agent'] ?? '').slice(0, 255)

  async function guard(key: string, limit: number, windowMs: number) {
    if (await accounts.limited(key, limit, windowMs)) throw new HttpError(429, 'slow_down', 'Too many attempts. Wait a few minutes and try again.', { retryAfter: Math.ceil(windowMs / 1000) })
  }

  const memberOf = (u: User) => hub.ws?.team.find((m) => m.id === u.member_id)
  const requireMfa = (u: User, s: Session) => !!hub.ws?.settings.requireMfa && !u.totp_secret && !s.method.startsWith('sso:')

  /** The signed-in person, or a 401. `enrolling` lets people who must turn on two-factor reach their account. */
  async function me(req: IncomingMessage, o: { enrolling?: boolean } = {}): Promise<Me> {
    const found = await accounts.session(cookies(req)[COOKIE])
    if (!found || found.session.stage !== 'full') throw new HttpError(401, 'signed_out', 'Sign in first')
    // Another process may have changed people or settings a moment ago.
    await hub.sync()
    if (!hub.ready) throw new HttpError(409, 'setup', 'Kataru has not been set up yet')
    const member = memberOf(found.user)
    if (!member || member.status !== 'active') throw new HttpError(403, 'suspended', 'This account has been suspended')
    if (!o.enrolling && requireMfa(found.user, found.session)) throw new HttpError(403, 'mfa_required', 'Turn on two-step verification to continue')
    return { ...found, member, ws: hub.ws! }
  }

  const needs = (m: Me, perm: Permission) => {
    if (!can(m.ws, m.member.id, perm)) throw new HttpError(403, 'forbidden', "Your role can't do that")
  }

  const system = (actions: WorkspaceAction[]) => hub.apply({ userId: null, memberId: null }, actions)
  const audit = (actorId: string, kind: 'auth' | 'member', action: AuditAction): WorkspaceAction => ({ type: 'audit', event: { id: `au-${now().toString(36)}${randomBytes(2).toString('hex')}`, actorId, kind, action, at: iso() } })

  /** Signs someone in: a session cookie, their "last active", and a line in the activity log. */
  async function signIn(req: IncomingMessage, res: ServerResponse, user: User, method: string) {
    const member = memberOf(user)
    if (!member) throw new HttpError(403, 'suspended', 'This account is no longer on the team')
    if (member.status === 'suspended') throw new HttpError(403, 'suspended', 'This account has been suspended')
    if (user.totp_secret && !method.startsWith('sso:')) {
      setSession(res, await accounts.startSession(user.id, 'mfa', method, ip(req), agent(req)), 'mfa')
      return { mfa: true }
    }
    setSession(res, await accounts.startSession(user.id, 'full', method, ip(req), agent(req)), 'full')
    await system([{ type: 'saveMember', member: { ...member, lastActiveAt: iso() } }, audit(member.id, 'auth', { type: 'signedIn' })])
    return { ok: true, mustEnroll: requireMfa(user, { method } as Session) }
  }

  function checkPassword(password: string, email: string) {
    const problem = passwordProblem(password, email)
    if (problem) throw new HttpError(400, 'password', 'Choose a stronger password', { problem })
  }

  const link = (kind: 'invite' | 'reset', token: string) => `${a.appUrl}/#/${kind}/${token}`

  async function sendInvite(inviter: TeamMember, member: TeamMember, user: User, locale: MailLocale) {
    const token = await accounts.issue('invite', user.id, INVITE_DAYS * 86_400_000)
    const url = link('invite', token)
    const role = hub.ws!.roles.find((r) => r.id === member.role)
    const roleLabel = role?.name ?? ROLE_NAMES[locale][member.role] ?? member.role
    const emailed = await mail.send(inviteMail(locale, member.email, { company: hub.ws!.settings.name, inviter: inviter.name, role: roleLabel, url, days: INVITE_DAYS }))
    return { link: url, emailed }
  }

  const summary = (u: User, s: Session) => ({
    id: u.id,
    memberId: u.member_id,
    email: u.email,
    name: u.name,
    stage: s.stage,
    method: s.method,
    mfa: !!u.totp_secret,
    hasPassword: !!u.password_hash,
    mustEnroll: s.stage === 'full' && requireMfa(u, s),
  })

  /* ───── setup ───── */

  async function setup(req: IncomingMessage, res: ServerResponse) {
    await guard(`setup:${ip(req)}`, 10, 15 * MIN)
    const body = await readJson(req, 2 * 1024 * 1024)
    await hub.sync()
    if (hub.ready) throw new HttpError(409, 'exists', 'Kataru is already set up')
    if (!safeEqual(str(body.code, 40).toUpperCase(), (await setupCode()).toUpperCase())) {
      await accounts.failed(`setup:${ip(req)}`)
      throw new HttpError(403, 'code', 'That setup code is not right')
    }
    const company = str(body.company, 80)
    const name = str(body.name, 80)
    const email = str(body.email, 254).toLowerCase()
    const password = typeof body.password === 'string' ? body.password : ''
    const brands = (Array.isArray(body.brands) ? body.brands : []).map((b) => str(b, 60)).filter(Boolean).slice(0, 30)
    const currency = ['USD', 'EUR', 'GBP'].includes(body.currency as string) ? (body.currency as 'USD' | 'EUR' | 'GBP') : 'EUR'
    const timeZone = str(body.timeZone, 60) || 'Europe/Lisbon'
    const sample = body.sample && typeof body.sample === 'object' ? (body.sample as Workspace) : null
    if (!company || !name || !isEmail(email) || (!sample && !brands.length)) throw new HttpError(400, 'invalid', 'Fill in the company, at least one brand, your name and email')
    checkPassword(password, email)

    let ws: Workspace
    let memberId: string
    if (sample) {
      if (!Array.isArray(sample.team) || !Array.isArray(sample.posts) || !Array.isArray(sample.brands) || typeof sample.now !== 'string') throw new HttpError(400, 'invalid', 'The sample workspace is not valid')
      // The sample's day becomes today; its owner becomes you.
      const days = Math.round((now() - Date.parse(sample.now)) / 86_400_000) * 86_400_000
      // Yearly dates keep their day; everything else moves.
      const shifted = { ...shiftDates(sample, days), keyDates: (sample.keyDates ?? []).map((d) => (d.yearly ? d : shiftDates(d, days))) }
      const owner = shifted.team.find((m) => m.role === 'owner') ?? shifted.team[0]!
      memberId = owner.id
      ws = {
        ...shifted,
        now: iso(),
        currentUserId: owner.id,
        settings: { ...shifted.settings, name: company, currency },
        team: shifted.team.map((m) => (m.id === owner.id ? { ...m, name, email, avatar: undefined, title: str(body.title, 80) || m.title, mfa: false, lastActiveAt: iso() } : m)),
        brandScope: null,
        signedIn: true,
      }
    } else {
      memberId = slugOf(name) || 'owner'
      ws = emptyWorkspace({ company, brands: brands.map((b) => ({ name: b })), owner: { id: memberId, name, email, title: str(body.title, 80) || undefined }, now: iso(), timeZone, currency })
    }
    const passwordHash = await hashPassword(password)
    let user: User
    try {
      user = await db.tx(async (t) => {
        await hub.insertInitial(t, ws)
        return accounts.create({ memberId, email, name, passwordHash }, t)
      })
    } catch (e) {
      if (/UNIQUE|PRIMARY|Duplicate/i.test((e as Error).message)) throw new HttpError(409, 'exists', 'Kataru is already set up')
      throw e
    }
    hub.adopt(ws)
    await db.run('DELETE FROM kt_meta WHERE k = ?', ['setup_code'])
    log(`Kataru is set up for ${company} (owner ${email}).`)
    send(res, 200, await signIn(req, res, user, 'password'))
  }

  /* ───── signing in ───── */

  async function login(req: IncomingMessage, res: ServerResponse) {
    const body = await readJson(req)
    const email = str(body.email, 254).toLowerCase()
    const password = typeof body.password === 'string' ? body.password.slice(0, 500) : ''
    await guard(`login:ip:${ip(req)}`, 30, 15 * MIN)
    await guard(`login:email:${email}`, 10, 15 * MIN)
    await hub.sync()
    const user = email ? await accounts.byEmail(email) : undefined
    const ok = await verifyPassword(password, user?.password_hash)
    if (!user || !ok) {
      await accounts.failed(`login:ip:${ip(req)}`)
      await accounts.failed(`login:email:${email}`)
      throw new HttpError(401, 'invalid', 'Wrong email or password')
    }
    await accounts.forgive(`login:email:${email}`)
    send(res, 200, await signIn(req, res, user, 'password'))
  }

  async function secondFactor(req: IncomingMessage, res: ServerResponse) {
    const found = await accounts.session(cookies(req)[COOKIE])
    if (!found || found.session.stage !== 'mfa') throw new HttpError(401, 'signed_out', 'Sign in again')
    const body = await readJson(req)
    const code = str(body.code, 40)
    await guard(`mfa:${found.user.id}`, 8, 15 * MIN)
    const kind = await accounts.checkSecondFactor(found.user, code)
    if (!kind) {
      await accounts.failed(`mfa:${found.user.id}`)
      throw new HttpError(401, 'code', 'That code is not right')
    }
    await accounts.forgive(`mfa:${found.user.id}`)
    // A fresh session for the signed-in stage (the waiting one goes).
    await accounts.endSession(found.session.id)
    const member = memberOf(found.user)
    if (!member || member.status !== 'active') throw new HttpError(403, 'suspended', 'This account has been suspended')
    setSession(res, await accounts.startSession(found.user.id, 'full', found.session.method, ip(req), agent(req)), 'full')
    await system([{ type: 'saveMember', member: { ...member, lastActiveAt: iso() } }, audit(member.id, 'auth', { type: 'signedIn' })])
    const user = (await accounts.byId(found.user.id))!
    send(res, 200, { ok: true, usedRecovery: kind === 'recovery', recoveryLeft: accounts.recoveryLeft(user) })
  }

  async function logout(req: IncomingMessage, res: ServerResponse) {
    const found = await accounts.session(cookies(req)[COOKIE])
    if (found) {
      await accounts.endSession(found.session.id)
      const member = memberOf(found.user)
      if (member && found.session.stage === 'full' && hub.ready) await system([audit(member.id, 'auth', { type: 'signedOut' })])
    }
    clearSession(res)
    send(res, 200, { ok: true })
  }

  async function sessionInfo(req: IncomingMessage, res: ServerResponse) {
    await hub.sync()
    const found = await accounts.session(cookies(req)[COOKIE])
    const member = found && memberOf(found.user)
    const user = found && member && member.status === 'active' ? summary(found.user, found.session) : null
    send(res, 200, {
      setup: !hub.ready,
      company: hub.ws?.settings.name ?? null,
      sso: sso.map((p) => ({ id: p.id, name: p.name })),
      mail: mail.configured,
      user,
    })
  }

  /* ───── links: forgotten passwords and invitations ───── */

  async function forgot(req: IncomingMessage, res: ServerResponse) {
    const body = await readJson(req)
    const email = str(body.email, 254).toLowerCase()
    await guard(`forgot:ip:${ip(req)}`, 10, 60 * MIN)
    await guard(`forgot:email:${email}`, 3, 60 * MIN)
    await accounts.failed(`forgot:ip:${ip(req)}`)
    await accounts.failed(`forgot:email:${email}`)
    const user = isEmail(email) ? await accounts.byEmail(email) : undefined
    const member = user && memberOf(user)
    // The same answer either way, so the form doesn't tell who has an account.
    if (user && member?.status === 'active' && hub.ws) {
      const token = await accounts.issue('reset', user.id, RESET_MINUTES * MIN)
      await mail.send(resetMail(localeOf(body.locale), user.email, { company: hub.ws.settings.name, url: link('reset', token), minutes: RESET_MINUTES }))
    }
    send(res, 200, { ok: true, mail: mail.configured })
  }

  async function peekLink(res: ServerResponse, kind: 'invite' | 'reset', token: string) {
    const user = await accounts.peek(kind, token)
    const member = user && memberOf(user)
    if (!user || !member || (kind === 'reset' && member.status !== 'active') || (kind === 'invite' && member.status !== 'invited')) throw new HttpError(404, 'expired', 'This link has expired or was already used')
    send(res, 200, { email: user.email, name: member.name, company: hub.ws!.settings.name, role: member.role })
  }

  async function reset(req: IncomingMessage, res: ServerResponse) {
    const body = await readJson(req)
    await guard(`link:${ip(req)}`, 30, 15 * MIN)
    const password = typeof body.password === 'string' ? body.password : ''
    const peeked = await accounts.peek('reset', str(body.token, 100))
    if (!peeked) {
      await accounts.failed(`link:${ip(req)}`)
      throw new HttpError(404, 'expired', 'This link has expired or was already used')
    }
    checkPassword(password, peeked.email)
    const user = await accounts.take('reset', str(body.token, 100))
    if (!user) throw new HttpError(404, 'expired', 'This link has expired or was already used')
    await accounts.setPassword(user.id, await hashPassword(password))
    // A new password signs every other device out.
    await accounts.endSessions(user.id)
    hub.disconnect(user.member_id)
    send(res, 200, await signIn(req, res, (await accounts.byId(user.id))!, 'reset'))
  }

  async function accept(req: IncomingMessage, res: ServerResponse) {
    const body = await readJson(req)
    await guard(`link:${ip(req)}`, 30, 15 * MIN)
    const token = str(body.token, 100)
    const password = typeof body.password === 'string' ? body.password : ''
    await hub.sync()
    const peeked = await accounts.peek('invite', token)
    const pending = peeked && memberOf(peeked)
    if (!peeked || !pending || pending.status !== 'invited') {
      await accounts.failed(`link:${ip(req)}`)
      throw new HttpError(404, 'expired', 'This invitation has expired or was already used')
    }
    checkPassword(password, peeked.email)
    const user = await accounts.take('invite', token)
    if (!user) throw new HttpError(404, 'expired', 'This invitation has expired or was already used')
    const name = str(body.name, 80) || pending.name
    await accounts.setPassword(user.id, await hashPassword(password))
    if (name !== user.name) await accounts.rename(user.id, name)
    await system([{ type: 'saveMember', member: { ...pending, name, status: 'active', joinedAt: iso() } }, audit(pending.id, 'member', { type: 'joinedTeam' })])
    send(res, 200, await signIn(req, res, (await accounts.byId(user.id))!, 'invite'))
  }

  /* ───── single sign-on ───── */

  const ssoRedirect = (p: SsoProvider) => `${config.publicUrl}${a.basePath}/api/auth/sso/${p.id}/callback`
  const back = (res: ServerResponse, hash: string) => {
    res.writeHead(302, { location: `${a.appUrl}/#/${hash}`, 'cache-control': 'no-store' })
    res.end()
  }

  async function ssoStart(req: IncomingMessage, res: ServerResponse, p: SsoProvider, url: URL, linkTo: string | null) {
    const state = randomBytes(24).toString('base64url')
    const nonce = randomBytes(16).toString('base64url')
    const { verifier, challenge } = pkce()
    await accounts.putEphemeral(`sso:${state}`, JSON.stringify({ provider: p.id, verifier, nonce, linkTo }), 15 * MIN)
    const location = await oidc.authorizeUrl(p, { redirectUri: ssoRedirect(p), state, nonce, challenge, email: str(url.searchParams.get('email'), 254) || undefined })
    void req
    res.writeHead(302, { location, 'cache-control': 'no-store' })
    res.end()
  }

  async function ssoCallback(req: IncomingMessage, res: ServerResponse, p: SsoProvider, url: URL) {
    const raw = await accounts.takeEphemeral(`sso:${str(url.searchParams.get('state'), 100)}`)
    if (!raw) return back(res, 'signin?sso=expired')
    const st = JSON.parse(raw) as { provider: string; verifier: string; nonce: string; linkTo: string | null }
    if (st.provider !== p.id) return back(res, 'signin?sso=expired')
    if (url.searchParams.get('error')) return back(res, `signin?sso=denied`)
    const code = url.searchParams.get('code')
    if (!code) return back(res, 'signin?sso=denied')
    try {
      const claims = await oidc.finish(p, { code, redirectUri: ssoRedirect(p), verifier: st.verifier, nonce: st.nonce })
      await hub.sync()
      if (!hub.ready) return back(res, 'signin?sso=setup')
      // Linking from "Account & security": attach this sign-in to the account in hand.
      if (st.linkTo) {
        const owner = await accounts.byIdentity(p.id, claims.subject)
        if (owner && owner.id !== st.linkTo) return back(res, 'account?sso=taken')
        await accounts.link(p.id, claims.subject, st.linkTo)
        return back(res, 'account?sso=linked')
      }
      let user = await accounts.byIdentity(p.id, claims.subject)
      if (!user) {
        user = await accounts.byEmail(claims.email)
        if (user) await accounts.link(p.id, claims.subject, user.id)
      }
      if (!user) {
        const domain = claims.email.split('@')[1]!
        if (!a.ssoDomains.includes(domain)) return back(res, 'signin?sso=unknown')
        user = await joinBySso(claims.name, claims.email)
        await accounts.link(p.id, claims.subject, user.id)
      }
      let member = memberOf(user)
      if (member?.status === 'invited') {
        // Signing in with the invited address accepts the invitation.
        await accounts.revokeTokens(user.id, 'invite')
        await system([{ type: 'saveMember', member: { ...member, status: 'active', joinedAt: iso() } }, audit(member.id, 'member', { type: 'joinedTeam' })])
        member = memberOf(user)
      }
      if (!member || member.status !== 'active') return back(res, 'signin?sso=suspended')
      await signIn(req, res, user, `sso:${p.id}`)
      back(res, 'overview')
    } catch (e) {
      log(`[sso] ${p.name}: ${(e as Error).message}`)
      back(res, `signin?sso=${e instanceof SsoError ? e.code : 'failed'}`)
    }
  }

  /** Someone from an allowed domain, signing in with SSO for the first time. */
  async function joinBySso(name: string, email: string) {
    const ws = hub.ws!
    const role = ws.roles.some((r) => r.id === a.ssoRole) && a.ssoRole !== 'owner' ? a.ssoRole : 'analyst'
    const id = uniqueMemberId(ws, name)
    const member: TeamMember = { id, name, role, brands: 'all', email, status: 'active', mfa: false, joinedAt: iso() }
    const user = await accounts.create({ memberId: id, email, name })
    await system([{ type: 'saveMember', member }, audit(id, 'member', { type: 'joinedTeam' })])
    return user
  }

  /* ───── the workspace ───── */

  async function workspace(req: IncomingMessage, res: ServerResponse) {
    const m = await me(req)
    // "Last active" moves at most every ten minutes.
    if (!m.member.lastActiveAt || now() - Date.parse(m.member.lastActiveAt) > 10 * MIN) await system([{ type: 'saveMember', member: { ...m.member, lastActiveAt: iso() } }])
    send(res, 200, hub.view(m.member.id))
  }

  async function changes(req: IncomingMessage, res: ServerResponse, url: URL) {
    const m = await me(req)
    const since = Number(url.searchParams.get('since') ?? -1)
    send(res, 200, since === hub.version ? { version: hub.version } : hub.view(m.member.id))
  }

  async function stream(req: IncomingMessage, res: ServerResponse) {
    const m = await me(req)
    res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' })
    res.write(`retry: 3000\nevent: hello\ndata: ${JSON.stringify({ version: hub.version })}\n\n`)
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000)
    const stop = hub.subscribe({
      memberId: m.member.id,
      send: (change) => res.write(`data: ${JSON.stringify(change)}\n\n`),
      presence: (list) => res.write(`event: presence\ndata: ${JSON.stringify(list)}\n\n`),
      close: () => res.end(),
    })
    res.write(`event: presence\ndata: ${JSON.stringify(await hub.presence())}\n\n`)
    req.on('close', () => {
      clearInterval(ping)
      stop()
    })
  }

  async function actions(req: IncomingMessage, res: ServerResponse) {
    const m = await me(req)
    const body = await readJson<{ actions?: unknown; id?: unknown }>(req, 4 * 1024 * 1024)
    // A batch sent again after a lost reply is applied once.
    const batch = str(body.id, 80) && `batch:${m.user.id}:${str(body.id, 80)}`
    const seen = batch ? await accounts.getEphemeral(batch) : null
    if (seen) return send(res, 200, { from: Number(seen), to: Number(seen), patch: null, duplicate: true })
    try {
      const change = await hub.apply({ userId: m.user.id, memberId: m.member.id }, body.actions as WorkspaceAction[])
      if (batch) await accounts.putEphemeral(batch, String(change.to), 10 * MIN)
      send(res, 200, change)
    } catch (e) {
      if (e instanceof Refused) throw new HttpError(e.code === 'forbidden' ? 403 : 400, e.code, e.message, { version: hub.version })
      throw e
    }
  }

  /* ───── your account ───── */

  async function account(req: IncomingMessage, res: ServerResponse) {
    const m = await me(req, { enrolling: true })
    const sessions = await accounts.sessions(m.user.id)
    send(res, 200, {
      ...summary(m.user, m.session),
      recoveryLeft: accounts.recoveryLeft(m.user),
      identities: await accounts.identities(m.user.id),
      sso: sso.map((p) => ({ id: p.id, name: p.name })),
      sessions: sessions.map((s) => ({ id: s.id, current: s.id === m.session.id, method: s.method, createdAt: new Date(s.created_at).toISOString(), seenAt: new Date(s.seen_at).toISOString(), ip: s.ip, agent: s.agent })),
    })
  }

  async function changePassword(req: IncomingMessage, res: ServerResponse) {
    const m = await me(req, { enrolling: true })
    const body = await readJson(req)
    await guard(`password:${m.user.id}`, 8, 15 * MIN)
    const next = typeof body.next === 'string' ? body.next : ''
    if (m.user.password_hash && !(await verifyPassword(typeof body.current === 'string' ? body.current : '', m.user.password_hash))) {
      await accounts.failed(`password:${m.user.id}`)
      throw new HttpError(401, 'current', 'Your current password is not right')
    }
    checkPassword(next, m.user.email)
    await accounts.setPassword(m.user.id, await hashPassword(next))
    await accounts.endSessions(m.user.id, m.session.id)
    send(res, 200, { ok: true })
  }

  async function updateProfile(req: IncomingMessage, res: ServerResponse) {
    const m = await me(req, { enrolling: true })
    const body = await readJson(req)
    const name = str(body.name, 80) || m.member.name
    const title = body.title === undefined ? m.member.title : str(body.title, 80) || undefined
    if (name !== m.user.name) await accounts.rename(m.user.id, name)
    await system([{ type: 'saveMember', member: { ...m.member, name, title } }])
    send(res, 200, { ok: true })
  }

  async function mfaStart(req: IncomingMessage, res: ServerResponse) {
    const m = await me(req, { enrolling: true })
    if (m.user.totp_secret) throw new HttpError(409, 'already', 'Two-step verification is already on')
    const secret = await accounts.startTotp(m.user.id)
    send(res, 200, { secret, url: otpauthUrl(secret, m.user.email, `Kataru (${m.ws.settings.name})`) })
  }

  async function mfaConfirm(req: IncomingMessage, res: ServerResponse) {
    const m = await me(req, { enrolling: true })
    const body = await readJson(req)
    await guard(`mfa:${m.user.id}`, 8, 15 * MIN)
    const codes = await accounts.confirmTotp(m.user.id, str(body.code, 20))
    if (!codes) {
      await accounts.failed(`mfa:${m.user.id}`)
      throw new HttpError(400, 'code', 'That code is not right. Check the time on your phone and try the newest code.')
    }
    await accounts.endSessions(m.user.id, m.session.id)
    await system([{ type: 'saveMember', member: { ...m.member, mfa: true } }])
    send(res, 200, { codes })
  }

  async function mfaDisable(req: IncomingMessage, res: ServerResponse) {
    const m = await me(req)
    const body = await readJson(req)
    await guard(`mfa:${m.user.id}`, 8, 15 * MIN)
    if (m.ws.settings.requireMfa) throw new HttpError(403, 'required', 'Your workspace requires two-step verification')
    if (!(await accounts.checkSecondFactor(m.user, str(body.code, 40)))) {
      await accounts.failed(`mfa:${m.user.id}`)
      throw new HttpError(401, 'code', 'That code is not right')
    }
    await accounts.disableTotp(m.user.id)
    await system([{ type: 'saveMember', member: { ...m.member, mfa: false } }])
    send(res, 200, { ok: true })
  }

  async function mfaRecovery(req: IncomingMessage, res: ServerResponse) {
    const m = await me(req)
    const body = await readJson(req)
    await guard(`mfa:${m.user.id}`, 8, 15 * MIN)
    if (!(await accounts.checkSecondFactor(m.user, str(body.code, 40)))) {
      await accounts.failed(`mfa:${m.user.id}`)
      throw new HttpError(401, 'code', 'That code is not right')
    }
    send(res, 200, { codes: await accounts.newRecovery(m.user.id) })
  }

  /* ───── the team ───── */

  function uniqueMemberId(ws: Workspace, name: string) {
    const base = slugOf(name.split(' ')[0] ?? '') || 'member'
    let id = base
    for (let i = 2; ws.team.some((x) => x.id === id); i++) id = `${base}-${i}`
    return id
  }

  const brandsOf = (ws: Workspace, v: unknown): string[] | 'all' => {
    if (v === 'all') return 'all'
    const ids = (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string' && ws.brands.some((b) => b.id === x))
    if (!ids.length) throw new HttpError(400, 'brands', 'Pick at least one brand')
    return [...new Set(ids)]
  }
  const roleOk = (ws: Workspace, role: unknown) => {
    if (typeof role !== 'string' || role === 'owner' || !ws.roles.some((r) => r.id === role)) throw new HttpError(400, 'role', 'Pick a role (ownership can’t be given here)')
    return role
  }

  async function team(req: IncomingMessage, res: ServerResponse) {
    const m = await me(req)
    needs(m, 'team.manage')
    const users = new Map((await accounts.all()).map((u) => [u.member_id, u]))
    const pending = new Set((await db.all<{ user_id: string }>("SELECT user_id FROM kt_tokens WHERE kind = 'invite' AND used_at IS NULL AND expires_at > ?", [now()])).map((r) => r.user_id))
    send(res, 200, {
      mail: mail.configured,
      members: m.ws.team.map((x) => {
        const u = users.get(x.id)
        return { memberId: x.id, account: !!u, hasPassword: !!u?.password_hash, mfa: !!u?.totp_secret, invitePending: !!u && pending.has(u.id) }
      }),
    })
  }

  async function invite(req: IncomingMessage, res: ServerResponse) {
    const m = await me(req)
    needs(m, 'team.manage')
    const body = await readJson(req)
    const name = str(body.name, 80)
    const email = str(body.email, 254).toLowerCase()
    if (!name || !isEmail(email)) throw new HttpError(400, 'invalid', 'Enter a name and a valid email')
    const role = roleOk(m.ws, body.role)
    const brands = brandsOf(m.ws, body.brands ?? 'all')
    if (m.ws.team.some((x) => x.email.toLowerCase() === email) || (await accounts.byEmail(email))) throw new HttpError(409, 'taken', 'Someone on the team already uses that email')
    const member: TeamMember = { id: uniqueMemberId(m.ws, name), name, role, title: str(body.title, 80) || undefined, brands, email, status: 'invited', mfa: false, joinedAt: iso() }
    const user = await accounts.create({ memberId: member.id, email, name })
    try {
      await system([{ type: 'saveMember', member }, audit(m.member.id, 'member', { type: 'invited', name, role })])
    } catch (e) {
      await accounts.remove(user.id)
      throw e
    }
    const sent = await sendInvite(m.member, member, user, localeOf(body.locale))
    send(res, 200, { member, ...sent })
  }

  async function target(m: Me, memberId: string) {
    const member = m.ws.team.find((x) => x.id === memberId)
    if (!member) throw new HttpError(404, 'not_found', 'No such teammate')
    return { member, user: await accounts.byMember(memberId) }
  }

  async function resend(req: IncomingMessage, res: ServerResponse, memberId: string) {
    const m = await me(req)
    needs(m, 'team.manage')
    const body = await readJson(req)
    const { member, user } = await target(m, memberId)
    if (member.status !== 'invited' || !user) throw new HttpError(409, 'joined', 'They have already joined')
    send(res, 200, await sendInvite(m.member, member, user, localeOf(body.locale)))
  }

  async function changeMember(req: IncomingMessage, res: ServerResponse, memberId: string) {
    const m = await me(req)
    needs(m, 'team.manage')
    const body = await readJson(req)
    const { member, user } = await target(m, memberId)
    if (member.role === 'owner') throw new HttpError(403, 'owner', 'The owner can’t be changed here')
    if (member.id === m.member.id && (body.role !== undefined || body.status !== undefined)) throw new HttpError(403, 'self', 'Ask another admin to change your own role or access')
    const next: TeamMember = { ...member }
    const done: AuditAction[] = []
    if (body.role !== undefined && body.role !== member.role) {
      next.role = roleOk(m.ws, body.role)
      done.push({ type: 'changedRole', name: member.name, role: next.role })
    }
    if (body.brands !== undefined) next.brands = brandsOf(m.ws, body.brands)
    if (body.title !== undefined) next.title = str(body.title, 80) || undefined
    if (body.status !== undefined && body.status !== member.status) {
      if (member.status === 'invited' || !['active', 'suspended'].includes(body.status as string)) throw new HttpError(400, 'status', 'Only people who joined can be suspended or reactivated')
      next.status = body.status as 'active' | 'suspended'
      done.push({ type: 'suspendedMember', name: member.name, suspended: next.status === 'suspended' })
    }
    await system([{ type: 'saveMember', member: next }, ...done.map((x) => audit(m.member.id, 'member', x))])
    if (next.status === 'suspended' && user) {
      await accounts.endSessions(user.id)
      hub.disconnect(member.id)
    }
    send(res, 200, { member: next })
  }

  async function revoke(req: IncomingMessage, res: ServerResponse, memberId: string) {
    const m = await me(req)
    needs(m, 'team.manage')
    const { member, user } = await target(m, memberId)
    if (member.status !== 'invited') throw new HttpError(409, 'joined', 'Only pending invitations can be withdrawn; suspend people who joined')
    if (user) await accounts.remove(user.id)
    await system([{ type: 'removeMember', id: member.id }, audit(m.member.id, 'member', { type: 'revokedInvite', name: member.name })])
    send(res, 200, { ok: true })
  }

  async function resetLink(req: IncomingMessage, res: ServerResponse, memberId: string) {
    const m = await me(req)
    needs(m, 'team.manage')
    const { member, user } = await target(m, memberId)
    if (!user || member.status !== 'active') throw new HttpError(409, 'inactive', 'Only active teammates can get a reset link')
    if (member.role === 'owner' && m.member.id !== member.id) throw new HttpError(403, 'owner', 'Only the owner can reset the owner’s password')
    send(res, 200, { link: link('reset', await accounts.issue('reset', user.id, RESET_MINUTES * MIN)), minutes: RESET_MINUTES })
  }

  async function mfaOff(req: IncomingMessage, res: ServerResponse, memberId: string) {
    const m = await me(req)
    needs(m, 'team.manage')
    const { member, user } = await target(m, memberId)
    if (!user) throw new HttpError(404, 'not_found', 'No such account')
    if (member.role === 'owner' || member.id === m.member.id) throw new HttpError(403, 'owner', 'Use your recovery codes to turn off your own two-step verification')
    await accounts.disableTotp(user.id)
    await accounts.endSessions(user.id)
    hub.disconnect(member.id)
    await system([{ type: 'saveMember', member: { ...member, mfa: false } }])
    send(res, 200, { ok: true })
  }

  /* ───── data: backups, the archive, storage ───── */

  async function dataInfo(req: IncomingMessage, res: ServerResponse) {
    const m = await me(req)
    needs(m, 'settings.manage')
    const doc = JSON.stringify(m.ws)
    send(res, 200, {
      backups: await listBackups(db),
      archive: await archiveStats(db),
      archiveDays: m.ws.settings.archiveDays ?? DEFAULT_ARCHIVE_DAYS,
      workspaceBytes: Buffer.byteLength(doc),
      media: deps.media?.stats() ?? null,
      canRestore: m.member.role === 'owner',
    })
  }

  const download = (res: ServerResponse, name: string, body: string) => {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'no-store' })
    res.end(body)
  }

  async function fullExport(req: IncomingMessage, res: ServerResponse) {
    const m = await me(req)
    needs(m, 'settings.manage')
    const stamp = iso().slice(0, 10)
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="kataru-export-${stamp}.json"`, 'cache-control': 'no-store' })
    // The live workspace, then every archived item, written as it is read.
    res.write(`{"kataru":1,"exportedAt":${JSON.stringify(iso())},"version":${hub.version},"workspace":${JSON.stringify(hub.view(m.member.id).ws)},"archive":[`)
    const sees = (b: string | null) => !b || m.member.brands === 'all' || m.member.brands.includes(b)
    let first = true
    for await (const a of allArchived(db)) {
      const brand = (a.item as { brandId?: string }).brandId ?? null
      if (!sees(brand)) continue
      res.write(`${first ? '' : ','}${JSON.stringify(a)}`)
      first = false
    }
    res.end(']}')
  }

  async function archiveList(req: IncomingMessage, res: ServerResponse, url: URL) {
    const m = await me(req)
    const settingsOk = can(m.ws, m.member.id, 'settings.manage')
    if (!settingsOk && !can(m.ws, m.member.id, 'analytics.view') && !can(m.ws, m.member.id, 'post.create')) throw new HttpError(403, 'forbidden', "Your role can't open the archive")
    const lists = (url.searchParams.get('lists') ?? '').split(',').filter(Boolean) as ArchiveList[]
    send(
      res,
      200,
      await listArchive(db, {
        lists: lists.length ? lists : undefined,
        brands: m.member.brands,
        withoutBrand: settingsOk,
        q: str(url.searchParams.get('q'), 80) || undefined,
        year: Number(url.searchParams.get('year')) || undefined,
        offset: Number(url.searchParams.get('offset')) || 0,
        limit: Number(url.searchParams.get('limit')) || 50,
      }),
    )
  }

  /* ───── the built app ───── */

  const root = a.staticDir ? resolve(a.staticDir) : ''
  function serveStatic(req: IncomingMessage, res: ServerResponse, path: string) {
    if (!root || (req.method !== 'GET' && req.method !== 'HEAD')) return false
    const rel = path === '/' ? 'index.html' : decodeURIComponent(path.slice(1))
    const file = normalize(join(root, rel))
    if (file !== root && !file.startsWith(root + sep)) return false
    let st
    try {
      st = statSync(file)
    } catch {
      return false
    }
    if (!st.isFile()) return false
    const immutable = /[/\\]assets[/\\]/.test(file)
    res.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      'content-length': st.size,
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'x-content-type-options': 'nosniff',
      ...(extname(file) === '.html' && { 'referrer-policy': 'same-origin', 'x-frame-options': 'DENY' }),
    })
    if (req.method === 'HEAD') res.end()
    else createReadStream(file).pipe(res)
    return true
  }

  /* ───── routing ───── */

  const sameSite = (req: IncomingMessage) => {
    const origin = req.headers.origin
    return !origin || origin === new URL(config.publicUrl).origin || config.appOrigins.includes(origin) || origin === new URL(a.appUrl).origin
  }

  /** Handles the request if it is one of ours; false otherwise. */
  async function handle(req: IncomingMessage, res: ServerResponse, rawPath: string, url: URL): Promise<boolean> {
    const path = a.basePath && rawPath.startsWith(a.basePath) ? rawPath.slice(a.basePath.length) || '/' : rawPath
    const method = req.method ?? 'GET'
    if (!path.startsWith('/api/')) return serveStatic(req, res, path)
    const r = path.slice(4)
    const known = /^\/(session|setup|auth|workspace|account|team|presence|data|export|backups|archive)(\/|$)/.test(r)
    if (!known) return false
    try {
      // Changes need the app's own header: another site can't send it without asking first (CORS).
      if (method !== 'GET' && method !== 'HEAD' && (req.headers['x-kataru'] !== '1' || !sameSite(req))) throw new HttpError(403, 'csrf', 'Missing the X-Kataru header')
      await route(req, res, method, r, url)
    } catch (e) {
      if (res.headersSent) return (res.end(), true)
      if (e instanceof HttpError) send(res, e.status, { error: e.code, message: e.message, ...e.extra }, e.status === 429 ? { 'retry-after': String(e.extra?.retryAfter ?? 60) } : {})
      else {
        log(`[accounts] ${method} ${r}: ${(e as Error).stack ?? e}`)
        send(res, 500, { error: 'server', message: 'Something went wrong on the server' })
      }
    }
    return true
  }

  async function route(req: IncomingMessage, res: ServerResponse, method: string, r: string, url: URL) {
    const is = (m: string, p: string) => method === m && r === p
    if (is('GET', '/session')) return sessionInfo(req, res)
    if (is('POST', '/setup')) return setup(req, res)
    if (is('POST', '/auth/login')) return login(req, res)
    if (is('POST', '/auth/mfa')) return secondFactor(req, res)
    if (is('POST', '/auth/logout')) return logout(req, res)
    if (is('POST', '/auth/forgot')) return forgot(req, res)
    if (is('POST', '/auth/reset')) return reset(req, res)
    if (is('POST', '/auth/accept')) return accept(req, res)
    let m = r.match(/^\/auth\/link\/(invite|reset)\/([\w-]{20,100})$/)
    if (m && method === 'GET') return peekLink(res, m[1] as 'invite' | 'reset', m[2]!)
    m = r.match(/^\/auth\/sso\/(\w+)\/(start|callback)$/)
    if (m && method === 'GET') {
      const p = sso.find((x) => x.id === m![1])
      if (!p) throw new HttpError(404, 'not_found', 'That sign-in is not set up')
      if (m[2] === 'start') return ssoStart(req, res, p, url, null)
      return ssoCallback(req, res, p, url)
    }

    if (is('GET', '/workspace')) return workspace(req, res)
    if (is('GET', '/workspace/changes')) return changes(req, res, url)
    if (is('GET', '/workspace/stream')) return stream(req, res)
    if (is('POST', '/workspace/actions')) return actions(req, res)

    if (is('POST', '/presence')) {
      const m = await me(req)
      const body = await readJson(req)
      await hub.setPresence(m.member.id, str(body.where, 120))
      return send(res, 200, { ok: true })
    }
    if (is('GET', '/account')) return account(req, res)
    if (is('PATCH', '/account')) return updateProfile(req, res)
    if (is('POST', '/account/password')) return changePassword(req, res)
    if (is('POST', '/account/mfa/start')) return mfaStart(req, res)
    if (is('POST', '/account/mfa/confirm')) return mfaConfirm(req, res)
    if (is('POST', '/account/mfa/disable')) return mfaDisable(req, res)
    if (is('POST', '/account/mfa/recovery')) return mfaRecovery(req, res)
    if (is('POST', '/account/sessions/others')) {
      const me_ = await me(req, { enrolling: true })
      await accounts.endSessions(me_.user.id, me_.session.id)
      return send(res, 200, { ok: true })
    }
    m = r.match(/^\/account\/sessions\/([a-f0-9]{64})$/)
    if (m && method === 'DELETE') {
      const me_ = await me(req, { enrolling: true })
      const mine = (await accounts.sessions(me_.user.id)).some((s) => s.id === m![1])
      if (!mine) throw new HttpError(404, 'not_found', 'No such session')
      await accounts.endSession(m[1]!)
      return send(res, 200, { ok: true, signedOut: m[1] === me_.session.id })
    }
    m = r.match(/^\/account\/sso\/(\w+)$/)
    if (m) {
      const me_ = await me(req, { enrolling: true })
      const p = sso.find((x) => x.id === m![1])
      if (!p) throw new HttpError(404, 'not_found', 'That sign-in is not set up')
      if (method === 'GET') return ssoStart(req, res, p, url, me_.user.id)
      if (method === 'DELETE') {
        if (!me_.user.password_hash && (await accounts.identities(me_.user.id)).length <= 1) throw new HttpError(409, 'last', 'Set a password first, or you won’t be able to sign in')
        await accounts.unlink(p.id, me_.user.id)
        return send(res, 200, { ok: true })
      }
    }

    if (is('GET', '/data')) return dataInfo(req, res)
    if (is('GET', '/export')) return fullExport(req, res)
    if (is('POST', '/backups')) {
      const m_ = await me(req)
      needs(m_, 'settings.manage')
      return send(res, 200, await makeBackup(db, hub, 'manual', now()))
    }
    if (is('POST', '/backups/restore')) {
      const m_ = await me(req)
      if (m_.member.role !== 'owner') throw new HttpError(403, 'owner', 'Only the owner can restore a backup')
      const body = await readJson<{ backup?: unknown }>(req, 40 * 1024 * 1024)
      const ws = workspaceOf(body.backup)
      if (!ws) throw new HttpError(400, 'invalid', "That file isn't a Kataru backup")
      await restoreWorkspace(db, hub, ws, now())
      return send(res, 200, { ok: true })
    }
    m = r.match(/^\/backups\/(b-[\w-]+)(\/restore)?$/)
    if (m) {
      const m_ = await me(req)
      needs(m_, 'settings.manage')
      const text = await readBackup(db, m[1]!)
      if (!text) throw new HttpError(404, 'not_found', 'No such backup')
      if (!m[2] && method === 'GET') return download(res, `kataru-backup-${m[1]}.json`, text)
      if (m[2] && method === 'POST') {
        if (m_.member.role !== 'owner') throw new HttpError(403, 'owner', 'Only the owner can restore a backup')
        await restoreWorkspace(db, hub, workspaceOf(JSON.parse(text))!, now())
        return send(res, 200, { ok: true })
      }
    }
    if (is('GET', '/archive')) return archiveList(req, res, url)
    if (is('POST', '/archive/run')) {
      const m_ = await me(req)
      needs(m_, 'settings.manage')
      return send(res, 200, { moved: await runArchive(db, hub, now()) })
    }
    m = r.match(/^\/archive\/(\w+)\/([\w:.-]{1,100})(\/restore)?$/)
    if (m && (ARCHIVE_LISTS as readonly string[]).includes(m[1]!)) {
      const m_ = await me(req)
      const found = await archived(db, m[1]!, m[2]!)
      if (!found || (found.brandId && m_.member.brands !== 'all' && !m_.member.brands.includes(found.brandId)) || (!found.brandId && !can(m_.ws, m_.member.id, 'settings.manage'))) throw new HttpError(404, 'not_found', 'Not in the archive')
      if (!m[3] && method === 'GET') return send(res, 200, found)
      if (m[3] && method === 'POST') {
        needs(m_, 'settings.manage')
        await restoreArchived(db, hub, m[1] as ArchiveList, m[2]!)
        return send(res, 200, { ok: true })
      }
    }
    if (is('GET', '/team')) return team(req, res)
    if (is('POST', '/team/invite')) return invite(req, res)
    m = r.match(/^\/team\/([\w-]{1,64})(?:\/(resend|reset-link|mfa-off))?$/)
    if (m) {
      const [, id, sub] = m as unknown as [string, string, string | undefined]
      if (!sub && method === 'PATCH') return changeMember(req, res, id)
      if (!sub && method === 'DELETE') return revoke(req, res, id)
      if (sub === 'resend' && method === 'POST') return resend(req, res, id)
      if (sub === 'reset-link' && method === 'POST') return resetLink(req, res, id)
      if (sub === 'mfa-off' && method === 'POST') return mfaOff(req, res, id)
    }
    throw new HttpError(404, 'not_found', 'Not found')
  }

  /** For the publishing API: may the person behind this request do one of these? */
  async function allows(req: IncomingMessage, perms: Permission[]) {
    try {
      const m = await me(req)
      return perms.some((p) => can(m.ws, m.member.id, p))
    } catch {
      return false
    }
  }

  return {
    handle,
    allows,
    hub,
    accounts,
    setupCode,
    async close() {
      clearInterval(sweeper)
      clearInterval(dailyTimer)
      clearTimeout(firstDaily)
      await hub.close()
    },
    sessionHash,
    /** For tests and the admin command. */
    upsertMeta: (k: string, v: string) => upsert(db, 'kt_meta', ['k'], { k, v }),
  }
}

export type Kataru = Awaited<ReturnType<typeof createKataru>>

/** System role names for invitation emails. */
const ROLE_NAMES: Record<MailLocale, Record<string, string>> = {
  en: { admin: 'Admin', manager: 'Manager', editor: 'Editor', community: 'Community', analyst: 'Analyst', client: 'Client' },
  'pt-PT': { admin: 'Administração', manager: 'Gestão', editor: 'Edição', community: 'Comunidade', analyst: 'Análise', client: 'Cliente' },
}
