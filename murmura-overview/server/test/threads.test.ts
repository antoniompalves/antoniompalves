import assert from 'node:assert/strict'
import { test } from 'node:test'
import { threadsProvider } from '../providers/threads.ts'
import { ctx, fakeNetwork, post } from './fake.ts'

const T = 'https://graph.threads.com'
const threads = threadsProvider({ appId: 'tapp', appSecret: 'tsecret' }, { pollMs: 0 })

test('sign-in: code → short token → 60-day token → profile', async () => {
  const net = fakeNetwork([
    ['POST', `${T}/oauth/access_token`, { json: { access_token: 'short', user_id: 'u9' } }],
    ['GET', `${T}/access_token?`, { json: { access_token: 'long', expires_in: 5183944 } }],
    ['GET', `${T}/v1.0/me?`, { json: { id: 'u9', username: 'emberandoak', name: 'Ember & Oak' } }],
  ])
  assert.match(threads.authorize('s', 'https://pub/cb').url, /^https:\/\/threads\.com\/oauth\/authorize\?.*scope=threads_basic%2Cthreads_content_publish/)
  const got = await threads.exchange('code', 'https://pub/cb')
  assert.equal(net.calls[0].body.grant_type, 'authorization_code')
  assert.equal(net.calls[1].url.searchParams.get('grant_type'), 'th_exchange_token')
  assert.equal(got.accounts[0].id, 'threads:u9')
  assert.equal(got.accounts[0].handle, 'emberandoak')
})

test('text post with a link card', async () => {
  const net = fakeNetwork([
    ['GET', /threads_publishing_limit/, { json: { data: [{ quota_usage: 1, config: { quota_total: 250 } }] } }],
    ['POST', `${T}/v1.0/u9/threads_publish`, { json: { id: 't1' } }],
    ['POST', `${T}/v1.0/u9/threads`, { json: { id: 'c1' } }],
    ['GET', `${T}/v1.0/c1?`, { json: { status: 'FINISHED' } }],
    ['GET', `${T}/v1.0/t1?`, { json: { permalink: 'https://www.threads.com/@emberandoak/post/x' } }],
  ])
  const r = await threads.publish(ctx({ network: 'threads', remoteId: 'u9' }, post({ link: 'https://emberandoak.com' })))
  const c = net.find('POST', '/u9/threads')[0].body
  assert.deepEqual([c.media_type, c.link_attachment], ['TEXT', 'https://emberandoak.com'])
  assert.equal(net.find('POST', 'threads_publish')[0].body.creation_id, 'c1')
  assert.equal(r.url, 'https://www.threads.com/@emberandoak/post/x')
})

test('carousel: children, then the carousel, each ready before publishing', async () => {
  let n = 0
  const net = fakeNetwork([
    ['GET', /threads_publishing_limit/, { json: { data: [] } }],
    ['POST', `${T}/v1.0/u9/threads_publish`, { json: { id: 't2' } }],
    ['POST', `${T}/v1.0/u9/threads`, () => ({ json: { id: `c${++n}` } })],
    ['GET', /\/c\d\?/, { json: { status: 'FINISHED' } }],
    ['GET', `${T}/v1.0/t2?`, { json: {} }],
  ])
  await threads.publish(ctx({ network: 'threads', remoteId: 'u9' }, post({ media: [{ url: 'https://cdn/a.jpg', kind: 'image', alt: 'Beans' }, { url: 'https://cdn/b.mp4', kind: 'video' }] })))
  const made = net.find('POST', '/u9/threads').filter((c) => !c.url.pathname.endsWith('_publish'))
  assert.deepEqual(
    made.map((c) => [c.body.media_type, c.body.is_carousel_item ?? '', c.body.alt_text ?? '']),
    [
      ['IMAGE', 'true', 'Beans'],
      ['VIDEO', 'true', ''],
      ['CAROUSEL', '', ''],
    ],
  )
  assert.equal(made[2].body.children, 'c1,c2')
})

test('refresh: only once the token is a day old', async () => {
  const net = fakeNetwork([['GET', `${T}/refresh_access_token`, { json: { access_token: 'fresh', expires_in: 5183944 } }]])
  const young = { accessToken: 'a', scopes: [], issuedAt: Date.now() - 3600_000, expiresAt: Date.now() + 1000 }
  assert.equal((await threads.refresh!(young)).accessToken, 'a')
  const old = { ...young, issuedAt: Date.now() - 2 * 86400_000 }
  assert.equal((await threads.refresh!(old)).accessToken, 'fresh')
  assert.equal(net.calls[0].url.searchParams.get('grant_type'), 'th_refresh_token')
})
