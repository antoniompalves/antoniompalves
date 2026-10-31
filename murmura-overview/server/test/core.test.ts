import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import type { PublishProvider } from '../../src/data/publishing.ts'
import { createHandler } from '../app.ts'
import { readConfig } from '../config.ts'
import { keyFrom, seal, unseal } from '../crypto.ts'
import { MediaLibrary } from '../media.ts'
import { dueJobs, runJob } from '../publish.ts'
import { setFetch } from '../providers/http.ts'
import { ProviderError } from '../providers/types.ts'
import type { Connection, Provider, PublishResult } from '../providers/types.ts'
import { issues } from '../rules.ts'
import { Store } from '../store.ts'
import type { Job } from '../store.ts'

const dirs: string[] = []
after(() => Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }))))
const tmp = async () => {
  const d = await mkdtemp(join(tmpdir(), 'kataru-pub-'))
  dirs.push(d)
  return d
}
const KEY = keyFrom('x'.repeat(40))
const json = (r: Response): Promise<any> => r.json()

test('sealing round-trips and a wrong key fails', () => {
  const s = seal(KEY, 'secret token')
  assert.equal(unseal(KEY, s), 'secret token')
  assert.throws(() => unseal(keyFrom('y'.repeat(40)), s))
})

test('the store file never holds tokens in the clear', async () => {
  const dir = await tmp()
  const store = await new Store(dir, KEY).load()
  store.upsert(conn('meta', 'tok-plain-123'))
  await store.save()
  const raw = await readFile(join(dir, 'store.sealed'), 'utf8')
  assert.ok(!raw.includes('tok-plain-123'))
  const again = await new Store(dir, KEY).load()
  assert.equal(again.data.connections[0].tokens.accessToken, 'tok-plain-123')
  await assert.rejects(new Store(dir, keyFrom('z'.repeat(40))).load(), /wrong PUBLISHER_SECRET/)
})

test('rules catch what each network would refuse', () => {
  const img = { url: 'https://cdn/a.png', kind: 'image' as const }
  assert.deepEqual(issues('instagram', { text: 'Hi', media: [] }), ['Instagram needs a photo or a video.'])
  assert.deepEqual(issues('instagram', { text: 'Hi', media: [img] }), ['Instagram only accepts JPEG photos.'])
  assert.deepEqual(issues('threads', { text: 'x'.repeat(501), media: [] }), ['Threads posts are limited to 500 characters.'])
  assert.deepEqual(issues('tiktok', { text: 'Hi', media: [{ url: 'https://cdn/v.mp4', kind: 'video' }] }), ['TikTok needs an audience picked for this post.'])
  assert.deepEqual(issues('youtube', { text: 'Hi', media: [img] }), ['YouTube needs exactly one video.'])
  assert.deepEqual(issues('linkedin', { text: '😀'.repeat(3000), media: [] }), [])
  assert.deepEqual(issues('facebook', { text: '', media: [], link: 'https://x' }), [])
})

function conn(provider: PublishProvider, token = 'tok', expiresAt?: number): Connection {
  const network = provider === 'meta' ? 'facebook' : provider
  return {
    id: `c_${provider}`,
    provider,
    subject: 'me',
    label: 'Me',
    tokens: { accessToken: token, refreshToken: 'r', expiresAt, scopes: [], issuedAt: 0 },
    accounts: [{ id: `${network}:1`, network, remoteId: '1', name: 'Ember & Oak', token: 'page' }],
    status: 'ok',
    createdAt: 0,
    updatedAt: 0,
  }
}

function fakeProvider(id: PublishProvider, publish: () => Promise<PublishResult>, extra: Partial<Provider> = {}): Provider {
  return {
    id,
    networks: [],
    configured: true,
    authorize: (state) => ({ url: `https://login.example/${id}?state=${state}` }),
    exchange: async () => ({ tokens: { accessToken: 'new', scopes: [], issuedAt: 0 }, subject: 'me', label: 'Me', accounts: [{ id: 'linkedin:9', network: 'linkedin', remoteId: '9', name: 'Camila' }] }),
    publish,
    ...extra,
  }
}

const providers = (overrides: Partial<Record<PublishProvider, Provider>>) =>
  ({ meta: fakeProvider('meta', async () => ({ remoteId: 'x', status: 'published' })), threads: fakeProvider('threads', async () => ({ remoteId: 'x', status: 'published' })), linkedin: fakeProvider('linkedin', async () => ({ remoteId: 'x', status: 'published' })), tiktok: fakeProvider('tiktok', async () => ({ remoteId: 'x', status: 'published' })), youtube: fakeProvider('youtube', async () => ({ remoteId: 'x', status: 'published' })), ...overrides }) as Record<PublishProvider, Provider>

const job = (over: Partial<Job> = {}): Job => ({
  id: 'j1',
  batchId: 'b1',
  accountId: 'linkedin:1',
  connectionId: 'c_linkedin',
  network: 'linkedin',
  post: { text: 'Hello', media: [] },
  publishAt: 0,
  status: 'scheduled',
  attempts: 0,
  createdAt: 0,
  updatedAt: 0,
  ...over,
})

test('jobs: transient failures retry with backoff, then fail; auth errors mark the connection', async () => {
  const store = await new Store(await tmp(), KEY).load()
  store.upsert(conn('linkedin'))
  let calls = 0
  const deps = { store, media: { load: async () => ({ bytes: Buffer.alloc(0), mime: '', size: 0 }) }, now: () => 1_000_000, providers: providers({ linkedin: fakeProvider('linkedin', async () => (calls++, Promise.reject(new ProviderError('transient', 'down')))) }) }
  store.data.jobs.push(job())
  await runJob(deps, store.job('j1')!)
  assert.deepEqual([store.job('j1')!.status, store.job('j1')!.nextAttemptAt], ['scheduled', 1_000_000 + 60_000])
  for (let i = 0; i < 3; i++) await runJob(deps, store.job('j1')!)
  assert.equal(store.job('j1')!.status, 'failed')
  assert.equal(calls, 4)

  deps.providers.linkedin = fakeProvider('linkedin', () => Promise.reject(new ProviderError('auth', 'revoked')))
  store.data.jobs.push(job({ id: 'j2' }))
  await runJob(deps, store.job('j2')!)
  assert.equal(store.job('j2')!.status, 'failed')
  assert.equal(store.connection('c_linkedin')!.status, 'expired')
})

test('jobs: an expiring token is refreshed before publishing; invalid posts never reach the network', async () => {
  const store = await new Store(await tmp(), KEY).load()
  store.upsert(conn('linkedin', 'old', 1_000_000 + 60_000))
  let used = ''
  const deps = {
    store,
    media: { load: async () => ({ bytes: Buffer.alloc(0), mime: '', size: 0 }) },
    now: () => 1_000_000,
    providers: providers({
      linkedin: fakeProvider('linkedin', async () => ((used = store.connection('c_linkedin')!.tokens.accessToken), { remoteId: 'urn:1', status: 'published' }), {
        refresh: async (t) => ({ ...t, accessToken: 'fresh', expiresAt: 9e12 }),
      }),
    }),
  }
  store.data.jobs.push(job(), job({ id: 'bad', post: { text: '', media: [] } }))
  await runJob(deps, store.job('j1')!)
  assert.deepEqual([store.job('j1')!.status, used], ['published', 'fresh'])
  await runJob(deps, store.job('bad')!)
  assert.deepEqual([store.job('bad')!.status, store.job('bad')!.error?.code], ['failed', 'invalid'])
})

test('jobs: "processing" is followed up with check() until it lands', async () => {
  const store = await new Store(await tmp(), KEY).load()
  store.upsert(conn('tiktok'))
  const deps = {
    store,
    media: { load: async () => ({ bytes: Buffer.alloc(0), mime: '', size: 0 }) },
    now: () => 5_000_000,
    providers: providers({
      tiktok: fakeProvider('tiktok', async () => ({ remoteId: 'pub_1', status: 'processing' }), { check: async () => ({ remoteId: '7123', status: 'published', url: 'https://tiktok/7123' }) }),
    }),
  }
  store.data.jobs.push(job({ accountId: 'tiktok:1', connectionId: 'c_tiktok', network: 'tiktok', post: { text: 'Hi', media: [{ url: 'https://cdn/v.mp4', kind: 'video' }], options: { tiktok: { privacy: 'SELF_ONLY' } } } }))
  await runJob(deps, store.job('j1')!)
  assert.equal(store.job('j1')!.status, 'processing')
  assert.deepEqual(dueJobs(store, 5_000_000 + 60_000).map((j) => j.id), ['j1'])
  await runJob(deps, store.job('j1')!)
  assert.deepEqual([store.job('j1')!.status, store.job('j1')!.result?.url, store.job('j1')!.attempts], ['published', 'https://tiktok/7123', 1])
})

test('HTTP API: key, CORS, connect popup, media, posts and jobs', async () => {
  const dir = await tmp()
  const config = readConfig({ PUBLISHER_PUBLIC_URL: 'http://pub.test', PUBLISHER_APP_ORIGIN: 'https://app.test', PUBLISHER_API_KEY: 'k'.repeat(32), PUBLISHER_SECRET: 's'.repeat(40), PUBLISHER_DATA_DIR: dir })
  const store = await new Store(dir, KEY).load()
  const media = new MediaLibrary(dir, store, config.publicUrl, config.maxMediaBytes)
  let published = 0
  const server = createServer(
    createHandler(config, { store, media, providers: providers({ linkedin: fakeProvider('linkedin', async () => (published++, { remoteId: 'urn:li:share:1', status: 'published', url: 'https://li/1' })) }) }),
  )
  await new Promise<void>((r) => server.listen(0, r))
  after(() => server.close())
  setFetch((input, init) => fetch(input, init))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const auth = { authorization: `Bearer ${'k'.repeat(32)}`, origin: 'https://app.test' }

  const health = await fetch(`${base}/health`).then(json)
  assert.equal(health.ok, true)
  assert.equal((await fetch(`${base}/api/accounts`)).status, 401)
  const pre = await fetch(`${base}/api/posts`, { method: 'OPTIONS', headers: { origin: 'https://app.test' } })
  assert.equal(pre.headers.get('access-control-allow-origin'), 'https://app.test')
  const evil = await fetch(`${base}/health`, { headers: { origin: 'https://evil.test' } })
  assert.equal(evil.headers.get('access-control-allow-origin'), null)

  // Connect: the app gets a sign-in URL; the network sends the person back to the callback with the state.
  const { url } = await fetch(`${base}/api/connect/linkedin`, { method: 'POST', headers: auth }).then(json)
  const state = new URL(url).searchParams.get('state')!
  const page = await fetch(`${base}/auth/linkedin/callback?code=abc&state=${state}`).then((r) => r.text())
  assert.match(page, /"type":"kataru:publisher","ok":true/)
  assert.match(page, /postMessage\(.*"https:\/\/app\.test"\)/)
  assert.equal((await fetch(`${base}/auth/linkedin/callback?code=abc&state=${state}`)).status, 400, 'a state works once')
  const accounts = await fetch(`${base}/api/accounts`, { headers: auth }).then(json)
  assert.deepEqual(accounts.map((a: { id: string }) => a.id), ['linkedin:9'])
  assert.ok(!JSON.stringify(accounts).includes('"new"'), 'no tokens in the API')

  // Media: uploaded, then served publicly for the networks to fetch.
  const up = await fetch(`${base}/api/media`, { method: 'POST', headers: { ...auth, 'content-type': 'image/jpeg' }, body: Buffer.from('jpegbytes') }).then(json)
  assert.match(up.url, /^http:\/\/pub\.test\/media\/m_/)
  assert.equal(await fetch(`${base}/media/${up.id}`).then((r) => r.text()), 'jpegbytes')
  assert.equal((await fetch(`${base}/api/media`, { method: 'POST', headers: { ...auth, 'content-type': 'text/html' }, body: 'x' })).status, 400)

  // Posts: rejected up front when a network would refuse, otherwise queued and run.
  const bad = await fetch(`${base}/api/posts`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ accountIds: ['linkedin:9', 'x:1'], post: { text: '', media: [] } }) })
  assert.equal(bad.status, 422)
  assert.deepEqual((await json(bad)).issues.map((i: { accountId: string }) => i.accountId), ['linkedin:9', 'x:1'])
  const ok = await fetch(`${base}/api/posts`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ accountIds: ['linkedin:9'], post: { text: 'Hello', media: [] }, ref: 'p1' }) }).then(json)
  await new Promise((r) => setTimeout(r, 50))
  const jobs = await fetch(`${base}/api/posts/${ok.batchId}`, { headers: auth }).then(json)
  assert.deepEqual([jobs[0].status, jobs[0].result.url, published], ['published', 'https://li/1', 1])

  const later = await fetch(`${base}/api/posts`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ accountIds: ['linkedin:9'], post: { text: 'Later', media: [] }, publishAt: '2099-01-01T09:00:00Z' }) }).then(json)
  assert.equal(later.jobs[0].status, 'scheduled')
  const canceled = await fetch(`${base}/api/jobs/${later.jobs[0].id}`, { method: 'DELETE', headers: auth }).then(json)
  assert.equal(canceled.status, 'canceled')
  assert.deepEqual((await fetch(`${base}/api/jobs?ref=p1`, { headers: auth }).then(json)).map((j: { ref: string }) => j.ref), ['p1'])
})
