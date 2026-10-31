import assert from 'node:assert/strict'
import { test } from 'node:test'
import { metaProvider } from '../providers/meta.ts'
import { ProviderError } from '../providers/types.ts'
import { ctx, fakeNetwork, post } from './fake.ts'

const G = 'https://graph.facebook.com/v26.0'
const meta = metaProvider({ appId: 'app', appSecret: 'secret', configId: '', version: 'v26.0' }, { pollMs: 0 })

test('sign-in swaps for a long-lived token and lists Pages with their Instagram accounts', async () => {
  const net = fakeNetwork([
    ['GET', /oauth\/access_token\?client_id/, { json: { access_token: 'short' } }],
    ['GET', /oauth\/access_token\?grant_type=fb_exchange_token/, { json: { access_token: 'long', expires_in: 5183944 } }],
    ['GET', `${G}/me?`, { json: { id: 'u1', name: 'Camila' } }],
    ['GET', `${G}/me/permissions`, { json: { data: [{ permission: 'pages_manage_posts', status: 'granted' }, { permission: 'instagram_basic', status: 'declined' }] } }],
    [
      'GET',
      `${G}/me/accounts`,
      {
        json: {
          data: [
            { id: 'p1', name: 'Ember & Oak', access_token: 'page-1', tasks: ['CREATE_CONTENT'], instagram_business_account: { id: 'ig1', username: 'emberandoak' } },
            { id: 'p2', name: 'Read only', access_token: 'page-2', tasks: ['ANALYZE'] },
          ],
        },
      },
    ],
  ])
  const auth = meta.authorize('st', 'https://pub/auth/meta/callback')
  assert.match(auth.url, /^https:\/\/www\.facebook\.com\/v26\.0\/dialog\/oauth\?/)
  assert.match(auth.url, /scope=pages_show_list%2C.*instagram_content_publish/)
  const got = await meta.exchange('code', 'https://pub/auth/meta/callback')
  assert.equal(net.find('GET', 'fb_exchange_token')[0].url.searchParams.get('fb_exchange_token'), 'short')
  assert.deepEqual(
    got.accounts.map((a) => [a.id, a.token, a.meta?.pageId]),
    [
      ['facebook:p1', 'page-1', undefined],
      ['instagram:ig1', 'page-1', 'p1'],
    ],
  )
  assert.deepEqual(got.tokens.scopes, ['pages_manage_posts'])
  assert.ok(got.tokens.expiresAt! > Date.now() + 59 * 86400_000)
})

test('Facebook: text + link goes to the feed with the Page token', async () => {
  const net = fakeNetwork([
    ['POST', `${G}/p1/feed`, { json: { id: 'p1_9' } }],
    ['GET', `${G}/p1_9`, { json: { permalink_url: 'https://facebook.com/p1/posts/9' } }],
  ])
  const r = await meta.publish(ctx({ network: 'facebook', remoteId: 'p1', token: 'page-1' }, post({ link: 'https://emberandoak.com' })))
  const [feed] = net.find('POST', '/feed')
  assert.equal(feed.headers.authorization, 'Bearer page-1')
  assert.equal(feed.body.link, 'https://emberandoak.com')
  assert.equal(r.url, 'https://facebook.com/p1/posts/9')
})

test('Facebook: several photos go up unpublished, then one post attaches them', async () => {
  const net = fakeNetwork([
    ['POST', `${G}/p1/photos`, (_c, n) => ({ json: { id: `ph${n}` } })],
    ['POST', `${G}/p1/feed`, { json: { id: 'p1_10' } }],
    ['GET', `${G}/p1_10`, { json: {} }],
  ])
  await meta.publish(ctx({ network: 'facebook', remoteId: 'p1', token: 't' }, post({ media: [{ url: 'https://cdn/a.jpg', kind: 'image' }, { url: 'https://cdn/b.jpg', kind: 'image' }] })))
  const photos = net.find('POST', '/photos')
  assert.equal(photos.length, 2)
  assert.equal(photos[0].body.published, 'false')
  const feed = net.find('POST', '/feed')[0].body
  assert.equal(feed['attached_media[1]'], JSON.stringify({ media_fbid: 'ph2' }))
})

test('Facebook: a video is handed over by URL', async () => {
  const net = fakeNetwork([['POST', 'https://graph-video.facebook.com/v26.0/p1/videos', { json: { id: 'v1' } }]])
  const r = await meta.publish(ctx({ network: 'facebook', remoteId: 'p1', token: 't' }, post({ media: [{ url: 'https://cdn/a.mp4', kind: 'video' }] })))
  assert.equal(net.calls[0].body.file_url, 'https://cdn/a.mp4')
  assert.equal(r.url, 'https://www.facebook.com/p1/videos/v1')
})

test('Instagram: carousel waits for each video, publishes, then adds the first comment', async () => {
  let made = 0
  const net = fakeNetwork([
    ['GET', `${G}/ig1/content_publishing_limit`, { json: { data: [{ quota_usage: 3, config: { quota_total: 100 } }] } }],
    ['POST', `${G}/ig1/media_publish`, { json: { id: 'm1' } }],
    ['POST', `${G}/ig1/media`, () => ({ json: { id: `k${++made}` } })],
    ['GET', `${G}/k2?`, (_c, n) => ({ json: { status_code: n < 3 ? 'IN_PROGRESS' : 'FINISHED' } })],
    ['GET', /\/k\d\?/, { json: { status_code: 'FINISHED' } }],
    ['POST', `${G}/m1/comments`, { json: { id: 'cm1' } }],
    ['GET', `${G}/m1?`, { json: { permalink: 'https://instagram.com/p/abc' } }],
  ])
  const r = await meta.publish(
    ctx(
      { network: 'instagram', remoteId: 'ig1', token: 'page-1' },
      post({ media: [{ url: 'https://cdn/a.jpg', kind: 'image' }, { url: 'https://cdn/b.mp4', kind: 'video' }], firstComment: '#slowcoffee' }),
    ),
  )
  const creates = net.find('POST', '/ig1/media').filter((c) => !c.url.pathname.endsWith('media_publish'))
  assert.equal(creates[0].body.is_carousel_item, 'true')
  assert.equal(creates[1].body.media_type, 'VIDEO')
  assert.equal(creates[2].body.media_type, 'CAROUSEL')
  assert.equal(creates[2].body.children, 'k1,k2')
  assert.equal(net.find('GET', '/k2?').length, 3)
  assert.equal(net.find('POST', 'media_publish')[0].body.creation_id, 'k3')
  assert.equal(net.find('POST', '/m1/comments')[0].body.message, '#slowcoffee')
  assert.deepEqual([r.remoteId, r.url], ['m1', 'https://instagram.com/p/abc'])
})

test('Instagram: a single video is a Reel', async () => {
  const net = fakeNetwork([
    ['GET', /content_publishing_limit/, { json: { data: [] } }],
    ['POST', `${G}/ig1/media_publish`, { json: { id: 'm2' } }],
    ['POST', `${G}/ig1/media`, { json: { id: 'r1' } }],
    ['GET', `${G}/r1?`, { json: { status_code: 'FINISHED' } }],
    ['GET', `${G}/m2?`, { json: {} }],
  ])
  await meta.publish(ctx({ network: 'instagram', remoteId: 'ig1', token: 't' }, post({ media: [{ url: 'https://cdn/r.mp4', kind: 'video' }] })))
  const c = net.find('POST', '/ig1/media')[0].body
  assert.deepEqual([c.media_type, c.video_url, c.share_to_feed], ['REELS', 'https://cdn/r.mp4', 'true'])
})

test('Instagram: a full daily quota stops before anything is created', async () => {
  const net = fakeNetwork([['GET', /content_publishing_limit/, { json: { data: [{ quota_usage: 100, config: { quota_total: 100 } }] } }]])
  await assert.rejects(
    meta.publish(ctx({ network: 'instagram', remoteId: 'ig1', token: 't' }, post({ media: [{ url: 'https://cdn/a.jpg', kind: 'image' }] }))),
    (e: ProviderError) => e.code === 'rate_limit' && e.retryable,
  )
  assert.equal(net.find('POST', '/media').length, 0)
})

test('Instagram: an error on publish is checked against the container before failing', async () => {
  fakeNetwork([
    ['GET', /content_publishing_limit/, { json: { data: [] } }],
    ['POST', `${G}/ig1/media_publish`, { status: 500, json: { error: { message: 'Unknown', code: 1 } } }],
    ['POST', `${G}/ig1/media`, { json: { id: 'k9' } }],
    ['GET', `${G}/k9?`, (_c, n) => ({ json: { status_code: n === 1 ? 'FINISHED' : 'PUBLISHED' } })],
  ])
  const r = await meta.publish(ctx({ network: 'instagram', remoteId: 'ig1', token: 't' }, post({ media: [{ url: 'https://cdn/a.jpg', kind: 'image' }] })))
  assert.equal(r.status, 'published')
})

test('Meta errors are sorted: expired token → auth, rate limit → retryable', async () => {
  fakeNetwork([['POST', /\/feed/, { status: 400, json: { error: { message: 'Session expired', code: 190 } } }]])
  await assert.rejects(meta.publish(ctx({ network: 'facebook', remoteId: 'p1', token: 't' }, post())), (e: ProviderError) => e.code === 'auth' && !e.retryable)
  fakeNetwork([['POST', /\/feed/, { status: 400, json: { error: { message: 'Too many calls', code: 4 } } }]])
  await assert.rejects(meta.publish(ctx({ network: 'facebook', remoteId: 'p1', token: 't' }, post())), (e: ProviderError) => e.code === 'rate_limit' && e.retryable)
})
