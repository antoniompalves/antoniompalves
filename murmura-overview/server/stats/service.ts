import { READABLE, parsePostLink, statsDue } from '../../src/data/postLinks.ts'
import type { WorkspaceAction } from '../../src/data/reducer.ts'
import type { LiveStats, Workspace } from '../../src/data/types.ts'
import type { Db } from '../db.ts'
import { upsert } from '../db.ts'
import type { Connection } from '../providers/types.ts'
import type { Job } from '../store.ts'
import type { Hub } from '../workspace/hub.ts'
import { readStats } from './read.ts'

/**
 * Keeps live posts' numbers fresh: every few minutes, the posts and creator
 * deliverables with a link whose numbers are due (hourly for two days, daily
 * to 30 days, then never: postLinks.statsDue) are read, at most a few dozen
 * at a time. The latest numbers go into the workspace; one snapshot per day
 * goes into kt_stats, for the curve in the drawer.
 */

export type StatsKind = 'post' | 'deliverable'

export interface StatsDeps {
  db: Db
  hub: Hub
  now: () => number
  fetch: typeof fetch
  log: (s: string) => void
  metaVersion: string
  youtubeKey?: string
  /** The publishing service's connections and jobs (none in planner mode). */
  source?: () => { connections: Connection[]; jobs: Job[] }
}

export interface Target {
  kind: StatsKind
  id: string
  link: string
  publishedAt: number
  prev?: LiveStats
  handle?: string
}

const PER_TICK = 30
const SYSTEM = { userId: null, memberId: null }

/** Everything in the workspace with a link to read. */
export function targets(ws: Workspace): Target[] {
  const out: Target[] = []
  for (const p of ws.posts) if (p.status === 'published' && p.publishedUrl) out.push({ kind: 'post', id: p.id, link: p.publishedUrl, publishedAt: Date.parse(p.scheduledAt), prev: p.liveStats })
  for (const d of ws.deliverables)
    if (d.url) {
      const creator = ws.creators.find((c) => c.id === d.creatorId)
      out.push({ kind: 'deliverable', id: d.id, link: d.url, publishedAt: Date.parse(d.postedAt ?? d.dueAt), prev: d.liveStats, handle: creator?.profiles.find((x) => x.network === d.network)?.handle })
    }
  return out
}

export function createStats(deps: StatsDeps) {
  let busy = false
  const context = (handle?: string) => ({ fetch: deps.fetch, now: deps.now(), metaVersion: deps.metaVersion, youtubeKey: deps.youtubeKey, ...(deps.source?.() ?? { connections: [], jobs: [] }), handle })

  async function snapshot(t: Target, s: LiveStats) {
    if (s.error) return
    const day = s.at.slice(0, 10)
    const numbers = Object.fromEntries((['views', 'reach', 'likes', 'comments', 'shares', 'saves'] as const).filter((k) => s[k] !== undefined).map((k) => [k, s[k]]))
    await upsert(deps.db, 'kt_stats', ['kind', 'id', 'day'], { kind: t.kind, id: t.id, day, data: JSON.stringify(numbers) })
  }

  async function read(t: Target) {
    const s = await readStats(t.link, t.prev, context(t.handle))
    await snapshot(t, s)
    return s
  }

  /** Reads what's due; returns how many were read. */
  async function tick() {
    if (busy || !deps.hub.ready) return 0
    busy = true
    try {
      await deps.hub.sync()
      const now = deps.now()
      const due = targets(deps.hub.ws!)
        .filter((t) => READABLE.includes(parsePostLink(t.link)?.network ?? 'x') && t.prev?.source !== 'manual' && statsDue(t.publishedAt, t.prev ? Date.parse(t.prev.at) : undefined, now))
        .sort((a, b) => (a.prev ? Date.parse(a.prev.at) : 0) - (b.prev ? Date.parse(b.prev.at) : 0))
        .slice(0, PER_TICK)
      if (!due.length) return 0
      const actions: WorkspaceAction[] = []
      for (const t of due) actions.push({ type: 'liveStats', kind: t.kind, id: t.id, stats: await read(t) })
      await deps.hub.apply(SYSTEM, actions)
      return due.length
    } catch (e) {
      deps.log(`[stats] ${(e as Error).message}`)
      return 0
    } finally {
      busy = false
    }
  }

  /** "Refresh now" for one item. */
  async function refresh(kind: StatsKind, id: string) {
    await deps.hub.sync()
    const t = targets(deps.hub.ws!).find((x) => x.kind === kind && x.id === id)
    if (!t) return null
    const s = await read({ ...t, prev: t.prev?.source === 'manual' ? undefined : t.prev })
    await deps.hub.apply(SYSTEM, [{ type: 'liveStats', kind, id, stats: s }])
    return s
  }

  async function history(kind: StatsKind, id: string) {
    const rows = await deps.db.all<{ day: string; data: string }>('SELECT day, data FROM kt_stats WHERE kind = ? AND id = ? ORDER BY day ASC', [kind, id])
    return rows.map((r) => ({ day: r.day, ...(JSON.parse(r.data) as Omit<LiveStats, 'at' | 'source'>) }))
  }

  return { tick, refresh, history }
}

export type Stats = ReturnType<typeof createStats>
