import type { Brand, Channel, NetworkId, Post, PostMetrics, Workspace } from './types'
import type { NetworkSeries, Range } from './analyticsData'

/**
 * View model for #/analytics. Everything is computed from the workspace: the
 * 19 channels (followers, status), the published posts' metrics and the daily
 * per-network series, for a date range and an optional network filter. The
 * rules (what counts as "in range", how rates are averaged, how ties sort) are
 * the ones the reference page follows, checked figure by figure.
 */

export type { Range }
export const RANGES: Range[] = [7, 30, 90]
export type SeriesMetric = keyof NetworkSeries

const DAY = 86_400_000

/** Order the analytics page lists networks in (chips, heatmap filter, CSV). */
export const ANALYTICS_NETWORKS: NetworkId[] = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'threads']

export const engagements = (m: PostMetrics) => m.likes + m.comments + m.shares + m.saves
export const engagementRate = (m: PostMetrics) => (m.reach > 0 ? engagements(m) / m.reach : 0)

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0)
/** Change from `before` to `after` as a fraction, or null when there's nothing to compare with. */
const change = (after: number, before: number) => (before > 0 ? (after - before) / before : null)
/** Growth of an audience that is `total` today after gaining `gained`. */
const growthOf = (total: number, gained: number) => (total - gained > 0 ? gained / (total - gained) : 0)

/** Networks that have at least one connected account, in page order. */
export function activeNetworks(ws: Workspace) {
  return ANALYTICS_NETWORKS.filter((n) => ws.channels.some((c) => c.network === n))
}

/**
 * Daily totals of a metric across `nets` for the `range` days ending today
 * (`offset` 1 = the range before that), oldest first.
 */
export function daily(ws: Workspace, nets: NetworkId[], metric: SeriesMetric, range: Range, offset = 0) {
  return Array.from({ length: range }, (_, i) =>
    sum(
      nets.map((n) => {
        const s = ws.analytics.series[n][metric]
        return s[s.length - (offset + 1) * range + i] ?? 0
      }),
    ),
  )
}

/** Published posts with reach that went out in the `range` days before `now`, oldest first, optionally only those sent to `net`. */
export function publishedIn(ws: Workspace, now: Date, range: Range, net: NetworkId | null) {
  const end = now.getTime()
  const start = end - range * DAY
  return ws.posts
    .filter((p): p is Post & { metrics: PostMetrics } => {
      const at = Date.parse(p.scheduledAt)
      return p.status === 'published' && !!p.metrics && p.metrics.reach > 0 && at >= start && at < end && (!net || p.networks.includes(net))
    })
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
}

const avgRate = (posts: { metrics: PostMetrics }[]) => mean(posts.map((p) => engagementRate(p.metrics)))

export interface TableRow {
  key: string
  network: NetworkId
  /** Set on account rows (network filter on). */
  channel?: Channel
  brand?: Brand
  accounts: number
  followers: number
  growth: number
  impressions: number
  engagementRate: number
  posts: number
  /** Follower curve over the range, 0–1. */
  trend: number[]
}

/** One row per network with accounts, biggest audience first: the "By network" table and the overview's network pulse. */
export function networkRows(ws: Workspace, now: Date, range: Range): TableRow[] {
  return activeNetworks(ws)
    .map((network) => {
      const channels = ws.channels.filter((c) => c.network === network)
      const followers = sum(channels.map((c) => c.followers))
      const posts = publishedIn(ws, now, range, network)
      return {
        key: network,
        network,
        accounts: channels.length,
        followers,
        growth: growthOf(followers, sum(daily(ws, [network], 'followers', range))),
        impressions: sum(daily(ws, [network], 'impressions', range)),
        engagementRate: avgRate(posts),
        posts: posts.length,
        trend: ws.analytics.networkTrends[network][range].map((v) => v / 1000),
      }
    })
    .sort((a, b) => b.followers - a.followers)
}

/** One row per account on `network`: the table once a network is picked. */
function accountRows(ws: Workspace, now: Date, range: Range, network: NetworkId): TableRow[] {
  const posts = publishedIn(ws, now, range, network)
  return ws.channels
    .filter((c) => c.network === network)
    .map((channel) => {
      const stats = ws.analytics.accounts[channel.id][range]
      const own = posts.filter((p) => p.brandId === channel.brandId)
      return {
        key: channel.id,
        network,
        channel,
        brand: ws.brands.find((b) => b.id === channel.brandId),
        accounts: 1,
        followers: channel.followers,
        growth: growthOf(channel.followers, stats.gained),
        impressions: stats.impressions,
        engagementRate: avgRate(own),
        posts: own.length,
        trend: stats.trend.map((v) => v / 1000),
      }
    })
    .sort((a, b) => b.followers - a.followers)
}

export interface HeatSlot {
  /** Weekday, 0 = Monday. */
  day: number
  hour: number
  value: number
}

/** Engagement per weekday × hour (168 values, 0–1) and its three best slots. */
export function heatFor(ws: Workspace, net: NetworkId | null) {
  const cells = ws.analytics.heat[net ?? 'all'].map((v) => v / 10_000)
  const best: HeatSlot[] = cells
    .map((value, i) => ({ value, i }))
    .sort((a, b) => b.value - a.value || a.i - b.i)
    .slice(0, 3)
    .map(({ value, i }) => ({ day: Math.floor(i / 24), hour: i % 24, value }))
  return { cells, best }
}

export type TopBy = 'reach' | 'eng' | 'clicks'
export const topValue = (m: PostMetrics, by: TopBy) => (by === 'reach' ? m.reach : by === 'eng' ? engagementRate(m) : m.clicks)

export type BrandBy = 'followers' | 'eng' | 'impressions'

export interface BrandRow {
  brand: Brand
  accounts: number
  posts: number
  /** Null when the brand has no account in this view. */
  followers: number | null
  impressions: number
  engagementRate: number
}

export const brandValue = (r: BrandRow, by: BrandBy) => (by === 'followers' ? r.followers ?? 0 : by === 'eng' ? r.engagementRate : r.impressions)

/** Everything #/analytics shows for a range and an optional network. */
export function selectAnalytics(ws: Workspace, now: Date, range: Range, net: NetworkId | null) {
  const nets = net ? [net] : activeNetworks(ws)
  const channels = ws.channels.filter((c) => !net || c.network === net)
  const audience = sum(channels.map((c) => c.followers))
  const posts = publishedIn(ws, now, range, net)

  // The days on the x axis: the range, ending today.
  const today = new Date(now)
  today.setUTCHours(0, 0, 0, 0)
  const days = Array.from({ length: range }, (_, i) => new Date(today.getTime() - (range - 1 - i) * DAY))

  const gainedDaily = daily(ws, nets, 'followers', range)
  const gainedBefore = daily(ws, nets, 'followers', range, 1)
  const gained = sum(gainedDaily)
  const cumulative = (xs: number[]) => xs.map((_, i) => sum(xs.slice(0, i + 1)))

  const metric = (m: Exclude<SeriesMetric, 'followers'>) => {
    const current = daily(ws, nets, m, range)
    const previous = daily(ws, nets, m, range, 1)
    return { current, previous, total: sum(current), change: change(sum(current), sum(previous)) }
  }

  // Content mix: deliveries per network, most first; ties keep the order they first went out in.
  const counts = new Map<NetworkId, number>()
  for (const p of posts) for (const n of p.networks) if (!net || n === net) counts.set(n, (counts.get(n) ?? 0) + 1)
  const mixRows = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const deliveries = sum(mixRows.map(([, c]) => c))
  const mixMax = Math.max(1, ...mixRows.map(([, c]) => c))

  const brands: BrandRow[] = ws.brands.map((brand) => {
    const own = channels.filter((c) => c.brandId === brand.id)
    const brandPosts = posts.filter((p) => p.brandId === brand.id)
    return {
      brand,
      accounts: own.length,
      posts: brandPosts.length,
      followers: own.length ? sum(own.map((c) => c.followers)) : null,
      impressions: sum(own.map((c) => ws.analytics.accounts[c.id][range].impressions)),
      engagementRate: avgRate(brandPosts),
    }
  })

  return {
    range,
    network: net,
    days,
    stats: {
      audience,
      accounts: channels.length,
      gained,
      growth: growthOf(audience, gained),
      impressions: sum(daily(ws, nets, 'impressions', range)),
      engagementRate: avgRate(posts),
      posts: posts.length,
    },
    growth: {
      gained,
      vsBefore: change(gained, sum(gainedBefore)),
      current: cumulative(gainedDaily),
      previous: cumulative(gainedBefore),
    },
    metrics: { impressions: metric('impressions'), engagements: metric('engagements'), clicks: metric('clicks') },
    heat: heatFor(ws, net),
    mix: {
      posts: posts.length,
      deliveries,
      rows: mixRows.map(([network, count]) => ({ network, count, share: count / Math.max(1, deliveries), fill: count / mixMax })),
    },
    table: net ? accountRows(ws, now, range, net) : networkRows(ws, now, range),
    posts,
    brands,
    chips: [
      { network: null, accounts: ws.channels.length },
      ...activeNetworks(ws).map((n) => ({ network: n, accounts: ws.channels.filter((c) => c.network === n).length })),
    ],
  }
}

export type AnalyticsModel = ReturnType<typeof selectAnalytics>
