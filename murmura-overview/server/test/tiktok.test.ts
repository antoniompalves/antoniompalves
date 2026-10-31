import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chunksFor, tiktokProvider } from '../providers/tiktok.ts'
import { ProviderError } from '../providers/types.ts'
import { ctx, fakeMedia, fakeNetwork, post } from './fake.ts'

const API = 'https://open.tiktokapis.com/v2'
const MB = 1024 * 1024
const tiktok = tiktokProvider({ clientKey: 'ck', clientSecret: 'cs', pullPrefixes: ['https://media.emberandoak.com/'] }, { pollMs: 0 })
const creator = {
  data: {
    creator_username: 'emberandoak',
    creator_nickname: 'Ember & Oak',
    creator_avatar_url: 'https://x',
    privacy_level_options: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'],
    comment_disabled: true,
    duet_disabled: false,
    stitch_disabled: false,
    max_video_post_duration_sec: 600,
  },
  error: { code: 'ok' },
}
const tk = (p = {}) => post({ options: { tiktok: { privacy: 'PUBLIC_TO_EVERYONE' } }, ...p })

test('chunking follows TikTok: under 5 MB one piece, otherwise 10 MB chunks with the rest in the last', () => {
  assert.deepEqual(chunksFor(3 * MB).ranges, [[0, 3 * MB - 1]])
  const big = chunksFor(25 * MB)
  assert.equal(big.count, 2)
  assert.deepEqual(big.ranges, [
    [0, 10 * MB - 1],
    [10 * MB, 25 * MB - 1],
  ])
})

test('sign-in: code → tokens (24 h access, 1 year refresh) → profile', async () => {
  const net = fakeNetwork([
    ['POST', `${API}/oauth/token/`, { json: { access_token: 'act.1', expires_in: 86400, open_id: 'o1', refresh_token: 'rft.1', refresh_expires_in: 31536000, scope: 'user.info.basic,video.publish' } }],
    ['GET', `${API}/user/info/`, { json: { data: { user: { open_id: 'o1', display_name: 'Ember & Oak', username: 'emberandoak' } }, error: { code: 'ok' } } }],
  ])
  assert.match(tiktok.authorize('s', 'https://pub/cb').url, /^https:\/\/www\.tiktok\.com\/v2\/auth\/authorize\/\?client_key=ck&scope=user\.info\.basic%2Cuser\.info\.profile%2Cvideo\.publish/)
  const got = await tiktok.exchange('code', 'https://pub/cb')
  assert.equal(net.calls[0].body.client_secret, 'cs')
  assert.equal(got.accounts[0].handle, 'emberandoak')
  assert.ok(got.tokens.refreshExpiresAt! > Date.now() + 360 * 86400_000)
})

test('video by file upload: creator info, init, ranged PUTs, status until complete', async () => {
  const net = fakeNetwork([
    ['POST', `${API}/post/publish/creator_info/query/`, { json: creator }],
    ['POST', `${API}/post/publish/video/init/`, { json: { data: { publish_id: 'v_pub_1', upload_url: 'https://open-upload.tiktokapis.com/video/?upload_id=1' }, error: { code: 'ok' } } }],
    ['PUT', 'https://open-upload.tiktokapis.com/', (_c, n) => ({ status: n === 2 ? 201 : 206 })],
    ['POST', `${API}/post/publish/status/fetch/`, (_c, n) => ({ json: { data: n < 2 ? { status: 'PROCESSING_UPLOAD' } : { status: 'PUBLISH_COMPLETE', publicaly_available_post_id: [7123] }, error: { code: 'ok' } } })],
  ])
  const r = await tiktok.publish(ctx({ network: 'tiktok', remoteId: 'o1', handle: 'emberandoak' }, tk({ media: [{ url: 'https://cdn/v.mp4', kind: 'video' }] }), fakeMedia({ 'https://cdn/v.mp4': 25 * MB })))
  const init = net.find('POST', 'video/init')[0].body
  assert.deepEqual(init.source_info, { source: 'FILE_UPLOAD', video_size: 25 * MB, chunk_size: 10 * MB, total_chunk_count: 2 })
  // The creator turned comments off: that wins.
  assert.equal(init.post_info.disable_comment, true)
  assert.equal(init.post_info.privacy_level, 'PUBLIC_TO_EVERYONE')
  assert.deepEqual(net.find('PUT', 'open-upload').map((c) => c.headers['content-range']), [`bytes 0-${10 * MB - 1}/${25 * MB}`, `bytes ${10 * MB}-${25 * MB - 1}/${25 * MB}`])
  assert.deepEqual([r.status, r.url], ['published', 'https://www.tiktok.com/@emberandoak/video/7123'])
})

test('video from a verified prefix is pulled by TikTok', async () => {
  const net = fakeNetwork([
    ['POST', /creator_info/, { json: creator }],
    ['POST', /video\/init/, { json: { data: { publish_id: 'v_pub_2' }, error: { code: 'ok' } } }],
    ['POST', /status\/fetch/, { json: { data: { status: 'PROCESSING_DOWNLOAD' }, error: { code: 'ok' } } }],
  ])
  const r = await tiktok.publish(ctx({ network: 'tiktok', remoteId: 'o1' }, tk({ media: [{ url: 'https://media.emberandoak.com/v.mp4', kind: 'video' }] })))
  assert.deepEqual(net.find('POST', 'video/init')[0].body.source_info, { source: 'PULL_FROM_URL', video_url: 'https://media.emberandoak.com/v.mp4' })
  // Still processing after the polls: the job checks again later.
  assert.deepEqual([r.status, r.remoteId], ['processing', 'v_pub_2'])
})

test('photos: pulled from the verified prefix as a direct photo post', async () => {
  const net = fakeNetwork([
    ['POST', /creator_info/, { json: creator }],
    ['POST', `${API}/post/publish/content/init/`, { json: { data: { publish_id: 'p_pub_1' }, error: { code: 'ok' } } }],
    ['POST', /status\/fetch/, { json: { data: { status: 'PUBLISH_COMPLETE' }, error: { code: 'ok' } } }],
  ])
  const r = await tiktok.publish(
    ctx({ network: 'tiktok', remoteId: 'o1' }, tk({ text: 'Autumn menu\nmaple everything', media: [{ url: 'https://media.emberandoak.com/1.jpg', kind: 'image' }] })),
  )
  const body = net.find('POST', 'content/init')[0].body
  assert.deepEqual([body.media_type, body.post_mode, body.post_info.title, body.source_info.photo_images[0]], ['PHOTO', 'DIRECT_POST', 'Autumn menu', 'https://media.emberandoak.com/1.jpg'])
  assert.equal(r.status, 'published')
})

test('an audience the creator does not allow is refused before upload', async () => {
  const net = fakeNetwork([['POST', /creator_info/, { json: creator }]])
  await assert.rejects(
    tiktok.publish(ctx({ network: 'tiktok', remoteId: 'o1' }, post({ media: [{ url: 'https://cdn/v.mp4', kind: 'video' }], options: { tiktok: { privacy: 'FOLLOWER_OF_CREATOR' } } }))),
    (e: ProviderError) => e.code === 'invalid',
  )
  assert.equal(net.find('POST', 'init').length, 0)
})

test('TikTok answers errors inside a 200: unaudited apps posting publicly', async () => {
  fakeNetwork([
    ['POST', /creator_info/, { json: creator }],
    ['POST', /video\/init/, { json: { data: {}, error: { code: 'unaudited_client_can_only_post_to_private_accounts', message: 'Unaudited client' } } }],
  ])
  await assert.rejects(
    tiktok.publish(ctx({ network: 'tiktok', remoteId: 'o1' }, tk({ media: [{ url: 'https://media.emberandoak.com/v.mp4', kind: 'video' }] }))),
    (e: ProviderError) => e.code === 'invalid' && /Unaudited/.test(e.message),
  )
})
