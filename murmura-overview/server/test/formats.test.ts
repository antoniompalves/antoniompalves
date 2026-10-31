import assert from 'node:assert/strict'
import { test } from 'node:test'
import { linkedinProvider } from '../providers/linkedin.ts'
import { metaProvider } from '../providers/meta.ts'
import { formatOf, issues } from '../rules.ts'
import { ctx, fakeNetwork, post } from './fake.ts'

const G = 'https://graph.facebook.com/v26.0'
const meta = metaProvider({ appId: 'app', appSecret: 'secret', configId: '', version: 'v26.0' }, { pollMs: 0 })
const linkedin = linkedinProvider({ clientId: 'id', clientSecret: 'secret', version: '202604', organizations: false }, { pollMs: 0 })

const img = (n = 'a') => ({ url: `https://cdn/${n}.jpg`, kind: 'image' as const })
const vid = (n = 'a') => ({ url: `https://cdn/${n}.mp4`, kind: 'video' as const })
const pdf = { url: 'https://cdn/lookbook.pdf', kind: 'document' as const }

test('rules: each format checks its own media', () => {
  assert.deepEqual(issues('instagram', post({ format: 'story', media: [img(), img('b')] })), ['Instagram Stories take exactly one photo or video.'])
  assert.deepEqual(issues('instagram', post({ format: 'story', media: [vid()], text: 'x'.repeat(5000) })), [], 'stories carry no caption')
  assert.deepEqual(issues('facebook', post({ format: 'reel', media: [img()] })), ['Facebook Reels need exactly one video.'])
  assert.deepEqual(issues('linkedin', post({ format: 'document', media: [pdf] })), ['LinkedIn documents need a title.'])
  assert.deepEqual(issues('linkedin', post({ format: 'document', media: [pdf], title: 'Autumn lookbook' })), [])
  assert.deepEqual(issues('linkedin', post({ format: 'document', media: [img()], title: 'x' })), ['LinkedIn documents need exactly one PDF and nothing else.'])
  assert.deepEqual(issues('instagram', post({ media: [pdf] })), ["Instagram can't post a PDF; only LinkedIn documents can."])
  assert.deepEqual(issues('threads', post({ format: 'reel', media: [vid()] })), ['Threads doesn\'t take the "reel" format.'])
  assert.deepEqual(issues('youtube', post({ format: 'short', media: [vid()], text: '', title: 'Ceramic coat' })), [])
})

test('rules: TikTok follows the media when no format is given', () => {
  assert.equal(formatOf('tiktok', post({ media: [img(), img('b')] })), 'photos')
  assert.equal(formatOf('tiktok', post({ media: [vid()] })), 'video')
  assert.equal(formatOf('youtube', post()), 'short')
})

test('Instagram Story: a STORIES container with no caption, and no first comment', async () => {
  const net = fakeNetwork([
    ['GET', `${G}/ig1/content_publishing_limit`, { json: { data: [{ quota_usage: 1, config: { quota_total: 50 } }] } }],
    ['POST', `${G}/ig1/media_publish`, { json: { id: 'm9' } }],
    ['POST', `${G}/ig1/media`, { json: { id: 'c1' } }],
    ['GET', `${G}/c1`, { json: { status_code: 'FINISHED' } }],
    ['GET', `${G}/m9`, { json: { permalink: 'https://instagram.com/stories/emberandoak/9' } }],
  ])
  await meta.publish(ctx({ network: 'instagram', remoteId: 'ig1', token: 'page-1' }, post({ format: 'story', media: [vid()], text: '', firstComment: '#coffee' })))
  const [made] = net.find('POST', '/ig1/media?').concat(net.find('POST', '/ig1/media'))
  assert.equal(made.body.media_type, 'STORIES')
  assert.equal(made.body.video_url, 'https://cdn/a.mp4')
  assert.equal(made.body.caption, undefined)
  assert.equal(net.find('POST', '/comments').length, 0)
})

test('Facebook Reel: start, hosted upload, finish with the description', async () => {
  const net = fakeNetwork([
    ['POST', `${G}/p1/video_reels`, (c) => ({ json: c.body.upload_phase === 'start' ? { video_id: 'r1', upload_url: 'https://rupload.facebook.com/video-upload/v26.0/r1' } : { success: true } })],
    ['POST', 'https://rupload.facebook.com/video-upload/v26.0/r1', { json: { success: true } }],
  ])
  const r = await meta.publish(ctx({ network: 'facebook', remoteId: 'p1', token: 'page-1' }, post({ format: 'reel', media: [vid()] })))
  const [start, finish] = net.find('POST', '/video_reels')
  assert.equal(start.body.upload_phase, 'start')
  const [upload] = net.find('POST', 'rupload.facebook.com')
  assert.equal(upload.headers.authorization, 'OAuth page-1')
  assert.equal(upload.headers.file_url, 'https://cdn/a.mp4')
  assert.equal(finish.body.video_state, 'PUBLISHED')
  assert.equal(finish.body.description, post().text)
  assert.equal(r.url, 'https://www.facebook.com/reel/r1')
})

test('Facebook Story: a photo goes up unpublished, then becomes a story', async () => {
  const net = fakeNetwork([
    ['POST', `${G}/p1/photos`, { json: { id: 'ph1' } }],
    ['POST', `${G}/p1/photo_stories`, { json: { success: true, post_id: 'p1_s1' } }],
  ])
  const r = await meta.publish(ctx({ network: 'facebook', remoteId: 'p1', token: 'page-1' }, post({ format: 'story', media: [img()] })))
  assert.equal(net.find('POST', '/photos')[0].body.published, 'false')
  assert.equal(net.find('POST', '/photo_stories')[0].body.photo_id, 'ph1')
  assert.equal(r.remoteId, 'p1_s1')
})

test('LinkedIn document: upload the PDF, wait for it, post it with its title', async () => {
  const REST = 'https://api.linkedin.com/rest'
  const net = fakeNetwork([
    ['POST', `${REST}/documents?action=initializeUpload`, { json: { value: { uploadUrl: 'https://www.linkedin.com/dms-uploads/doc1', document: 'urn:li:document:D1' } } }],
    ['PUT', 'https://www.linkedin.com/dms-uploads/doc1', { status: 201, headers: { etag: 'e1' } }],
    ['GET', `${REST}/documents/`, (_c, n) => ({ json: { status: n < 2 ? 'PROCESSING' : 'AVAILABLE' } })],
    ['POST', `${REST}/posts`, { status: 201, headers: { 'x-restli-id': 'urn:li:share:7' } }],
  ])
  const r = await linkedin.publish(ctx({ network: 'linkedin', remoteId: 'u1', meta: { author: 'urn:li:organization:9' } }, post({ format: 'document', media: [pdf], title: 'Autumn lookbook' })))
  assert.equal(net.find('POST', '/documents')[0].body.initializeUploadRequest.owner, 'urn:li:organization:9')
  assert.equal(net.find('GET', '/documents/').length, 2)
  const body = net.find('POST', '/posts')[0].body
  assert.deepEqual(body.content, { media: { id: 'urn:li:document:D1', title: 'Autumn lookbook' } })
  assert.equal(r.url, 'https://www.linkedin.com/feed/update/urn:li:share:7/')
})
