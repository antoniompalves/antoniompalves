import assert from 'node:assert/strict'
import { test } from 'node:test'
import { youtubeProvider } from '../providers/youtube.ts'
import { ctx, fakeMedia, fakeNetwork, post } from './fake.ts'

const yt = youtubeProvider({ clientId: 'gid', clientSecret: 'gsecret' })

test('sign-in uses PKCE and offline access, then lists the channel', async () => {
  const auth = yt.authorize('s', 'https://pub/cb')
  const u = new URL(auth.url)
  assert.equal(u.searchParams.get('access_type'), 'offline')
  assert.equal(u.searchParams.get('code_challenge_method'), 'S256')
  assert.ok(auth.verifier && auth.verifier.length >= 43)
  const net = fakeNetwork([
    ['POST', 'https://oauth2.googleapis.com/token', { json: { access_token: 'ya29', expires_in: 3599, refresh_token: '1//r', scope: 'https://www.googleapis.com/auth/youtube.upload' } }],
    ['GET', 'https://www.googleapis.com/youtube/v3/channels', { json: { items: [{ id: 'UC1', snippet: { title: 'Ember & Oak', customUrl: '@emberandoak' } }] } }],
  ])
  const got = await yt.exchange('code', 'https://pub/cb', auth.verifier)
  assert.equal(net.calls[0].body.code_verifier, auth.verifier)
  assert.deepEqual([got.accounts[0].id, got.accounts[0].handle, got.tokens.refreshToken], ['youtube:UC1', '@emberandoak', '1//r'])
})

test('upload: resumable session with metadata, then the bytes', async () => {
  const net = fakeNetwork([
    ['POST', 'https://www.googleapis.com/upload/youtube/v3/videos', { headers: { location: 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=xyz' } }],
    ['PUT', 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=xyz', { status: 200, json: { id: 'vid1', status: { privacyStatus: 'private' } } }],
  ])
  const r = await yt.publish(
    ctx(
      { network: 'youtube', remoteId: 'UC1' },
      post({ text: 'Pour-over in <3 minutes>\nAll the steps.', media: [{ url: 'https://cdn/v.mp4', kind: 'video' }], options: { youtube: { tags: ['coffee'] } } }),
      fakeMedia({ 'https://cdn/v.mp4': 2048 }),
      'ya29',
    ),
  )
  const init = net.calls[0]
  assert.equal(init.url.searchParams.get('uploadType'), 'resumable')
  assert.equal(init.headers['x-upload-content-length'], '2048')
  assert.equal(init.body.snippet.title, 'Pour-over in 3 minutes')
  assert.deepEqual(init.body.snippet.tags, ['coffee'])
  assert.deepEqual(init.body.status, { privacyStatus: 'public', selfDeclaredMadeForKids: false })
  assert.equal(net.calls[1].bytes, 2048)
  assert.equal(r.url, 'https://www.youtube.com/watch?v=vid1')
  // Asked for public, got private: the unaudited-project rule is explained.
  assert.match(r.note ?? '', /audit/)
})

test('refresh keeps the refresh token Google does not resend', async () => {
  fakeNetwork([['POST', 'https://oauth2.googleapis.com/token', { json: { access_token: 'new', expires_in: 3599 } }]])
  const t = await yt.refresh!({ accessToken: 'old', refreshToken: '1//r', scopes: ['s'], issuedAt: 0 })
  assert.deepEqual([t.accessToken, t.refreshToken], ['new', '1//r'])
})
