import { parsePostLink } from '../../src/data/postLinks.ts'
import type { PostRef } from '../../src/data/postLinks.ts'
import type { LiveStats, StatsError } from '../../src/data/types.ts'
import type { Account, Connection } from '../providers/types.ts'
import type { Job } from '../store.ts'

/**
 * Reads a live post's numbers from its link (docs/STATS.md):
 *
 * - the brand's own accounts, through the connections made for publishing:
 *   Instagram and Facebook (Meta insights), Threads, TikTok — full numbers;
 * - YouTube, for any public video, with YOUTUBE_API_KEY (or a connected channel);
 * - Instagram posts of other professional accounts (creators), public
 *   likes and comments through "business discovery", with their handle;
 * - LinkedIn, X and Pinterest aren't read: those are logged by hand.
 *
 * Metric names as of late 2026: Instagram `views, reach, likes, comments,
 * shares, saved` (impressions and plays are gone); Facebook
 * `post_media_view` and `post_total_media_view_unique` (post_impressions*
 * retired); Threads `views, likes, replies, reposts, quotes, shares`.
 */

export interface ReadContext {
  fetch: typeof fetch
  now: number
  metaVersion: string
  youtubeKey?: string
  connections: Connection[]
  jobs: Job[]
  /** The creator's handle on this network (deliverables), for public numbers. */
  handle?: string
}

type Numbers = Omit<LiveStats, 'at' | 'source' | 'error' | 'remoteId'>

class ReadError extends Error {
  code: StatsError
  constructor(code: StatsError, message: string = code) {
    super(message)
    this.code = code
  }
}

const THREADS = 'https://graph.threads.com/v1.0'
const TIKTOK = 'https://open.tiktokapis.com/v2'
const YOUTUBE = 'https://www.googleapis.com/youtube/v3'
const PAGES = 4

async function getJson(ctx: ReadContext, url: string, init?: RequestInit): Promise<any> {
  let res: Response
  try {
    res = await ctx.fetch(url, { ...init, signal: AbortSignal.timeout(15_000) })
  } catch {
    throw new ReadError('failed', 'network unreachable')
  }
  const body = (await res.json().catch(() => ({}))) as any
  // TikTok answers every call with an `error` object: code "ok" means fine.
  if (res.ok && (!body?.error?.code || body.error.code === 'ok')) return body
  const err = body?.error ?? {}
  const code = Number(err.code ?? 0)
  // Meta: 190 expired token, 10 / 200-299 permissions; TikTok: access_token_invalid, scope_not_authorized.
  if (res.status === 401 || code === 190 || code === 10 || (code >= 200 && code < 300) || /token|scope|permission/i.test(String(err.code ?? '') + String(err.type ?? ''))) throw new ReadError('auth', err.message ?? `HTTP ${res.status}`)
  if (res.status === 404 || code === 100 || code === 803) throw new ReadError('notFound', err.message ?? `HTTP ${res.status}`)
  throw new ReadError('failed', err.message ?? `HTTP ${res.status}`)
}

const q = (params: Record<string, string>) => new URLSearchParams(params).toString()
const num = (v: unknown) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v))
const sum = (...vs: (number | undefined)[]) => (vs.every((v) => v === undefined) ? undefined : vs.reduce<number>((s, v) => s + (v ?? 0), 0))

/** Insights rows → { metric: value } (an empty set means "not yet", not zero). */
function insights(body: any): Record<string, number | undefined> {
  const out: Record<string, number | undefined> = {}
  for (const row of body?.data ?? []) out[row.name] = num(row.total_value?.value ?? row.values?.[0]?.value)
  return out
}

const accountsOf = (ctx: ReadContext, network: string) =>
  ctx.connections.filter((c) => c.status !== 'expired').flatMap((c) => c.accounts.filter((a) => a.network === network).map((a) => ({ connection: c, account: a })))

/** Posts Kataru published itself carry the network's id already. */
function fromJobs(ctx: ReadContext, ref: PostRef) {
  const job = ctx.jobs.find((j) => j.network === ref.network && j.result?.remoteId && j.result.url && parsePostLink(j.result.url)?.id === ref.id)
  return job ? { accountId: job.accountId, remoteId: job.result!.remoteId } : null
}

/* ───────────── Instagram ───────────── */

async function instagram(ctx: ReadContext, ref: PostRef, known?: string): Promise<{ n: Numbers; remoteId: string; source: LiveStats['source'] }> {
  const graph = `https://graph.facebook.com/${ctx.metaVersion}`
  const accounts = accountsOf(ctx, 'instagram').filter((x) => x.account.token)
  const read = async (account: Account, mediaId: string) => {
    let m: Record<string, number | undefined>
    try {
      m = insights(await getJson(ctx, `${graph}/${mediaId}/insights?${q({ metric: 'views,reach,likes,comments,shares,saved', access_token: account.token! })}`))
    } catch (e) {
      // Some media (stories, albums' parts) take other metrics: fall back to the public counts.
      if (!(e instanceof ReadError) || e.code !== 'notFound') throw e
      const f = await getJson(ctx, `${graph}/${mediaId}?${q({ fields: 'like_count,comments_count', access_token: account.token! })}`)
      m = { likes: num(f.like_count), comments: num(f.comments_count) }
    }
    return { views: m.views, reach: m.reach, likes: m.likes, comments: m.comments, shares: m.shares, saves: m.saved }
  }
  // Already found once: straight to it.
  const [accId, mediaId] = (known ?? '').split('|')
  const knownAcc = accounts.find((x) => x.account.id === accId)
  if (knownAcc && mediaId) return { n: await read(knownAcc.account, mediaId), remoteId: known!, source: 'own' }
  const job = fromJobs(ctx, ref)
  const jobAcc = job && accounts.find((x) => x.account.id === job.accountId)
  if (job && jobAcc) return { n: await read(jobAcc.account, job.remoteId), remoteId: `${jobAcc.account.id}|${job.remoteId}`, source: 'own' }
  // Look through each connected account's recent posts.
  for (const { account } of accounts) {
    let next: string | undefined = `${graph}/${account.remoteId}/media?${q({ fields: 'id,shortcode', limit: '50', access_token: account.token! })}`
    for (let page = 0; next && page < PAGES; page++) {
      const body: any = await getJson(ctx, next)
      const hit = (body.data ?? []).find((x: { shortcode?: string }) => x.shortcode === ref.id)
      if (hit) return { n: await read(account, hit.id), remoteId: `${account.id}|${hit.id}`, source: 'own' }
      next = body.paging?.next
    }
  }
  // Someone else's professional account (a creator): public likes and comments.
  const handle = (ref.handle ?? ctx.handle)?.replace(/^@/, '')
  const via = accounts[0]
  if (!handle || !via) throw new ReadError('notOwn')
  const body = await getJson(ctx, `${graph}/${via.account.remoteId}?${q({ fields: `business_discovery.username(${handle}){media.limit(100){shortcode,like_count,comments_count}}`, access_token: via.account.token! })}`)
  const hit = (body.business_discovery?.media?.data ?? []).find((x: { shortcode?: string }) => x.shortcode === ref.id)
  if (!hit) throw new ReadError('notFound')
  return { n: { likes: num(hit.like_count), comments: num(hit.comments_count) }, remoteId: `public|${hit.id}`, source: 'public' }
}

/* ───────────── Facebook ───────────── */

async function facebook(ctx: ReadContext, ref: PostRef, known?: string): Promise<{ n: Numbers; remoteId: string; source: LiveStats['source'] }> {
  const graph = `https://graph.facebook.com/${ctx.metaVersion}`
  const pages = accountsOf(ctx, 'facebook').filter((x) => x.account.token)
  if (!pages.length) throw new ReadError('notOwn')
  const read = async (account: Account, postId: string) => {
    const f = await getJson(ctx, `${graph}/${postId}?${q({ fields: 'reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares', access_token: account.token! })}`)
    let m: Record<string, number | undefined> = {}
    try {
      m = insights(await getJson(ctx, `${graph}/${postId}/insights?${q({ metric: 'post_media_view,post_total_media_view_unique', access_token: account.token! })}`))
    } catch (e) {
      // Videos and reels have their own metrics; the counts above still stand.
      if (!(e instanceof ReadError) || e.code === 'auth') throw e
    }
    return { views: m.post_media_view, reach: m.post_total_media_view_unique, likes: num(f.reactions?.summary?.total_count), comments: num(f.comments?.summary?.total_count), shares: num(f.shares?.count) ?? (f.reactions ? 0 : undefined) }
  }
  const [accId, postId] = (known ?? '').split('|')
  const knownAcc = pages.find((x) => x.account.id === accId)
  if (knownAcc && postId) return { n: await read(knownAcc.account, postId), remoteId: known!, source: 'own' }
  const job = fromJobs(ctx, ref)
  const jobAcc = job && pages.find((x) => x.account.id === job.accountId)
  if (job && jobAcc) return { n: await read(jobAcc.account, job.remoteId), remoteId: `${jobAcc.account.id}|${job.remoteId}`, source: 'own' }
  for (const { account } of pages) {
    // Numeric ids: "{page}_{post}" for posts, the id itself for videos and reels.
    if (/^\d+$/.test(ref.id))
      for (const id of [`${account.remoteId}_${ref.id}`, ref.id]) {
        try {
          const probe = await getJson(ctx, `${graph}/${id}?${q({ fields: 'id', access_token: account.token! })}`)
          if (probe.id) return { n: await read(account, probe.id), remoteId: `${account.id}|${probe.id}`, source: 'own' }
        } catch (e) {
          if (!(e instanceof ReadError) || e.code === 'auth') throw e
        }
      }
    // Otherwise (pfbid… links): match the page's recent posts by their link.
    let next: string | undefined = `${graph}/${account.remoteId}/posts?${q({ fields: 'id,permalink_url', limit: '100', access_token: account.token! })}`
    for (let page = 0; next && page < PAGES; page++) {
      const body: any = await getJson(ctx, next)
      const hit = (body.data ?? []).find((x: { id: string; permalink_url?: string }) => x.permalink_url?.includes(ref.id) || x.id.endsWith(`_${ref.id}`))
      if (hit) return { n: await read(account, hit.id), remoteId: `${account.id}|${hit.id}`, source: 'own' }
      next = body.paging?.next
    }
  }
  throw new ReadError('notOwn')
}

/* ───────────── Threads ───────────── */

async function threads(ctx: ReadContext, ref: PostRef, known?: string): Promise<{ n: Numbers; remoteId: string; source: LiveStats['source'] }> {
  const all = accountsOf(ctx, 'threads')
  if (!all.length) throw new ReadError('notOwn')
  const read = async (token: string, mediaId: string) => {
    const m = insights(await getJson(ctx, `${THREADS}/${mediaId}/insights?${q({ metric: 'views,likes,replies,reposts,quotes,shares', access_token: token })}`))
    return { views: m.views, likes: m.likes, comments: m.replies, shares: sum(m.reposts, m.quotes, m.shares) }
  }
  const [accId, mediaId] = (known ?? '').split('|')
  const knownAcc = all.find((x) => x.account.id === accId)
  if (knownAcc && mediaId) return { n: await read(knownAcc.connection.tokens.accessToken, mediaId), remoteId: known!, source: 'own' }
  const job = fromJobs(ctx, ref)
  const jobAcc = job && all.find((x) => x.account.id === job.accountId)
  if (job && jobAcc) return { n: await read(jobAcc.connection.tokens.accessToken, job.remoteId), remoteId: `${jobAcc.account.id}|${job.remoteId}`, source: 'own' }
  for (const { connection, account } of all) {
    let next: string | undefined = `${THREADS}/${account.remoteId}/threads?${q({ fields: 'id,shortcode', limit: '50', access_token: connection.tokens.accessToken })}`
    for (let page = 0; next && page < PAGES; page++) {
      const body: any = await getJson(ctx, next)
      const hit = (body.data ?? []).find((x: { shortcode?: string }) => x.shortcode === ref.id)
      if (hit) return { n: await read(connection.tokens.accessToken, hit.id), remoteId: `${account.id}|${hit.id}`, source: 'own' }
      next = body.paging?.next
    }
  }
  throw new ReadError('notOwn')
}

/* ───────────── TikTok ───────────── */

async function tiktok(ctx: ReadContext, ref: PostRef): Promise<{ n: Numbers; remoteId: string; source: LiveStats['source'] }> {
  const all = accountsOf(ctx, 'tiktok')
  if (!all.length) throw new ReadError('notOwn')
  // The video query only answers for the signed-in creator's own videos.
  for (const { connection, account } of all) {
    const body = await getJson(ctx, `${TIKTOK}/video/query/?${q({ fields: 'id,view_count,like_count,comment_count,share_count' })}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${connection.tokens.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ filters: { video_ids: [ref.id] } }),
    })
    const v = body.data?.videos?.[0]
    if (v) return { n: { views: num(v.view_count), likes: num(v.like_count), comments: num(v.comment_count), shares: num(v.share_count) }, remoteId: `${account.id}|${v.id}`, source: 'own' }
  }
  throw new ReadError('notOwn')
}

/* ───────────── YouTube ───────────── */

async function youtube(ctx: ReadContext, ref: PostRef): Promise<{ n: Numbers; remoteId: string; source: LiveStats['source'] }> {
  const channel = accountsOf(ctx, 'youtube')[0]
  if (!ctx.youtubeKey && !channel) throw new ReadError('noKey')
  const body = ctx.youtubeKey
    ? await getJson(ctx, `${YOUTUBE}/videos?${q({ part: 'statistics', id: ref.id, key: ctx.youtubeKey })}`)
    : await getJson(ctx, `${YOUTUBE}/videos?${q({ part: 'statistics', id: ref.id })}`, { headers: { authorization: `Bearer ${channel!.connection.tokens.accessToken}` } })
  const s = body.items?.[0]?.statistics
  if (!s) throw new ReadError('notFound')
  // Public counts are the same for everyone; a connected channel adds nothing more here.
  return { n: { views: num(s.viewCount), likes: num(s.likeCount), comments: num(s.commentCount) }, remoteId: ref.id, source: 'public' }
}

const READERS: Partial<Record<PostRef['network'], (ctx: ReadContext, ref: PostRef, known?: string) => Promise<{ n: Numbers; remoteId: string; source: LiveStats['source'] }>>> = {
  instagram,
  facebook,
  threads,
  tiktok,
  youtube,
}

/** The link's numbers now; on failure, the reason (and what was found so far). Never throws. */
export async function readStats(link: string, prev: LiveStats | undefined, ctx: ReadContext): Promise<LiveStats> {
  const at = new Date(ctx.now).toISOString()
  const ref = parsePostLink(link)
  const fail = (error: StatsError): LiveStats => ({ source: prev?.source ?? 'own', at, error, ...(prev?.remoteId && { remoteId: prev.remoteId }) })
  if (!ref) return fail('link')
  const reader = READERS[ref.network]
  if (!reader) return fail('unsupported')
  try {
    const known = prev?.remoteId && prev.source !== 'manual' && !prev.remoteId.startsWith('public|') ? prev.remoteId : undefined
    const { n, remoteId, source } = await reader(ctx, ref, known)
    const clean = Object.fromEntries(Object.entries(n).filter(([, v]) => v !== undefined)) as Numbers
    return { at, source, ...clean, remoteId }
  } catch (e) {
    return fail(e instanceof ReadError ? e.code : 'failed')
  }
}
