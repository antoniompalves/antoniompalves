import assert from 'node:assert/strict'
import { join } from 'node:path'
import { after, test } from 'node:test'
import type { Post, Workspace } from '../../src/data/types.ts'
import { keyFrom } from '../crypto.ts'
import { MediaLibrary } from '../media.ts'
import { Store } from '../store.ts'
import { Browser, boot, cleanup, freshDb, tmp } from './harness.ts'

after(cleanup)

const DAY = 86_400_000
const post = (id: string, at: string, extra: Partial<Post> = {}): Post => ({ id, brandId: 'cafe', authorId: 'ana', status: 'published', networks: ['instagram'], text: `Post ${id}`, media: [], scheduledAt: at, createdAt: at, reviews: [], ...extra }) as Post

test('old items move to the archive and come back; backups restore', async () => {
  const { url, db } = await freshDb('sqlite')
  const clock = { now: Date.parse('2026-11-02T10:00:00Z') }
  const app = await boot({ db, url, clock })
  try {
    const ana = new Browser(app.base)
    await ana.post('/api/setup', { code: 'ABCDE-12345', company: 'Lumen', brands: ['Cafe'], name: 'Ana', email: 'ana@lumen.pt', password: 'correct horse battery' })
    const act = (...actions: unknown[]) => ana.post('/api/workspace/actions', { actions })
    await act(
      { type: 'savePost', post: post('old', '2025-06-01T10:00:00.000Z') },
      { type: 'savePost', post: post('old-evergreen', '2025-06-02T10:00:00.000Z', { evergreen: { variations: [] } }) },
      { type: 'savePost', post: post('recent', '2026-10-01T10:00:00.000Z') },
      { type: 'savePost', post: post('draft', '2025-01-01T10:00:00.000Z', { status: 'draft' }) },
    )

    // A backup before anything changes.
    let r = await ana.post('/api/backups')
    assert.equal(r.status, 200)
    const backupId = r.body.id as string

    // The archive: published more than a year ago, not evergreen, not drafts.
    r = await ana.post('/api/archive/run')
    assert.deepEqual(r.body, { moved: 1 })
    let ws = (await ana.get('/api/workspace')).body.ws as Workspace
    assert.deepEqual(ws.posts.map((p) => p.id).sort(), ['draft', 'old-evergreen', 'recent'])
    r = await ana.get('/api/archive?lists=posts&q=post%20old')
    assert.deepEqual([r.body.total, r.body.items[0].id], [1, 'old'])
    r = await ana.get('/api/archive/posts/old')
    assert.equal(r.body.item.text, 'Post old')
    r = await ana.get('/api/data')
    assert.deepEqual([r.body.archive.posts.count, r.body.archiveDays, r.body.backups.length, r.body.canRestore], [1, 365, 1, true])

    // A full export carries the archive too.
    const full = (await fetch(`${app.base}/api/export`, { headers: { cookie: ana.cookie } }).then((x) => x.json())) as { workspace: Workspace; archive: { item: { id: string } }[] }
    assert.deepEqual([full.workspace.posts.length, full.archive.length, full.archive[0].item.id], [3, 1, 'old'])

    // Back from the archive.
    r = await ana.post('/api/archive/posts/old/restore')
    assert.equal(r.status, 200)
    ws = (await ana.get('/api/workspace')).body.ws as Workspace
    assert.ok(ws.posts.some((p) => p.id === 'old'))
    assert.equal((await ana.get('/api/archive')).body.total, 0)

    // Never archive, then a shorter period.
    await act({ type: 'settings', patch: { archiveDays: 0 } })
    assert.deepEqual((await ana.post('/api/archive/run')).body, { moved: 0 })
    await act({ type: 'settings', patch: { archiveDays: 30 } })
    assert.deepEqual((await ana.post('/api/archive/run')).body, { moved: 2 })

    // Restore the backup: the posts as they were, a copy of now kept first.
    r = await ana.post(`/api/backups/${backupId}/restore`)
    assert.equal(r.status, 200)
    ws = (await ana.get('/api/workspace')).body.ws as Workspace
    assert.deepEqual(ws.posts.map((p) => p.id).sort(), ['draft', 'old', 'old-evergreen', 'recent'])
    const kinds = (await ana.get('/api/data')).body.backups.map((b: { kind: string }) => b.kind)
    assert.ok(kinds.includes('before-restore'))
    const file = await fetch(`${app.base}/api/backups/${backupId}`, { headers: { cookie: ana.cookie } })
    assert.match(file.headers.get('content-disposition') ?? '', /attachment/)
    const json = (await file.json()) as { workspace: Workspace }
    assert.equal(json.workspace.posts.length, 4)
    r = await ana.post('/api/backups/restore', { backup: { nope: true } })
    assert.equal(r.status, 400)
    r = await ana.post('/api/backups/restore', { backup: json })
    assert.equal(r.status, 200)

    // Daily: once a day across processes.
    clock.now += DAY
    await new Promise((res) => setTimeout(res, 50))
  } finally {
    await app.close()
  }
})

test('the platform keeps light previews; originals go once their posts are out', async () => {
  const dir = await tmp()
  const store = await new Store(dir, keyFrom('k'.repeat(40))).load()
  const lib = new MediaLibrary(dir, store, 'https://k.test', 50 * 1024 * 1024, 30)
  const t0 = Date.parse('2026-11-02T10:00:00Z')
  await assert.rejects(lib.save(Buffer.alloc(400 * 1024), 'image/webp', 'preview', t0), /at most 300 KB/)
  await assert.rejects(lib.save(Buffer.alloc(10), 'video/mp4', 'preview', t0), /JPEG, PNG or WebP/)
  const preview = await lib.save(Buffer.alloc(90 * 1024), 'image/webp', 'preview', t0)
  const reel = await lib.save(Buffer.alloc(4 * 1024 * 1024), 'video/mp4', 'original', t0)
  const loose = await lib.save(Buffer.alloc(2 * 1024 * 1024), 'image/jpeg', 'original', t0)
  assert.deepEqual(lib.stats(), { previews: { count: 1, bytes: 90 * 1024 }, originals: { count: 2, bytes: 6 * 1024 * 1024 } })
  // The reel waits for a scheduled post past its 30 days.
  store.data.jobs.push({
    id: 'j1',
    batchId: 'b1',
    accountId: 'a',
    connectionId: 'c',
    network: 'instagram',
    post: { text: '', media: [{ url: reel.url, kind: 'video' }] },
    publishAt: t0 + 40 * DAY,
    status: 'scheduled',
    attempts: 0,
    createdAt: t0,
    updatedAt: t0,
  } as never)
  let gone = await lib.sweep(t0 + 31 * DAY)
  assert.deepEqual(
    gone.map((m) => m.id),
    [loose.id],
    'unscheduled originals go after 30 days',
  )
  // Published: two days later it goes too; the preview stays.
  Object.assign(store.data.jobs[0]!, { status: 'published', updatedAt: t0 + 40 * DAY })
  assert.deepEqual(await lib.sweep(t0 + 41 * DAY), [])
  gone = await lib.sweep(t0 + 42 * DAY + 1)
  assert.deepEqual(
    gone.map((m) => m.id),
    [reel.id],
  )
  assert.deepEqual(
    store.data.media.map((m) => m.id),
    [preview.id],
  )
  void join
})
