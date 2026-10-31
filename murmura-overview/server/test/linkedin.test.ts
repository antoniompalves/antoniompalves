import assert from 'node:assert/strict'
import { test } from 'node:test'
import { linkedinProvider, littleText } from '../providers/linkedin.ts'
import { ProviderError } from '../providers/types.ts'
import { ctx, fakeMedia, fakeNetwork, post } from './fake.ts'

const R = 'https://api.linkedin.com/rest'
const config = { clientId: 'lid', clientSecret: 'lsecret', version: '202609', organizations: true }
const li = linkedinProvider(config, { pollMs: 0 })

test('little text: markup characters are escaped, hashtags kept', () => {
  assert.equal(littleText('New (Huila) @friends #coffee [1] *wow*'), 'New \\(Huila\\) \\@friends #coffee \\[1\\] \\*wow\\*')
})

test('sign-in lists the member and the Company Pages they administer', async () => {
  const net = fakeNetwork([
    ['POST', 'https://www.linkedin.com/oauth/v2/accessToken', { json: { access_token: 'at', expires_in: 5184000, scope: 'openid,profile,w_member_social,w_organization_social' } }],
    ['GET', 'https://api.linkedin.com/v2/userinfo', { json: { sub: 'abc', name: 'Camila Ortiz' } }],
    ['GET', `${R}/organizationAcls`, { json: { elements: [{ organization: 'urn:li:organization:42' }] } }],
    ['GET', `${R}/organizations/42`, { json: { localizedName: 'Northlight Studio', vanityName: 'northlight' } }],
  ])
  assert.match(li.authorize('s', 'https://pub/cb').url, /scope=openid\+profile\+w_member_social\+w_organization_social/)
  const got = await li.exchange('code', 'https://pub/cb')
  assert.deepEqual(
    got.accounts.map((a) => [a.id, a.meta?.author]),
    [
      ['linkedin:abc', 'urn:li:person:abc'],
      ['linkedin:org-42', 'urn:li:organization:42'],
    ],
  )
  assert.equal(net.find('GET', 'organizationAcls')[0].headers['linkedin-version'], '202609')
})

test('one photo: initialise upload, PUT the bytes, post with the image URN', async () => {
  const net = fakeNetwork([
    ['POST', `${R}/images?action=initializeUpload`, { json: { value: { uploadUrl: 'https://upload.linkedin/x', image: 'urn:li:image:1' } } }],
    ['PUT', 'https://upload.linkedin/x', { status: 201 }],
    ['POST', `${R}/posts`, { status: 201, headers: { 'x-restli-id': 'urn:li:share:7' } }],
  ])
  const r = await li.publish(ctx({ network: 'linkedin', remoteId: '42', meta: { author: 'urn:li:organization:42' } }, post({ media: [{ url: 'https://cdn/a.jpg', kind: 'image', alt: 'Beans' }] }), fakeMedia(), 'at'))
  const init = net.find('POST', '/images')[0]
  assert.equal(init.body.initializeUploadRequest.owner, 'urn:li:organization:42')
  assert.equal(init.headers['x-restli-protocol-version'], '2.0.0')
  assert.equal(net.find('PUT', 'upload.linkedin')[0].headers.authorization, 'Bearer at')
  const p = net.find('POST', '/posts')[0].body
  assert.deepEqual(p.content, { media: { id: 'urn:li:image:1', altText: 'Beans' } })
  assert.equal(p.commentary, 'New harvest is in \\(Huila\\) — \\@friends #coffee')
  assert.equal(p.lifecycleState, 'PUBLISHED')
  assert.equal(r.url, 'https://www.linkedin.com/feed/update/urn:li:share:7/')
})

test('several photos make a multiImage post', async () => {
  let n = 0
  const net = fakeNetwork([
    ['POST', `${R}/images?action=initializeUpload`, () => ({ json: { value: { uploadUrl: `https://upload.linkedin/${++n}`, image: `urn:li:image:${n}` } } })],
    ['PUT', 'https://upload.linkedin/', { status: 201 }],
    ['POST', `${R}/posts`, { status: 201, headers: { 'x-restli-id': 'urn:li:share:8' } }],
  ])
  await li.publish(ctx({ network: 'linkedin', remoteId: 'abc' }, post({ media: [{ url: 'https://cdn/a.jpg', kind: 'image' }, { url: 'https://cdn/b.jpg', kind: 'image' }] })))
  assert.deepEqual(net.find('POST', '/posts')[0].body.content.multiImage.images.map((i: { id: string }) => i.id), ['urn:li:image:1', 'urn:li:image:2'])
  assert.equal(net.find('POST', '/posts')[0].body.author, 'urn:li:person:abc')
})

test('video: parts uploaded by the given byte ranges, finalised with their ETags', async () => {
  const net = fakeNetwork([
    [
      'POST',
      `${R}/videos?action=initializeUpload`,
      {
        json: {
          value: {
            video: 'urn:li:video:9',
            uploadToken: 'tok',
            uploadInstructions: [
              { uploadUrl: 'https://up/1', firstByte: 0, lastByte: 4194303 },
              { uploadUrl: 'https://up/2', firstByte: 4194304, lastByte: 4999999 },
            ],
          },
        },
      },
    ],
    ['PUT', 'https://up/', (c) => ({ status: 200, headers: { etag: `e-${c.url.pathname.slice(1)}` } })],
    ['POST', `${R}/videos?action=finalizeUpload`, { json: {} }],
    ['GET', `${R}/videos/`, (_c, n) => ({ json: { status: n < 2 ? 'PROCESSING' : 'AVAILABLE' } })],
    ['POST', `${R}/posts`, { status: 201, headers: { 'x-restli-id': 'urn:li:share:9' } }],
  ])
  await li.publish(ctx({ network: 'linkedin', remoteId: 'abc' }, post({ media: [{ url: 'https://cdn/v.mp4', kind: 'video' }] }), fakeMedia({ 'https://cdn/v.mp4': 5_000_000 })))
  assert.deepEqual(net.find('PUT', 'https://up/').map((c) => c.bytes), [4194304, 805696])
  assert.deepEqual(net.find('POST', 'finalizeUpload')[0].body.finalizeUploadRequest, { video: 'urn:li:video:9', uploadToken: 'tok', uploadedPartIds: ['e-1', 'e-2'] })
  assert.deepEqual(net.find('POST', '/posts')[0].body.content, { media: { id: 'urn:li:video:9' } })
})

test('a link alone becomes an article card', async () => {
  const net = fakeNetwork([['POST', `${R}/posts`, { status: 201, headers: { 'x-restli-id': 'urn:li:share:1' } }]])
  await li.publish(ctx({ network: 'linkedin', remoteId: 'abc' }, post({ text: 'Read the story', link: 'https://emberandoak.com/story' })))
  assert.deepEqual(net.calls[0].body.content, { article: { source: 'https://emberandoak.com/story', title: 'Read the story' } })
})

test('refresh without a refresh token asks for a new sign-in', async () => {
  await assert.rejects(li.refresh!({ accessToken: 'a', scopes: [], issuedAt: 0 }), (e: ProviderError) => e.code === 'auth')
})
