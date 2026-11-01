import assert from 'node:assert/strict'
import { createServer as createNetServer } from 'node:net'
import type { AddressInfo } from 'node:net'
import { after, describe, test } from 'node:test'
import { applyPatch } from '../../src/data/sync.ts'
import type { Post, Workspace } from '../../src/data/types.ts'
import { compose, sendSmtp } from '../accounts/mail.ts'
import { hashPassword, passwordProblem, verifyPassword } from '../accounts/passwords.ts'
import { base32, codeAt, matchStep, stepOf } from '../accounts/totp.ts'
import { openDb } from '../db.ts'
import { Browser, boot, cleanup, fakeIdp, freshDb } from './harness.ts'

after(cleanup)

const PASSWORD = 'correct horse battery'
const post = (id: string, brandId: string, authorId: string, status: Post['status'] = 'scheduled'): Post =>
  ({ id, brandId, authorId, status, networks: ['instagram'], text: `Post ${id}`, media: [], scheduledAt: '2026-11-20T10:00:00.000Z', createdAt: '2026-11-01T10:00:00.000Z', reviews: [] }) as unknown as Post

/* ───────────── building blocks ───────────── */

test('TOTP matches the RFC 6238 test vectors', () => {
  const secret = base32(Buffer.from('12345678901234567890'))
  assert.equal(secret, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
  assert.equal(codeAt(secret, stepOf(59_000), 8), '94287082')
  assert.equal(codeAt(secret, stepOf(1111111109_000), 8), '07081804')
  assert.equal(codeAt(secret, stepOf(1234567890_000), 8), '89005924')
  assert.equal(codeAt(secret, stepOf(20000000000_000), 8), '65353130')
  const t = 1_700_000_000_000
  const code = codeAt(secret, stepOf(t))
  assert.equal(matchStep(secret, code, t), stepOf(t))
  assert.equal(matchStep(secret, code, t + 30_000), stepOf(t), 'one step of drift is fine')
  assert.equal(matchStep(secret, code, t + 90_000), null)
  assert.equal(matchStep(secret, code, t, stepOf(t)), null, 'a used step is refused')
})

test('passwords hash with scrypt and weak ones are refused', async () => {
  const h = await hashPassword(PASSWORD)
  assert.match(h, /^scrypt\$32768\$8\$1\$/)
  assert.ok(await verifyPassword(PASSWORD, h))
  assert.ok(!(await verifyPassword('wrong password!', h)))
  assert.ok(!(await verifyPassword(PASSWORD, null)))
  assert.equal(passwordProblem('short'), 'short')
  assert.equal(passwordProblem('aaaaaaaaaaaa'), 'weak')
  assert.equal(passwordProblem('ana.silva-2026', 'ana.silva@x.pt'), 'weak')
  assert.equal(passwordProblem(PASSWORD, 'ana@x.pt'), null)
})

test('emails go out over SMTP with AUTH, as text and HTML', async () => {
  const got: string[] = []
  let message = ''
  const server = createNetServer((sock) => {
    sock.setEncoding('utf8')
    sock.write('220 fake ESMTP\r\n')
    let data = false
    let buf = ''
    sock.on('data', (chunk: string) => {
      buf += chunk
      if (data) {
        const end = buf.indexOf('\r\n.\r\n')
        if (end < 0) return
        message = buf.slice(0, end)
        buf = buf.slice(end + 5)
        data = false
        sock.write('250 queued\r\n')
      }
      let i
      while (!data && (i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i)
        buf = buf.slice(i + 2)
        got.push(line)
        if (line.startsWith('EHLO')) sock.write('250-fake\r\n250 AUTH PLAIN LOGIN\r\n')
        else if (line.startsWith('AUTH PLAIN')) sock.write('235 ok\r\n')
        else if (line.startsWith('MAIL') || line.startsWith('RCPT')) sock.write('250 ok\r\n')
        else if (line === 'DATA') {
          data = true
          sock.write('354 go\r\n')
        } else if (line === 'QUIT') sock.end('221 bye\r\n')
      }
    })
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const port = (server.address() as AddressInfo).port
  await sendSmtp(`smtp://bot%40x.pt:p%40ss@127.0.0.1:${port}?starttls=false`, 'Kataru <bot@x.pt>', { to: 'ana@x.pt', subject: 'Olá — convite', text: 'Link: https://k/#/invite/abc', html: '<p>.leading dot</p>' })
  server.close()
  assert.equal(got.find((l) => l.startsWith('AUTH PLAIN')), `AUTH PLAIN ${Buffer.from('\0bot@x.pt\0p@ss').toString('base64')}`)
  assert.ok(got.includes('MAIL FROM:<bot@x.pt>') && got.includes('RCPT TO:<ana@x.pt>'))
  assert.match(message, /Subject: =\?UTF-8\?B\?/)
  const parts = [...message.matchAll(/base64\r\n\r\n([\s\S]*?)\r\n--/g)].map((m) => Buffer.from(m[1]!.replace(/\r\n/g, ''), 'base64').toString('utf8'))
  assert.equal(parts[0], 'Link: https://k/#/invite/abc')
  assert.match(compose('a@b.c', { to: 'x@y.z', subject: 's', text: 't', html: 'h' }), /multipart\/alternative/)
})

/* ───────────── the whole flow, on each database ───────────── */

const kinds: ('sqlite' | 'mysql')[] = ['sqlite', ...(process.env.TEST_MYSQL_URL ? (['mysql'] as const) : [])]

for (const kind of kinds) {
  describe(`accounts on ${kind}`, { concurrency: false }, () => {
    test('setup, sign-in, two-factor, invitations, brands and live updates', async () => {
      const { url, db } = await freshDb(kind)
      const app = await boot({ db, url })
      const owner = new Browser(app.base)
      try {
        // Before setup.
        let r = await owner.get('/api/session')
        assert.deepEqual([r.status, r.body.setup, r.body.user], [200, true, null])
        r = await owner.get('/api/workspace')
        assert.equal(r.status, 401)

        // The X-Kataru header is required for changes.
        r = await owner.req('POST', '/api/setup', {}, { 'x-kataru': '' })
        assert.equal(r.status, 403)

        const setup = { code: 'ABCDE-12345', company: 'Lumen Group', brands: ['Lumen Café', 'Lumen Books'], name: 'Ana Silva', email: 'Ana@Lumen.pt', password: PASSWORD, currency: 'EUR' }
        r = await owner.post('/api/setup', { ...setup, code: 'WRONG' })
        assert.equal(r.status, 403)
        r = await owner.post('/api/setup', { ...setup, password: 'short' })
        assert.deepEqual([r.status, r.body.problem], [400, 'short'])
        r = await owner.post('/api/setup', setup)
        assert.equal(r.status, 200, JSON.stringify(r.body))
        assert.ok(owner.cookie)
        r = await new Browser(app.base).post('/api/setup', setup)
        assert.equal(r.status, 409)

        r = await owner.get('/api/session')
        assert.equal(r.body.company, 'Lumen Group')
        assert.deepEqual([r.body.user.email, r.body.user.memberId, r.body.user.mfa], ['ana@lumen.pt', 'ana-silva', false])

        r = await owner.get('/api/workspace')
        assert.equal(r.status, 200)
        const ws = r.body.ws as Workspace
        assert.deepEqual(ws.brands.map((b) => b.id), ['lumen-cafe', 'lumen-books'])
        assert.equal(ws.currentUserId, 'ana-silva')
        assert.equal(ws.audit[0]!.action.type, 'signedIn')

        // Changes through the shared reducer.
        r = await owner.post('/api/workspace/actions', { actions: [{ type: 'savePost', post: post('p1', 'lumen-cafe', 'ana-silva') }, { type: 'savePost', post: post('p2', 'lumen-books', 'ana-silva') }] })
        assert.equal(r.status, 200, JSON.stringify(r.body))
        assert.equal(r.body.to, r.body.from + 1)
        assert.deepEqual(r.body.patch.lists.posts.put.map((x: { item: Post }) => x.item.id), ['p1', 'p2'])
        // A batch sent twice (a reply lost on the way) is applied once.
        const once = { id: 'tab1-7', actions: [{ type: 'audit', event: { id: 'au-once', actorId: 'ana-silva', kind: 'auth', action: { type: 'signedIn' }, at: '2026-11-01T00:00:00Z' } }] }
        const first = await owner.post('/api/workspace/actions', once)
        const second = await owner.post('/api/workspace/actions', once)
        assert.deepEqual([second.body.duplicate, second.body.to], [true, first.body.to])
        assert.equal((await owner.get('/api/workspace')).body.ws.audit.filter((e: { id: string }) => e.id === 'au-once').length, 1)
        r = await owner.post('/api/workspace/actions', { actions: [{ type: 'signIn', userId: 'x' }] })
        assert.equal(r.status, 403, 'browser-only changes are refused')
        r = await owner.post('/api/workspace/actions', { actions: [{ type: 'saveMember', member: { ...ws.team[0], role: 'client' } }] })
        assert.equal(r.status, 403, 'people change through the team endpoints')

        // Invite an editor for one brand.
        r = await owner.post('/api/team/invite', { name: 'Rui Costa', email: 'rui@lumen.pt', role: 'editor', brands: ['lumen-books'], locale: 'pt-PT' })
        assert.equal(r.status, 200, JSON.stringify(r.body))
        assert.equal(r.body.member.status, 'invited')
        assert.equal(app.mails.at(-1)!.to, 'rui@lumen.pt')
        assert.match(app.mails.at(-1)!.subject, /convidou-o para Lumen Group/)
        const inviteToken = (r.body.link as string).split('/#/invite/')[1]!
        assert.ok(app.mails.at(-1)!.text.includes(inviteToken))
        r = await owner.post('/api/team/invite', { name: 'Rui again', email: 'RUI@lumen.pt', role: 'editor' })
        assert.equal(r.status, 409)
        r = await owner.post('/api/team/invite', { name: 'Boss', email: 'boss@lumen.pt', role: 'owner' })
        assert.equal(r.status, 400, 'nobody is invited as owner')

        const rui = new Browser(app.base)
        r = await rui.get(`/api/auth/link/invite/${inviteToken}`)
        assert.deepEqual([r.status, r.body.email, r.body.company], [200, 'rui@lumen.pt', 'Lumen Group'])
        r = await rui.post('/api/auth/accept', { token: inviteToken, password: 'rui' })
        assert.equal(r.status, 400)
        r = await rui.post('/api/auth/accept', { token: inviteToken, password: 'livros e cafe 2026' })
        assert.equal(r.status, 200, JSON.stringify(r.body))
        r = await new Browser(app.base).post('/api/auth/accept', { token: inviteToken, password: 'livros e cafe 2026' })
        assert.equal(r.status, 404, 'an invitation works once')

        // Rui sees only Lumen Books.
        r = await rui.get('/api/workspace')
        const seen = r.body.ws as Workspace
        assert.deepEqual(seen.brands.map((b) => b.id), ['lumen-books'])
        assert.deepEqual(seen.posts.map((p) => p.id), ['p2'])
        assert.equal(seen.team.find((m) => m.id === 'rui')!.status, 'active')

        // The owner hears Rui's changes live, as the owner sees them.
        r = await owner.get('/api/workspace')
        let mine = r.body.ws as Workspace
        let version = r.body.version as number
        const live = await owner.stream()
        await live.until(1)
        assert.equal(live.events[0]!.event, 'hello')
        const ruiLive = await rui.stream()
        await ruiLive.until(1)

        r = await rui.post('/api/workspace/actions', { actions: [{ type: 'savePost', post: post('p3', 'lumen-books', 'rui', 'draft') }] })
        assert.equal(r.status, 200)
        r = await rui.post('/api/workspace/actions', { actions: [{ type: 'savePost', post: post('p4', 'lumen-cafe', 'rui', 'draft') }] })
        assert.deepEqual([r.status, r.body.error], [403, 'forbidden'], "not another brand's")
        r = await rui.post('/api/workspace/actions', { actions: [{ type: 'move', id: 'p1', to: '2026-12-01T10:00:00.000Z' }] })
        assert.equal(r.status, 403, "can't move a post they can't see")
        r = await rui.post('/api/workspace/actions', { actions: [{ type: 'channel', id: 'x', patch: {} }] })
        assert.equal(r.status, 403, 'editors have no channels.manage')
        r = await rui.post('/api/workspace/actions', { actions: [{ type: 'delete', id: 'p2' }] })
        assert.equal(r.status, 403, "editors can't delete someone's scheduled post")
        r = await rui.post('/api/workspace/actions', { actions: [{ type: 'audit', event: { id: 'au-x', actorId: 'ana-silva', kind: 'auth', action: { type: 'signedIn' }, at: '2026-11-01T00:00:00Z' } }] })
        assert.equal(r.status, 200)
        r = await rui.post('/api/workspace/actions', { actions: [{ type: 'delete', id: 'p3' }] })
        assert.equal(r.status, 200, 'their own draft is fine')

        await live.until(5)
        for (const e of live.events.slice(1)) {
          if (e.data.to <= version) continue
          assert.equal(e.data.from, version)
          if (e.data.patch) mine = applyPatch(mine, e.data.patch)
          version = e.data.to
        }
        r = await owner.get('/api/workspace')
        assert.equal(r.body.version, version)
        const truth = r.body.ws as Workspace
        for (const k of ['posts', 'audit', 'team', 'brands'] as const) assert.deepEqual(mine[k], truth[k], k)
        assert.equal(truth.audit.find((e) => e.id === 'au-x')!.actorId, 'rui', 'audit entries carry who made them')

        // Rui's stream never carried Lumen Café.
        await ruiLive.until(4)
        assert.ok(!JSON.stringify(ruiLive.events).includes('lumen-cafe'))
        ruiLive.close()

        // Two-step verification for the owner.
        r = await owner.post('/api/account/mfa/start')
        const secret = r.body.secret as string
        assert.match(r.body.url, /^otpauth:\/\/totp\/Kataru/)
        r = await owner.post('/api/account/mfa/confirm', { code: '000000' })
        assert.equal(r.status, 400)
        r = await owner.post('/api/account/mfa/confirm', { code: codeAt(secret, stepOf(app.clock.now)) })
        assert.equal(r.status, 200)
        const recovery = r.body.codes as string[]
        assert.equal(recovery.length, 10)
        r = await owner.get('/api/workspace')
        assert.equal(r.body.ws.team.find((m: { id: string }) => m.id === 'ana-silva').mfa, true)

        await owner.post('/api/auth/logout')
        live.close()
        assert.equal(owner.cookie, '')
        r = await owner.post('/api/auth/login', { email: 'ana@lumen.pt', password: PASSWORD })
        assert.deepEqual([r.status, r.body.mfa], [200, true])
        r = await owner.get('/api/workspace')
        assert.equal(r.status, 401, 'nothing until the code')
        r = await owner.post('/api/auth/mfa', { code: codeAt(secret, stepOf(app.clock.now)) })
        assert.equal(r.status, 401, 'the code used to turn it on is spent')
        app.clock.now += 30_000
        r = await owner.post('/api/auth/mfa', { code: codeAt(secret, stepOf(app.clock.now)) })
        assert.equal(r.status, 200)
        r = await owner.get('/api/workspace')
        assert.equal(r.status, 200)

        // A recovery code works once.
        const other = new Browser(app.base)
        await other.post('/api/auth/login', { email: 'ana@lumen.pt', password: PASSWORD })
        r = await other.post('/api/auth/mfa', { code: recovery[0] })
        assert.deepEqual([r.status, r.body.usedRecovery, r.body.recoveryLeft], [200, true, 9])
        const third = new Browser(app.base)
        await third.post('/api/auth/login', { email: 'ana@lumen.pt', password: PASSWORD })
        r = await third.post('/api/auth/mfa', { code: recovery[0] })
        assert.equal(r.status, 401)

        // Sessions: see them, end the others.
        r = await owner.get('/api/account')
        assert.ok(r.body.sessions.length >= 2)
        assert.equal(r.body.sessions.filter((s: { current: boolean }) => s.current).length, 1)
        await owner.post('/api/account/sessions/others')
        r = await other.get('/api/workspace')
        assert.equal(r.status, 401)

        // The workspace can require two-step verification.
        r = await owner.post('/api/workspace/actions', { actions: [{ type: 'settings', patch: { requireMfa: true } }] })
        assert.equal(r.status, 200)
        r = await rui.get('/api/workspace')
        assert.deepEqual([r.status, r.body.error], [403, 'mfa_required'])
        r = await rui.get('/api/session')
        assert.equal(r.body.user.mustEnroll, true)
        r = await rui.post('/api/account/mfa/start')
        assert.equal(r.status, 200, 'they can still turn it on')
        await owner.post('/api/workspace/actions', { actions: [{ type: 'settings', patch: { requireMfa: false } }] })

        // Forgotten password: a link by email, every device signed out.
        r = await new Browser(app.base).post('/api/auth/forgot', { email: 'nobody@lumen.pt' })
        assert.equal(r.status, 200, 'same answer for unknown emails')
        const before = app.mails.length
        r = await new Browser(app.base).post('/api/auth/forgot', { email: 'rui@lumen.pt', locale: 'en' })
        assert.equal(app.mails.length, before + 1)
        const resetToken = app.mails.at(-1)!.text.match(/#\/reset\/([\w-]+)/)![1]!
        const fresh = new Browser(app.base)
        r = await fresh.post('/api/auth/reset', { token: resetToken, password: 'a brand new secret' })
        assert.equal(r.status, 200)
        r = await rui.get('/api/workspace')
        assert.equal(r.status, 401, 'old sessions end')
        r = await new Browser(app.base).post('/api/auth/reset', { token: resetToken, password: 'another new secret' })
        assert.equal(r.status, 404)
        r = await new Browser(app.base).post('/api/auth/login', { email: 'rui@lumen.pt', password: 'a brand new secret' })
        assert.equal(r.status, 200)

        // Admins can hand out a reset link when there's no email.
        r = await owner.post('/api/team/rui/reset-link')
        assert.match(r.body.link, /^http:\/\/app\.test\/#\/reset\//)

        // Roles and suspension.
        r = await owner.patch('/api/team/rui', { role: 'manager', brands: 'all' })
        assert.equal(r.status, 200)
        r = await fresh.get('/api/workspace')
        assert.deepEqual(r.body.ws.brands.length, 2, 'a role change shows straight away')
        r = await owner.patch('/api/team/ana-silva', { role: 'editor' })
        assert.equal(r.status, 403, 'the owner stays owner')
        const ruiStream = await fresh.stream()
        await ruiStream.until(1)
        r = await owner.patch('/api/team/rui', { status: 'suspended' })
        assert.equal(r.status, 200)
        await ruiStream.until(10, 1500)
        assert.ok(ruiStream.closed, 'a suspended teammate is disconnected')
        r = await fresh.get('/api/workspace')
        assert.equal(r.status, 401)
        r = await new Browser(app.base).post('/api/auth/login', { email: 'rui@lumen.pt', password: 'a brand new secret' })
        assert.deepEqual([r.status, r.body.error], [403, 'suspended'])

        // Withdraw a pending invitation.
        r = await owner.post('/api/team/invite', { name: 'Eva', email: 'eva@lumen.pt', role: 'analyst' })
        const evaToken = (r.body.link as string).split('/#/invite/')[1]!
        r = await owner.post('/api/team/eva/resend', { locale: 'en' })
        assert.equal(r.status, 200)
        r = await new Browser(app.base).get(`/api/auth/link/invite/${evaToken}`)
        assert.equal(r.status, 404, 'resending replaces the old link')
        r = await owner.del('/api/team/eva')
        assert.equal(r.status, 200)
        r = await owner.get('/api/team')
        assert.ok(!r.body.members.some((m: { memberId: string }) => m.memberId === 'eva'))
        r = await owner.get('/api/workspace')
        assert.equal(r.body.ws.audit[0].action.type, 'revokedInvite')

        // The publishing API works with the session too.
        r = await owner.get('/api/accounts')
        assert.deepEqual([r.status, r.body], [200, []])
        r = await new Browser(app.base).get('/api/accounts')
        assert.equal(r.status, 401)

        // A restart replays everything.
        const { version: v1, ws: w1 } = app.kataru.hub.view('ana-silva')
        await app.close()
        const again = await boot({ db: await openDb(url), url })
        try {
          const { version: v2, ws: w2 } = again.kataru.hub.view('ana-silva')
          assert.equal(v2, v1)
          assert.deepEqual(JSON.parse(JSON.stringify({ ...w2, now: '' })), JSON.parse(JSON.stringify({ ...w1, now: '' })))
          const b = new Browser(again.base)
          b.cookie = owner.cookie
          r = await b.get('/api/workspace')
          assert.equal(r.status, 200, 'sessions survive a restart')
        } finally {
          await again.close()
        }
      } finally {
        await app.close().catch(() => undefined)
      }
    })

    test('sign-in attempts are limited', async () => {
      const { url, db } = await freshDb(kind)
      const app = await boot({ db, url })
      try {
        const b = new Browser(app.base)
        await b.post('/api/setup', { code: 'ABCDE-12345', company: 'C', brands: ['B'], name: 'Owner', email: 'o@c.pt', password: PASSWORD })
        const x = new Browser(app.base)
        for (let i = 0; i < 10; i++) assert.equal((await x.post('/api/auth/login', { email: 'o@c.pt', password: 'nope nope nope' })).status, 401)
        const r = await x.post('/api/auth/login', { email: 'o@c.pt', password: PASSWORD })
        assert.equal(r.status, 429)
        assert.ok(r.headers.get('retry-after'))
        app.clock.now += 16 * 60_000
        assert.equal((await x.post('/api/auth/login', { email: 'o@c.pt', password: PASSWORD })).status, 200)
      } finally {
        await app.close()
      }
    })

    test('two processes on one database stay in step', async () => {
      const { url, db } = await freshDb(kind)
      const a = await boot({ db, url })
      const b = await boot({ db: await openDb(url), url })
      try {
        const ana = new Browser(a.base)
        await ana.post('/api/setup', { code: 'ABCDE-12345', company: 'C', brands: ['B'], name: 'Ana', email: 'ana@c.pt', password: PASSWORD })
        const viaB = new Browser(b.base)
        viaB.cookie = ana.cookie
        // B learns about the setup from the database.
        let r = await viaB.get('/api/workspace')
        assert.equal(r.status, 200, JSON.stringify(r.body))
        const live = await viaB.stream()
        await live.until(1)
        const writes = await Promise.all([
          ana.post('/api/workspace/actions', { actions: [{ type: 'savePost', post: post('a1', 'b', 'ana') }] }),
          viaB.post('/api/workspace/actions', { actions: [{ type: 'savePost', post: post('b1', 'b', 'ana') }] }),
          ana.post('/api/workspace/actions', { actions: [{ type: 'savePost', post: post('a2', 'b', 'ana') }] }),
        ])
        assert.deepEqual(writes.map((w) => w.status), [200, 200, 200])
        assert.equal(new Set(writes.map((w) => w.body.to)).size, 3, 'each change got its own number')
        await b.kataru.hub.sync()
        await a.kataru.hub.sync()
        assert.deepEqual(a.kataru.hub.view('ana').ws.posts.map((p) => p.id).sort(), ['a1', 'a2', 'b1'])
        assert.deepEqual(b.kataru.hub.view('ana').ws.posts.map((p) => p.id).sort(), ['a1', 'a2', 'b1'])
        // B's subscriber hears A's changes within its watch interval.
        await live.until(4, 4000)
        assert.ok(live.events.length >= 3)
        live.close()
      } finally {
        await a.close()
        await b.close()
      }
    })

    test('single sign-on links accounts and lets allowed domains join', async () => {
      const idp = await fakeIdp()
      const { url, db } = await freshDb(kind)
      const app = await boot({ db, url, env: { KATARU_SSO_OIDC_ISSUER: idp.issuer, KATARU_SSO_OIDC_CLIENT_ID: 'kataru', KATARU_SSO_OIDC_CLIENT_SECRET: 'shh', KATARU_SSO_OIDC_NAME: 'Okta', KATARU_SSO_DOMAINS: 'lumen.pt', KATARU_SSO_ROLE: 'editor' } })
      try {
        const owner = new Browser(app.base)
        await owner.post('/api/setup', { code: 'ABCDE-12345', company: 'Lumen', brands: ['Café'], name: 'Ana', email: 'ana@lumen.pt', password: PASSWORD })
        let r = await owner.get('/api/session')
        assert.deepEqual(r.body.sso, [{ id: 'oidc', name: 'Okta' }])

        const flow = async (b: Browser, who: typeof idp.next) => {
          idp.next = who
          const start = await b.get('/api/auth/sso/oidc/start')
          assert.equal(start.status, 302)
          const loc = start.headers.get('location')!
          assert.ok(loc.startsWith(`${idp.issuer}/authorize?`))
          assert.equal(new URL(loc).searchParams.get('code_challenge_method'), 'S256')
          const { code, state } = idp.approve(loc)
          const cb = await b.get(`/api/auth/sso/oidc/callback?code=${code}&state=${state}`)
          assert.equal(cb.status, 302)
          return cb.headers.get('location')!
        }

        // Matches the owner by email, then by the linked identity.
        const sso = new Browser(app.base)
        assert.equal(await flow(sso, { sub: 'okta-ana', email: 'ana@lumen.pt', name: 'Ana' }), 'http://app.test/#/overview')
        r = await sso.get('/api/session')
        assert.deepEqual([r.body.user.memberId, r.body.user.method], ['ana', 'sso:oidc'])
        const again = new Browser(app.base)
        assert.equal(await flow(again, { sub: 'okta-ana', email: 'renamed@elsewhere.com', name: 'Ana' }), 'http://app.test/#/overview')

        // Someone from lumen.pt joins with the default role; others don't.
        const newcomer = new Browser(app.base)
        assert.equal(await flow(newcomer, { sub: 'okta-joao', email: 'joao@lumen.pt', name: 'João Reis' }), 'http://app.test/#/overview')
        r = await newcomer.get('/api/workspace')
        const joao = (r.body.ws as Workspace).team.find((m) => m.email === 'joao@lumen.pt')!
        assert.deepEqual([joao.role, joao.status], ['editor', 'active'])
        assert.equal(await flow(new Browser(app.base), { sub: 'x', email: 'eve@evil.com', name: 'Eve' }), 'http://app.test/#/signin?sso=unknown')
        assert.equal(await flow(new Browser(app.base), { sub: 'y', email: 'zed@lumen.pt', name: 'Zed', email_verified: false }), 'http://app.test/#/signin?sso=email')

        // A replayed state is refused.
        const b = new Browser(app.base)
        const start = await b.get('/api/auth/sso/oidc/start')
        const { code, state } = idp.approve(start.headers.get('location')!)
        await b.get(`/api/auth/sso/oidc/callback?code=${code}&state=${state}`)
        const replay = await new Browser(app.base).get(`/api/auth/sso/oidc/callback?code=${code}&state=${state}`)
        assert.equal(replay.headers.get('location'), 'http://app.test/#/signin?sso=expired')
      } finally {
        await app.close()
        await idp.close()
      }
    })

    test('starting from the sample workspace moves it to today and makes you its owner', async () => {
      const { url, db } = await freshDb(kind)
      const clock = { now: Date.parse('2027-03-10T09:00:00Z') }
      const app = await boot({ db, url, clock })
      try {
        const sample = {
          now: '2026-10-30T14:15:00Z',
          team: [
            { id: 'camila', name: 'Camila Ortiz', role: 'owner', brands: 'all', email: 'camila@northlight.studio', status: 'active', mfa: true, joinedAt: '2025-02-22T00:00:00Z' },
            { id: 'malik', name: 'Malik', role: 'admin', brands: 'all', email: 'malik@northlight.studio', status: 'active', mfa: true, joinedAt: '2026-04-13T00:00:00Z' },
          ],
          brands: [{ id: 'eo', name: 'Ember & Oak', initials: 'EO', tone: 'coral', handle: 'e', industry: '', cover: 'c' }],
          posts: [post('p1', 'eo', 'camila')],
          campaigns: [{ id: 'c1', brandId: 'eo', name: 'Autumn', start: '2026-10-20', end: '2026-11-19' }],
          settings: { name: 'Northlight', currency: 'USD' },
          audit: [],
        }
        const b = new Browser(app.base)
        const r = await b.post('/api/setup', { code: 'ABCDE-12345', company: 'Lumen', name: 'Ana', email: 'ana@lumen.pt', password: PASSWORD, sample })
        assert.equal(r.status, 200, JSON.stringify(r.body))
        const ws = (await b.get('/api/workspace')).body.ws as Workspace
        assert.equal(ws.currentUserId, 'camila')
        assert.deepEqual([ws.team[0]!.name, ws.team[0]!.email, ws.settings.name], ['Ana', 'ana@lumen.pt', 'Lumen'])
        // 131 days later, to the day.
        assert.equal(ws.posts[0]!.scheduledAt, '2027-03-31T10:00:00.000Z')
        assert.equal(ws.campaigns[0]!.start, '2027-02-28')
        // The sample's other people have no accounts.
        assert.equal((await new Browser(app.base).post('/api/auth/login', { email: 'malik@northlight.studio', password: PASSWORD })).status, 401)
      } finally {
        await app.close()
      }
    })
  })
}
