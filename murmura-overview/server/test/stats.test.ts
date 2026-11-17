import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { parsePostLink, statsDue } from '../../src/data/postLinks.ts'
import type { Post, Workspace } from '../../src/data/types.ts'
import type { Connection } from '../providers/types.ts'
import { readStats } from '../stats/read.ts'
import type { ReadContext } from '../stats/read.ts'
import { Browser, boot, cleanup, freshDb } from './harness.ts'

after(cleanup)

const HOUR = 3_600_000
const DAY = 24 * HOUR

test('post links', () => {
  const p = (u: string) => {
    const r = parsePostLink(u)
    return r && [r.network, r.id, r.handle ?? null]
  }
  assert.deepEqual(p('https://www.instagram.com/p/DAbc123xY/?igsh=xx'), ['instagram', 'DAbc123xY', null])
  assert.deepEqual(p('instagram.com/reel/C9zz_1/'), ['instagram', 'C9zz_1', null])
  assert.deepEqual(p('https://www.instagram.com/cafe.lumen/p/QQ1/'), ['instagram', 'QQ1', 'cafe.lumen'])
  assert.deepEqual(p('https://youtu.be/dQw4w9WgXcQ?si=1'), ['youtube', 'dQw4w9WgXcQ', null])
  assert.deepEqual(p('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3'), ['youtube', 'dQw4w9WgXcQ', null])
  assert.deepEqual(p('https://youtube.com/shorts/abcDEF12345'), ['youtube', 'abcDEF12345', null])
  assert.deepEqual(p('https://www.tiktok.com/@lumen/video/7300000000000000001'), ['tiktok', '7300000000000000001', 'lumen'])
  assert.deepEqual(p('https://www.threads.com/@lumen/post/C1abc'), ['threads', 'C1abc', 'lumen'])
  assert.deepEqual(p('https://www.facebook.com/lumencafe/posts/1234567890'), ['facebook', '1234567890', 'lumencafe'])
  assert.deepEqual(p('https://www.facebook.com/permalink.php?story_fbid=987&id=111'), ['facebook', '987', '111'])
  assert.deepEqual(p('https://www.facebook.com/reel/555'), ['facebook', '555', null])
  assert.deepEqual(p('https://www.linkedin.com/feed/update/urn:li:activity:7100000000000000000/'), ['linkedin', 'urn:li:activity:7100000000000000000', null])
  assert.deepEqual(p('https://x.com/lumen/status/1800000000000000000'), ['x', '1800000000000000000', 'lumen'])
  assert.deepEqual(p('https://pinterest.com/pin/12345/'), ['pinterest', '12345', null])
  assert.equal(p('https://example.com/p/abc'), null)
  assert.equal(p('https://www.instagram.com/lumen/'), null, 'a profile is not a post')
  assert.equal(p('javascript:alert(1)'), null)
})

test('how often numbers are read', () => {
  const t0 = Date.parse('2026-11-01T10:00:00Z')
  assert.equal(statsDue(t0, undefined, t0 + 5 * 60_000), true, 'first read straight away')
  assert.equal(statsDue(t0, t0 + 10 * 60_000, t0 + 40 * 60_000), false)
  assert.equal(statsDue(t0, t0 + 10 * 60_000, t0 + 70 * 60_000), true, 'hourly at first')
  assert.equal(statsDue(t0, t0 + 3 * DAY, t0 + 3 * DAY + 5 * HOUR), false, 'daily after two days')
  assert.equal(statsDue(t0, t0 + 3 * DAY, t0 + 4 * DAY), true)
  assert.equal(statsDue(t0, t0 + 29 * DAY, t0 + 31 * DAY), false, 'never after 30 days')
  assert.equal(statsDue(t0 + DAY, undefined, t0), false, 'not before it goes out')
})

/** A pretend Graph/TikTok/YouTube API: answers by URL, records what was asked. */
function fakeApis() {
  const calls: string[] = []
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })
  const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    calls.push(`${init?.method ?? 'GET'} ${url.hostname}${url.pathname}`)
    const p = url.pathname
    if (url.hostname === 'graph.facebook.com') {
      if (p.endsWith('/ig1/media')) return json({ data: [{ id: 'm9', shortcode: 'OTHER' }, { id: 'm1', shortcode: 'IGCODE' }] })
      if (p.endsWith('/m1/insights')) return json({ data: ['views', 'reach', 'likes', 'comments', 'shares', 'saved'].map((name, i) => ({ name, period: 'lifetime', values: [{ value: [5000, 3200, 410, 22, 15, 37][i] }] })) })
      if (p.endsWith('/ig1') && url.searchParams.get('fields')?.startsWith('business_discovery')) return json({ business_discovery: { media: { data: [{ id: 'c1', shortcode: 'CREATOR1', like_count: 900, comments_count: 40 }] } } })
      if (p.endsWith('/page1_777')) return json({ id: 'page1_777', reactions: { summary: { total_count: 88 } }, comments: { summary: { total_count: 9 } }, shares: { count: 4 } })
      if (p.endsWith('/page1_777/insights')) return json({ data: [{ name: 'post_media_view', values: [{ value: 2100 }] }, { name: 'post_total_media_view_unique', values: [{ value: 1500 }] }] })
      if (p.endsWith('/expired/insights')) return json({ error: { code: 190, message: 'Session has expired' } }, 400)
      return json({ error: { code: 100, message: 'Unsupported get request' } }, 400)
    }
    if (url.hostname === 'graph.threads.com') {
      if (p.endsWith('/th1/threads')) return json({ data: [{ id: 't1', shortcode: 'THCODE' }] })
      if (p.endsWith('/t1/insights')) return json({ data: ['views', 'likes', 'replies', 'reposts', 'quotes', 'shares'].map((name, i) => ({ name, values: [{ value: [700, 50, 6, 3, 1, 2][i] }] })) })
    }
    if (url.hostname === 'open.tiktokapis.com' && p === '/v2/video/query/') {
      const ids = JSON.parse(String(init?.body)).filters.video_ids as string[]
      return json({ data: { videos: ids[0] === '7300' ? [{ id: '7300', view_count: 12000, like_count: 800, comment_count: 30, share_count: 25 }] : [] }, error: { code: 'ok' } })
    }
    if (url.hostname === 'www.googleapis.com' && p === '/youtube/v3/videos') return json({ items: url.searchParams.get('id') === 'dQw4w9WgXcQ' ? [{ statistics: { viewCount: '1500000', likeCount: '20000', commentCount: '900' } }] : [] })
    return json({ error: 'not_found' }, 404)
  }) as typeof fetch
  return { fetch: fakeFetch, calls }
}

const connections: Connection[] = [
  {
    id: 'cm',
    provider: 'meta',
    subject: 'u',
    label: 'Lumen',
    status: 'ok',
    createdAt: 0,
    updatedAt: 0,
    tokens: { accessToken: 'user-token', scopes: [], issuedAt: 0 },
    accounts: [
      { id: 'instagram:ig1', network: 'instagram', remoteId: 'ig1', name: 'Lumen', token: 'page-token', meta: { pageId: 'page1' } },
      { id: 'facebook:page1', network: 'facebook', remoteId: 'page1', name: 'Lumen', token: 'page-token' },
    ],
  },
  { id: 'ct', provider: 'threads', subject: 'th1', label: 'Lumen', status: 'ok', createdAt: 0, updatedAt: 0, tokens: { accessToken: 'th-token', scopes: [], issuedAt: 0 }, accounts: [{ id: 'threads:th1', network: 'threads', remoteId: 'th1', name: 'Lumen' }] },
  { id: 'ck', provider: 'tiktok', subject: 'tk', label: 'Lumen', status: 'ok', createdAt: 0, updatedAt: 0, tokens: { accessToken: 'tk-token', scopes: [], issuedAt: 0 }, accounts: [{ id: 'tiktok:tk', network: 'tiktok', remoteId: 'tk', name: 'Lumen' }] },
]

test('reading each network', async () => {
  const { fetch, calls } = fakeApis()
  const ctx = (extra: Partial<ReadContext> = {}): ReadContext => ({ fetch, now: Date.parse('2026-11-10T10:00:00Z'), metaVersion: 'v26.0', connections, jobs: [], ...extra })

  let s = await readStats('https://www.instagram.com/p/IGCODE/', undefined, ctx())
  assert.deepEqual([s.source, s.views, s.reach, s.likes, s.comments, s.shares, s.saves, s.remoteId, s.error], ['own', 5000, 3200, 410, 22, 15, 37, 'instagram:ig1|m1', undefined])
  // Found once: the next read goes straight to the post.
  calls.length = 0
  s = await readStats('https://www.instagram.com/p/IGCODE/', s, ctx())
  assert.deepEqual(calls, ['GET graph.facebook.com/v26.0/m1/insights'])

  // A creator's post: public likes and comments, with their handle.
  s = await readStats('https://www.instagram.com/p/CREATOR1/', undefined, ctx({ handle: '@ana.creates' }))
  assert.deepEqual([s.source, s.likes, s.comments, s.views], ['public', 900, 40, undefined])
  s = await readStats('https://www.instagram.com/p/CREATOR1/', undefined, ctx())
  assert.equal(s.error, 'notOwn', 'no handle, no public numbers')

  s = await readStats('https://www.facebook.com/lumen/posts/777', undefined, ctx())
  assert.deepEqual([s.views, s.reach, s.likes, s.comments, s.shares], [2100, 1500, 88, 9, 4])

  s = await readStats('https://www.threads.com/@lumen/post/THCODE', undefined, ctx())
  assert.deepEqual([s.views, s.likes, s.comments, s.shares], [700, 50, 6, 6])

  s = await readStats('https://www.tiktok.com/@lumen/video/7300', undefined, ctx())
  assert.deepEqual([s.views, s.likes, s.comments, s.shares], [12000, 800, 30, 25])
  s = await readStats('https://www.tiktok.com/@someone/video/7400', undefined, ctx())
  assert.equal(s.error, 'notOwn')

  s = await readStats('https://youtu.be/dQw4w9WgXcQ', undefined, ctx())
  assert.equal(s.error, 'noKey')
  s = await readStats('https://youtu.be/dQw4w9WgXcQ', undefined, ctx({ youtubeKey: 'k' }))
  assert.deepEqual([s.source, s.views, s.likes, s.comments], ['public', 1500000, 20000, 900])

  assert.equal((await readStats('https://www.linkedin.com/feed/update/urn:li:activity:1/', undefined, ctx())).error, 'unsupported')
  assert.equal((await readStats('https://example.com/x', undefined, ctx())).error, 'link')
  // Planner mode: no connections at all.
  assert.equal((await readStats('https://www.instagram.com/p/IGCODE/', undefined, ctx({ connections: [] }))).error, 'notOwn')

  // An expired token says so, and keeps what was known.
  const prev = { at: '2026-11-09T10:00:00Z', source: 'own' as const, likes: 3, remoteId: 'instagram:ig1|expired' }
  s = await readStats('https://www.instagram.com/p/IGCODE/', prev, ctx())
  assert.deepEqual([s.error, s.remoteId], ['auth', 'instagram:ig1|expired'])
})

const PASSWORD = 'correct horse battery'
const post = (id: string, extra: Partial<Post> = {}): Post =>
  ({ id, brandId: 'cafe', authorId: 'ana', status: 'published', networks: ['instagram'], text: `Post ${id}`, media: [], scheduledAt: '2026-11-10T09:00:00.000Z', createdAt: '2026-11-01T10:00:00.000Z', reviews: [], ...extra }) as Post

test('refresh now, the schedule, history and numbers by hand', async () => {
  const { url, db } = await freshDb('sqlite')
  const { fetch, calls } = fakeApis()
  const clock = { now: Date.parse('2026-11-10T10:00:00Z') }
  const app = await boot({ db, url, clock, fetch, publisher: () => ({ connections, jobs: [] }) })
  try {
    const ana = new Browser(app.base)
    await ana.post('/api/setup', { code: 'ABCDE-12345', company: 'Lumen', brands: ['Cafe'], name: 'Ana', email: 'ana@lumen.pt', password: PASSWORD })
    const act = (...actions: unknown[]) => ana.post('/api/workspace/actions', { actions })
    const ws = async () => (await ana.get('/api/workspace')).body.ws as Workspace
    await act({ type: 'savePost', post: post('p1', { publishedUrl: 'https://www.instagram.com/p/IGCODE/' }) }, { type: 'savePost', post: post('p2', { status: 'scheduled' }) })

    let r = await ana.post('/api/stats/post/p1/refresh')
    assert.equal(r.status, 200, JSON.stringify(r.body))
    assert.equal(r.body.stats.views, 5000)
    let p1 = (await ws()).posts.find((p) => p.id === 'p1')!
    assert.deepEqual([p1.liveStats?.likes, p1.metrics?.reach, p1.metrics?.saves], [410, 3200, 37], 'numbers land in the post and its metrics')
    assert.equal((await ana.post('/api/stats/post/p2/refresh')).status, 409, 'no link yet')
    assert.equal((await ana.post('/api/stats/post/nope/refresh')).status, 404)

    // The schedule: nothing due 20 minutes later, due again after an hour.
    clock.now += 20 * 60_000
    assert.equal(await app.kataru.stats.tick(), 0)
    clock.now += 45 * 60_000
    calls.length = 0
    assert.equal(await app.kataru.stats.tick(), 1)
    assert.ok(calls.length > 0)

    // One snapshot per day.
    clock.now += DAY
    await app.kataru.stats.tick()
    r = await ana.get('/api/stats/post/p1')
    assert.deepEqual(r.body.days.map((d: { day: string }) => d.day), ['2026-11-10', '2026-11-11'])
    assert.equal(r.body.days[0].views, 5000)

    // By hand: only numbers marked as typed in.
    assert.equal((await act({ type: 'liveStats', kind: 'post', id: 'p1', stats: { at: '2026-11-11T12:00:00Z', source: 'own', likes: 1 } })).status, 403)
    assert.equal((await act({ type: 'liveStats', kind: 'post', id: 'p1', stats: { at: '2026-11-11T12:00:00Z', source: 'manual', likes: 999 } })).status, 200)
    p1 = (await ws()).posts.find((p) => p.id === 'p1')!
    assert.deepEqual([p1.liveStats?.source, p1.liveStats?.likes, p1.metrics?.likes], ['manual', 999, 999])
    // Numbers typed in aren't overwritten by the schedule.
    clock.now += DAY
    assert.equal(await app.kataru.stats.tick(), 0)
  } finally {
    await app.close()
  }
})
