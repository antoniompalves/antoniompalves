import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { cleanPostUrl, isPlanner, plannerView, toPostByHand } from '../../src/data/planner.ts'
import { reduce } from '../../src/data/reducer.ts'
import type { Post, Workspace } from '../../src/data/types.ts'
import { Browser, boot, cleanup, freshDb } from './harness.ts'

after(cleanup)

const PASSWORD = 'correct horse battery'
const post = (id: string, extra: Partial<Post> = {}): Post =>
  ({ id, brandId: 'cafe', authorId: 'ana', status: 'draft', networks: ['instagram'], text: `Post ${id}`, media: [], scheduledAt: '2026-12-20T10:00:00.000Z', createdAt: '2026-11-01T10:00:00.000Z', reviews: [], ...extra }) as Post

async function setUp(env?: Record<string, string>) {
  const { url, db } = await freshDb('sqlite')
  const app = await boot({ db, url, env })
  const ana = new Browser(app.base)
  const r = await ana.post('/api/setup', { code: 'ABCDE-12345', company: 'Lumen', brands: ['Cafe'], name: 'Ana', email: 'ana@lumen.pt', password: PASSWORD })
  assert.equal(r.status, 200, JSON.stringify(r.body))
  const act = (...actions: unknown[]) => ana.post('/api/workspace/actions', { actions })
  const ws = async () => (await ana.get('/api/workspace')).body.ws as Workspace
  return { app, ana, act, ws }
}

test('a new company starts in planner mode, and can switch', async () => {
  const { app, act, ws } = await setUp()
  try {
    let shared = await ws()
    assert.equal(shared.settings.mode, 'planner')
    assert.equal(shared.settings.modeLocked, undefined)
    assert.equal((await act({ type: 'settings', patch: { modeLocked: true } })).status, 403, 'only the server locks it')
    assert.equal((await act({ type: 'settings', patch: { mode: 'connected' } })).status, 200)
    shared = await ws()
    assert.equal(shared.settings.mode, 'connected')
  } finally {
    await app.close()
  }
})

test('KATARU_MODE=planner: nothing connects or publishes, and the mode stays', async () => {
  const { app, ana, act, ws } = await setUp({ KATARU_MODE: 'planner' })
  try {
    const health = await ana.get('/health')
    assert.equal(health.body.planner, true)
    for (const [method, path] of [
      ['GET', '/api/accounts'],
      ['POST', '/api/connect/meta'],
      ['POST', '/api/posts'],
      ['GET', '/api/jobs'],
    ] as const) {
      const r = await ana.req(method, path, method === 'POST' ? {} : undefined)
      assert.deepEqual([r.status, r.body.error], [404, 'planner_mode'], `${method} ${path}`)
    }
    assert.equal((await ana.get('/auth/meta/callback?code=x&state=y')).status, 404)

    // The app sees planner mode, locked; switching it off is refused.
    let shared = await ws()
    assert.deepEqual([shared.settings.mode, shared.settings.modeLocked], ['planner', true])
    let r = await act({ type: 'settings', patch: { mode: 'connected' } })
    assert.deepEqual([r.status, r.body.error], [403, 'forbidden'])
    assert.equal((await act({ type: 'settings', patch: { utm: true } })).status, 200, 'other settings change as usual')

    // A post goes out by hand: "Mark as published", with the link to it.
    assert.equal((await act({ type: 'savePost', post: post('p1', { status: 'scheduled' }) })).status, 200)
    r = await act({ type: 'publish', id: 'p1', at: '2026-12-20T10:03:00.000Z', url: 'https://www.instagram.com/p/abc/' })
    assert.equal(r.status, 200)
    shared = await ws()
    const p1 = shared.posts.find((p) => p.id === 'p1')!
    assert.deepEqual([p1.status, p1.publishedUrl], ['published', 'https://www.instagram.com/p/abc/'])

    // Profiles by hand.
    const profile = { id: 'ch-cafe-instagram', brandId: 'cafe', network: 'instagram', handle: '@cafe', followers: 0, status: 'connected', tokenExpiresAt: '2026-11-01T00:00:00Z', connectedById: 'ana', connectedAt: '2026-11-01T00:00:00Z', lastSyncAt: '2026-11-01T00:00:00Z', manual: true, url: 'https://instagram.com/cafe' }
    assert.equal((await act({ type: 'saveChannel', channel: profile })).status, 200)
    assert.equal((await act({ type: 'removeChannel', id: profile.id })).status, 200)
    assert.equal((await ws()).channels.length, 0)

    // Photos: only the light copy, whatever the upload asks for.
    const up = await fetch(`${app.base}/api/media`, { method: 'POST', headers: { cookie: ana.cookie, 'x-kataru': '1', 'content-type': 'image/webp' }, body: new Uint8Array(2048) })
    assert.equal(up.status, 201)
  } finally {
    await app.close()
  }
})

test('planner view, posts to post by hand, links', () => {
  const ws = {
    settings: { mode: 'planner' },
    channels: [{ id: 'c1', status: 'disconnected', paused: true }],
    posts: [post('late', { status: 'failed', failure: { network: 'instagram', code: 'disconnected' }, scheduledAt: '2026-11-10T09:00:00Z' }), post('soon', { status: 'scheduled', scheduledAt: '2026-11-10T20:00:00Z' }), post('later', { status: 'scheduled', scheduledAt: '2026-11-13T09:00:00Z' })],
    notices: [{ id: 'n', event: { type: 'disconnected' } }, { id: 'm', event: { type: 'waiting', count: 1 } }],
  } as unknown as Workspace
  assert.equal(isPlanner(ws), true)
  const v = plannerView(ws)
  assert.equal(v.channels[0]!.status, 'connected')
  assert.equal(v.channels[0]!.paused, undefined)
  assert.deepEqual([v.posts[0]!.status, v.posts[0]!.failure], ['scheduled', undefined])
  assert.deepEqual(v.notices.map((n) => n.id), ['m'])
  assert.deepEqual(toPostByHand(v, Date.parse('2026-11-10T10:00:00Z')).map((p) => p.id), ['late', 'soon'])
  const connected = { ...ws, settings: { mode: 'connected' } } as unknown as Workspace
  assert.equal(plannerView(connected), connected, 'connected mode is left alone')

  assert.equal(cleanPostUrl('instagram.com/p/x'), 'https://instagram.com/p/x')
  assert.equal(cleanPostUrl('  '), null)
  assert.equal(cleanPostUrl('not a link'), null)
  assert.equal(cleanPostUrl('javascript:alert(1)'), null)

  const after = reduce({ ...ws, posts: [post('p', { status: 'scheduled' })] } as Workspace, { type: 'publish', id: 'p', at: '2026-11-10T10:00:00Z', url: 'https://x.test/1' })
  assert.equal(after.posts[0]!.publishedUrl, 'https://x.test/1')
})
