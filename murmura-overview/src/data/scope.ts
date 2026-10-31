import { seesBrand } from './permissions'
import type { Range } from './analyticsData'
import type { AnalyticsHistory, Channel, NetworkId, Workspace } from './types'

const RANGES: Range[] = [7, 30, 90]
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/**
 * The analytics history is kept per network across every brand, with exact
 * 7/30/90-day totals per account. For a subset of accounts each network's
 * daily series is rescaled window by window (last 7 days, the 23 before,
 * the 60 before, the older half) so those totals come out exact; the curve
 * keeps the network's shape. Each network's trend becomes its accounts'
 * curves weighted by what they gained.
 */
function scopeAnalytics(a: AnalyticsHistory, every: Channel[], shown: Channel[]): AnalyticsHistory {
  const series = { ...a.series }
  const networkTrends = { ...a.networkTrends }
  for (const n of Object.keys(a.series) as NetworkId[]) {
    const all = every.filter((c) => c.network === n)
    const vis = shown.filter((c) => c.network === n)
    if (vis.length === all.length) continue
    const stat = (r: Range, key: 'gained' | 'impressions') => sum(vis.map((c) => a.accounts[c.id]?.[r][key] ?? 0))
    // Per window: what the visible accounts did over what the whole network did.
    const factors = (arr: number[], key: 'gained' | 'impressions') => {
      const L = arr.length
      const tail = (k: number) => sum(arr.slice(L - k))
      const share = (v: number, d: number) => (d > 0 ? v / d : 0)
      return [share(stat(7, key), tail(7)), share(stat(30, key) - stat(7, key), tail(30) - tail(7)), share(stat(90, key) - stat(30, key), tail(90) - tail(30)), share(stat(90, key), tail(90))]
    }
    const apply = (arr: number[], [f7, f30, f90, fOld]: number[]) => {
      const L = arr.length
      return arr.map((v, i) => v * (i >= L - 7 ? f7 : i >= L - 30 ? f30 : i >= L - 90 ? f90 : fOld))
    }
    const s = a.series[n]
    const reach = factors(s.impressions, 'impressions')
    // Engagements and clicks follow the accounts' share of impressions.
    series[n] = { followers: apply(s.followers, factors(s.followers, 'gained')), impressions: apply(s.impressions, reach), engagements: apply(s.engagements, reach), clicks: apply(s.clicks, reach) }
    networkTrends[n] = Object.fromEntries(
      RANGES.map((r) => {
        const weights = vis.map((c) => a.accounts[c.id]?.[r] ?? { gained: 0, trend: [] as number[] })
        const len = Math.max(0, ...weights.map((w) => w.trend.length))
        const curve = Array.from({ length: len }, (_, i) => sum(weights.map((w) => (w.trend[i] ?? 0) * Math.max(w.gained, 1))))
        const lo = Math.min(...curve)
        const hi = Math.max(...curve)
        return [r, curve.map((v) => (hi > lo ? Math.round(((v - lo) / (hi - lo)) * 1000) : 0))]
      }),
    ) as Record<Range, number[]>
  }
  return { ...a, series, networkTrends }
}

/**
 * What the pages show: the brands the signed-in person may see, narrowed to the
 * one picked in the top bar. Everything tied to a brand (posts, channels,
 * conversations, keywords and their mentions, campaigns, websites, the
 * library) follows; people, roles, settings and the activity log don't.
 */
export function scopeView(ws: Workspace): Workspace {
  const me = ws.team.find((m) => m.id === ws.currentUserId)
  const limited = !!me && me.brands !== 'all'
  if (!ws.brandScope && !limited) return ws
  const shown = (id: string | null) => id === null || ((!me || seesBrand(me, id)) && (!ws.brandScope || ws.brandScope === id))
  const keywords = ws.keywords.filter((k) => shown(k.brandId))
  const kept = new Set(keywords.map((k) => k.id))
  const channels = ws.channels.filter((c) => shown(c.brandId))
  return {
    ...ws,
    analytics: scopeAnalytics(ws.analytics, ws.channels, channels),
    brands: ws.brands.filter((b) => shown(b.id)),
    campaigns: ws.campaigns.filter((c) => shown(c.brandId)),
    channels,
    websites: ws.websites.filter((w) => shown(w.brandId)),
    posts: ws.posts.filter((p) => shown(p.brandId)),
    conversations: ws.conversations.filter((c) => shown(c.brandId)),
    keywords,
    mentions: ws.mentions.filter((m) => kept.has(m.keywordId)),
    competitors: ws.competitors.filter((c) => shown(c.brandId)),
    media: ws.media.filter((m) => shown(m.brandId)),
    templates: ws.templates.filter((x) => shown(x.brandId)),
    hashtagSets: ws.hashtagSets.filter((h) => shown(h.brandId)),
  }
}

/** The brands someone may pick in the switcher. */
export const brandsFor = (ws: Workspace) => {
  const me = ws.team.find((m) => m.id === ws.currentUserId)
  return me ? ws.brands.filter((b) => seesBrand(me, b.id)) : ws.brands
}
