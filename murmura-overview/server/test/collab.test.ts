import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import type { Post, Workspace } from '../../src/data/types.ts'
import { Browser, boot, cleanup, freshDb } from './harness.ts'

after(cleanup)

const PASSWORD = 'correct horse battery'
const post = (id: string, extra: Partial<Post> = {}): Post =>
  ({ id, brandId: 'cafe', authorId: 'ana', status: 'draft', networks: ['instagram'], text: `Post ${id}`, media: [], scheduledAt: '2026-12-20T10:00:00.000Z', createdAt: '2026-11-01T10:00:00.000Z', reviews: [], ...extra }) as Post

test('the client signs off, ideas, notes and presence', async () => {
  const { url, db } = await freshDb('sqlite')
  const app = await boot({ db, url })
  try {
    const ana = new Browser(app.base)
    await ana.post('/api/setup', { code: 'ABCDE-12345', company: 'Lumen', brands: ['Cafe'], name: 'Ana', email: 'ana@lumen.pt', password: PASSWORD })
    let r = await ana.post('/api/team/invite', { name: 'Kim Client', email: 'kim@client.pt', role: 'client', brands: ['cafe'] })
    const token = (r.body.link as string).split('/#/invite/')[1]
    const kim = new Browser(app.base)
    r = await kim.post('/api/auth/accept', { token, password: 'client side secret' })
    assert.equal(r.status, 200)
    const ws = (await ana.get('/api/workspace')).body.ws as Workspace
    const act = (b: Browser, ...actions: unknown[]) => b.post('/api/workspace/actions', { actions })

    // The brand asks for its client's sign-off.
    r = await act(ana, { type: 'saveBrand', brand: { ...ws.brands[0], clientApproval: true } })
    assert.equal(r.status, 200)
    const sent = post('p1', { status: 'awaiting_approval', stage: 'client', reviews: [{ by: 'ana', at: '2026-11-02T10:00:00Z', decision: 'submitted' }] })
    assert.equal((await act(ana, { type: 'savePost', post: sent })).status, 200)

    // Nobody but the client can send it out.
    r = await act(ana, { type: 'savePost', post: { ...sent, status: 'scheduled', reviews: [...sent.reviews, { by: 'ana', at: '2026-11-02T10:05:00Z', decision: 'approved' }] } })
    assert.deepEqual([r.status, r.body.error], [403, 'forbidden'])
    assert.equal((await act(ana, { type: 'publish', id: 'p1', at: '2026-11-02T10:05:00Z' })).status, 403)
    assert.equal((await act(ana, { type: 'savePost', post: post('p2', { status: 'scheduled' }) })).status, 403, 'not even a new post')
    r = await act(kim, { type: 'savePost', post: { ...sent, status: 'scheduled', stage: undefined, reviews: [...sent.reviews, { by: 'kim', at: '2026-11-02T11:00:00Z', decision: 'approved' }] } })
    assert.equal(r.status, 200, JSON.stringify(r.body))
    // Once signed off, moving it is fine; changing its text needs a new round.
    assert.equal((await act(ana, { type: 'move', id: 'p1', to: '2026-12-21T10:00:00.000Z' })).status, 200)
    const now = ((await ana.get('/api/workspace')).body.ws as Workspace).posts.find((p) => p.id === 'p1')!
    assert.equal((await act(ana, { type: 'savePost', post: { ...now, text: 'Edited', reviews: [...now.reviews, { by: 'ana', at: '2026-11-02T12:00:00Z', decision: 'submitted' }] } })).status, 403)

    // Notes carry who wrote them, whatever the browser says; versions are kept.
    r = await act(kim, { type: 'commentPost', postId: 'p1', comment: { id: 'c1', by: 'ana', at: '2026-11-02T12:00:00Z', text: 'Love it @Ana', mentions: ['ana'] } })
    assert.equal(r.status, 200)
    assert.equal((await act(kim, { type: 'deleteComment', postId: 'p1', id: 'c1' })).status, 200)
    await act(ana, { type: 'commentPost', postId: 'p1', comment: { id: 'c2', by: 'ana', at: '2026-11-02T12:00:00Z', text: 'Mine', mentions: [] } })
    assert.equal((await act(kim, { type: 'deleteComment', postId: 'p1', id: 'c2' })).status, 403, "can't delete another's note")
    await act(ana, { type: 'savePost', post: post('p3', { text: 'one' }) })
    await act(ana, { type: 'savePost', post: post('p3', { text: 'two' }), by: 'kim', at: '2026-11-02T13:00:00Z' })
    let shared = (await ana.get('/api/workspace')).body.ws as Workspace
    assert.deepEqual(
      shared.posts.find((p) => p.id === 'p3')!.history!.map((h) => [h.by, h.text]),
      [['ana', 'one']],
      'the version is stamped with who saved',
    )

    // Ideas: anyone suggests in their own name; answering someone else's needs the content team.
    const idea = { id: 'i1', brandId: 'cafe', by: 'kim', at: '2026-11-02T09:00:00Z', title: 'Winter menu', text: 'Show the new drinks', status: 'new' }
    assert.equal((await act(kim, { type: 'saveIdea', idea })).status, 200)
    assert.equal((await act(kim, { type: 'saveIdea', idea: { ...idea, id: 'i2', by: 'ana' } })).status, 403)
    assert.equal((await act(ana, { type: 'saveIdea', idea: { ...idea, status: 'accepted', postId: 'p3' } })).status, 200)
    assert.equal((await act(kim, { type: 'saveIdea', idea: { ...idea, id: 'i3' } })).status, 200)
    assert.equal((await act(ana, { type: 'deleteIdea', id: 'i3' })).status, 200, 'owners have post.delete')

    // Read, per person.
    await act(ana, { type: 'notify', notices: [{ id: 'n1', at: '2026-11-02T09:00:00Z', href: '#/', read: false, event: { type: 'waiting', count: 1 } }] })
    await act(kim, { type: 'readNotices', ids: ['n1'], by: 'ana' })
    shared = (await ana.get('/api/workspace')).body.ws as Workspace
    const n1 = shared.notices.find((n) => n.id === 'n1')!
    assert.deepEqual([n1.read, n1.readBy], [false, ['kim']])

    // Key dates and themes need the calendar.
    assert.equal((await act(kim, { type: 'saveKeyDate', date: { id: 'k1', date: '2026-12-01', yearly: false, name: 'X', brandId: null } })).status, 403)
    assert.equal((await act(ana, { type: 'saveKeyDate', date: { id: 'k1', date: '2026-12-01', yearly: false, name: 'X', brandId: null } })).status, 200)

    // Presence: who is where, live.
    const live = await kim.stream()
    await live.until(2)
    assert.ok(live.events.some((e) => e.event === 'presence'))
    await ana.post('/api/presence', { where: '#/compose/p1' })
    await live.until(3)
    const last = live.events.filter((e) => e.event === 'presence').at(-1)!.data as { memberId: string; where: string }[]
    assert.ok(last.some((p) => p.memberId === 'ana' && p.where === '#/compose/p1'))
    live.close()
  } finally {
    await app.close()
  }
})
