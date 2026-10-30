import type { Brand, NetworkId, Website, Workspace } from './types'
import type { Range } from './analyticsData'
import { ANALYTICS_NETWORKS } from './analytics'

/**
 * Website traffic for #/analytics, in the shape the GA4 Data API returns it:
 * daily sessions, views, engaged sessions, engagement time and key events per
 * site, split by default channel group, social network and landing page. The
 * same structure is filled either by the demo generator below or by live
 * reports (ga4.ts), so the page never knows where the numbers came from.
 */

/** Days kept per site: a 90-day range plus the 90 days before it. */
export const SITE_DAYS = 180
const DAY = 86_400_000

/** GA4 default channel groups the page lists; anything else is "other". */
export type ChannelGroup =
  | 'organicSearch'
  | 'direct'
  | 'organicSocial'
  | 'paidSocial'
  | 'referral'
  | 'email'
  | 'paidSearch'
  | 'organicVideo'
  | 'display'
  | 'other'

export interface PageHistory {
  /** Landing page path, e.g. "/collections/autumn". */
  path: string
  sessions: number[]
  engaged: number[]
  /** User engagement time, seconds. */
  seconds: number[]
  keyEvents: number[]
}

export interface SiteHistory {
  /** Last day of every series, YYYY-MM-DD. */
  end: string
  sessions: number[]
  views: number[]
  /** Engaged sessions (GA4: longer than 10 s, a key event or 2+ views). */
  engaged: number[]
  /** User engagement time, seconds. */
  seconds: number[]
  keyEvents: number[]
  channels: Partial<Record<ChannelGroup, number[]>>
  /** Sessions whose source is a social network (organic or paid). */
  social: Partial<Record<NetworkId, number[]>>
  pages: PageHistory[]
}

/* ───────────────────────── demo traffic ───────────────────────── */

interface PageProfile {
  path: string
  /** Share of search, direct, email… sessions that land here. */
  weight: number
  /** Share of social sessions that land here. */
  social: number
  /** Only lands traffic while this campaign runs (plus a trickle after it ends). */
  campaignId?: string
  /** Engagement and key-event multipliers against the site average. */
  engagement?: number
  conversion?: number
}

interface DemoProfile {
  /** Sessions per day from everything but social, at the end of the window. */
  base: number
  /** Growth of that base across the 180 days (0.2 = +20%). */
  growth: number
  /** Monday-first weekday factors. */
  week: number[]
  /** Split of the non-social sessions. */
  mix: Partial<Record<ChannelGroup, number>>
  /** Share of the brand's social link clicks that land on this site. */
  social: number
  pagesPerSession: number
  /** Engaged sessions ÷ sessions for non-social visits (social is 10 points lower). */
  engagement: number
  /** Average engagement time of an engaged session, seconds. */
  seconds: number
  /** Key events per session. */
  keyRate: number
  /** Extra traffic while one of its campaigns runs (0.2 = +20%). */
  campaignLift: number
  /** Campaign microsites: almost idle outside their campaign. */
  campaignOnly?: boolean
  pages: PageProfile[]
}

const SHOP_WEEK = [1.02, 1, 1.04, 1.06, 1, 0.9, 0.86]
const SERVICE_WEEK = [1.12, 1.08, 1.05, 1.02, 0.94, 0.86, 0.8]

const PROFILES: Record<string, DemoProfile> = {
  'web-eo': {
    base: 1250, growth: 0.22, week: SHOP_WEEK, social: 1, pagesPerSession: 2.6, engagement: 0.66, seconds: 74, keyRate: 0.024, campaignLift: 0.22,
    mix: { organicSearch: 0.44, direct: 0.28, referral: 0.09, email: 0.11, paidSearch: 0.08 },
    pages: [
      { path: '/', weight: 0.3, social: 0.12 },
      { path: '/shop/huila', weight: 0.14, social: 0.22, conversion: 1.6 },
      { path: '/autumn-harvest', weight: 0.16, social: 0.38, campaignId: 'cp1', conversion: 1.3 },
      { path: '/subscriptions', weight: 0.12, social: 0.08, conversion: 2.2 },
      { path: '/journal/brew-guide', weight: 0.14, social: 0.1, engagement: 1.2, conversion: 0.3 },
      { path: '/visit/roastery', weight: 0.06, social: 0.1, conversion: 0.5 },
    ],
  },
  'web-hh': {
    base: 2300, growth: 0.15, week: SHOP_WEEK, social: 1, pagesPerSession: 3.4, engagement: 0.69, seconds: 96, keyRate: 0.012, campaignLift: 0.18,
    mix: { organicSearch: 0.48, direct: 0.24, referral: 0.12, email: 0.09, paidSearch: 0.07 },
    pages: [
      { path: '/', weight: 0.28, social: 0.1 },
      { path: '/collections/autumn', weight: 0.18, social: 0.36, campaignId: 'cp2', conversion: 1.4 },
      { path: '/products/lag-sofa', weight: 0.16, social: 0.2, conversion: 1.7 },
      { path: '/products/pleat-lamp', weight: 0.12, social: 0.14, conversion: 1.5 },
      { path: '/journal/reading-corner', weight: 0.16, social: 0.16, engagement: 1.25, conversion: 0.3 },
      { path: '/stores', weight: 0.06, social: 0.04, conversion: 0.4 },
    ],
  },
  'web-vg': {
    base: 820, growth: 0.3, week: SERVICE_WEEK, social: 0.6, pagesPerSession: 2.2, engagement: 0.61, seconds: 68, keyRate: 0.018, campaignLift: 0.12,
    mix: { organicSearch: 0.52, direct: 0.22, referral: 0.12, email: 0.04, paidSearch: 0.1 },
    pages: [
      { path: '/', weight: 0.34, social: 0.2 },
      { path: '/ceramic-coating', weight: 0.24, social: 0.32, conversion: 1.4 },
      { path: '/paint-correction', weight: 0.18, social: 0.18, conversion: 1.3 },
      { path: '/gallery', weight: 0.14, social: 0.26, engagement: 1.3, conversion: 0.4 },
      { path: '/faq', weight: 0.1, social: 0.04, conversion: 0.6 },
    ],
  },
  'web-vg-book': {
    base: 210, growth: 0.25, week: SERVICE_WEEK, social: 0.25, pagesPerSession: 1.7, engagement: 0.72, seconds: 52, keyRate: 0.11, campaignLift: 0.45,
    mix: { organicSearch: 0.3, direct: 0.42, referral: 0.16, email: 0.12 },
    pages: [
      { path: '/', weight: 0.5, social: 0.3 },
      { path: '/november', weight: 0.35, social: 0.55, campaignId: 'cp3', conversion: 1.3 },
      { path: '/winter-protection', weight: 0.15, social: 0.15 },
    ],
  },
  'web-wb': {
    base: 1500, growth: 0.2, week: SHOP_WEEK, social: 0.7, pagesPerSession: 2.9, engagement: 0.64, seconds: 81, keyRate: 0.021, campaignLift: 0.15,
    mix: { organicSearch: 0.46, direct: 0.26, referral: 0.1, email: 0.1, paidSearch: 0.08 },
    pages: [
      { path: '/', weight: 0.3, social: 0.14 },
      { path: '/products/bloom-oil', weight: 0.24, social: 0.34, conversion: 1.6 },
      { path: '/products/spring-ritual-set', weight: 0.14, social: 0.26, campaignId: 'cp4', conversion: 1.5 },
      { path: '/lab', weight: 0.12, social: 0.14, engagement: 1.2, conversion: 0.4 },
      { path: '/journal/calendula', weight: 0.2, social: 0.12, engagement: 1.15, conversion: 0.3 },
    ],
  },
  'web-wb-ritual': {
    base: 55, growth: 0, week: SHOP_WEEK, social: 0.3, pagesPerSession: 1.6, engagement: 0.58, seconds: 49, keyRate: 0.06, campaignLift: 8, campaignOnly: true,
    mix: { organicSearch: 0.22, direct: 0.36, referral: 0.12, email: 0.3 },
    pages: [
      { path: '/', weight: 0.55, social: 0.35 },
      { path: '/giveaway', weight: 0.3, social: 0.55, campaignId: 'cp4', conversion: 2.4 },
      { path: '/ingredients', weight: 0.15, social: 0.1, engagement: 1.2, conversion: 0.3 },
    ],
  },
}

/** Deterministic pseudo-random numbers (mulberry32) so demo traffic is the same on every load. */
function rng(seed: string) {
  let a = [...seed].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Split an integer total in proportion to weights, keeping the sum exact (largest remainder). */
export function allocate(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0 || total <= 0) return weights.map(() => 0)
  const raw = weights.map((w) => (total * w) / sum)
  const out = raw.map(Math.floor)
  let left = total - out.reduce((a, b) => a + b, 0)
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0])
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k][1]]++
  return out
}

export const dayKey = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Demo traffic for one of the mock's sites. Social sessions are the brand's
 * share (by followers) of each network's daily link clicks from the analytics
 * series, so a brand only gets visits from networks it is on; campaign pages
 * only draw traffic while their campaign runs.
 */
export function demoHistory(ws: Workspace, site: Website): SiteHistory | null {
  const p = PROFILES[site.id]
  if (!p) return null
  const random = rng(site.id)
  const noise = (spread: number) => 1 + (random() - 0.5) * spread
  const end = new Date(ws.now)
  end.setUTCHours(0, 0, 0, 0)

  // This site's slice of the brand's social traffic (campaign microsites take theirs only while live).
  const siblings = ws.websites.filter((w) => w.brandId === site.brandId && PROFILES[w.id])
  const followers = (n: NetworkId, brandId?: string) =>
    ws.channels.filter((c) => c.network === n && (!brandId || c.brandId === brandId)).reduce((sum, c) => sum + c.followers, 0)
  const brandShare = Object.fromEntries(ANALYTICS_NETWORKS.map((n) => [n, followers(n) ? followers(n, site.brandId) / followers(n) : 0]))

  const campaignOn = (id: string, key: string) => {
    const c = ws.campaigns.find((x) => x.id === id)
    return !c ? 'off' : key < c.start ? 'before' : key <= c.end ? 'on' : 'after'
  }
  const liveCampaign = (w: Website, key: string) => (PROFILES[w.id]?.pages ?? []).some((pg) => pg.campaignId && campaignOn(pg.campaignId, key) === 'on')

  const zeros = () => new Array<number>(SITE_DAYS).fill(0)
  const h: SiteHistory = {
    end: dayKey(end),
    sessions: zeros(),
    views: zeros(),
    engaged: zeros(),
    seconds: zeros(),
    keyEvents: zeros(),
    channels: {},
    social: {},
    pages: p.pages.map((pg) => ({ path: pg.path, sessions: zeros(), engaged: zeros(), seconds: zeros(), keyEvents: zeros() })),
  }
  // Each page keeps its own character: a little more or less engaging, and its share drifts day to day.
  const pageEngagement = p.pages.map((pg) => (pg.engagement ?? 1) * (0.88 + random() * 0.24))
  const pageTime = p.pages.map(() => 0.8 + random() * 0.4)

  for (let i = 0; i < SITE_DAYS; i++) {
    const date = new Date(end.getTime() - (SITE_DAYS - 1 - i) * DAY)
    const key = dayKey(date)
    const weekday = (date.getUTCDay() + 6) % 7
    const campaign = liveCampaign(site, key)

    // Search, direct, email…: a growing base shaped by the week, lifted by campaigns.
    const lift = campaign ? 1 + p.campaignLift : 1
    const base = p.base * (1 - p.growth + (p.growth * i) / (SITE_DAYS - 1)) * p.week[weekday] * lift
    let other = 0
    for (const [group, share] of Object.entries(p.mix) as [ChannelGroup, number][]) {
      const tuesday = group === 'email' ? (weekday === 1 ? 2.6 : 0.75) : 1
      const v = Math.round(base * share * tuesday * noise(0.24))
      ;(h.channels[group] ??= zeros())[i] = v
      other += v
    }

    // Social: the brand's link clicks of the day, 82% of which become sessions.
    const weights = siblings.map((w) => (PROFILES[w.id].campaignOnly && !liveCampaign(w, key) ? 0.05 : 1) * PROFILES[w.id].social)
    const mine = weights[siblings.indexOf(site)] / weights.reduce((a, b) => a + b, 0)
    let social = 0
    for (const n of ANALYTICS_NETWORKS) {
      const clicks = ws.analytics.series[n].clicks[ws.analytics.series[n].clicks.length - SITE_DAYS + i] ?? 0
      const v = Math.round(clicks * brandShare[n] * 0.82 * mine)
      if (!v) continue
      ;(h.social[n] ??= zeros())[i] = v
      social += v
    }
    ;(h.channels.organicSocial ??= zeros())[i] = social

    const sessions = other + social
    const engaged = Math.round(other * p.engagement * noise(0.06) + social * (p.engagement - 0.1) * noise(0.06))
    h.sessions[i] = sessions
    h.views[i] = Math.round(sessions * p.pagesPerSession * noise(0.1))
    h.engaged[i] = engaged
    h.seconds[i] = Math.round(engaged * p.seconds * noise(0.12))
    h.keyEvents[i] = Math.round(sessions * p.keyRate * noise(0.3) * (campaign ? 1.25 : 1))

    // Landing pages: campaign pages only while their campaign runs (a trickle after).
    const reach = (pg: PageProfile) => {
      if (!pg.campaignId) return 1
      const state = campaignOn(pg.campaignId, key)
      return state === 'on' ? 1 : state === 'after' ? 0.12 : 0
    }
    const pageSessions = allocate(sessions, p.pages.map((pg) => reach(pg) * (other * pg.weight + social * pg.social) * noise(0.3)))
    h.pages.forEach((pg, k) => (pg.sessions[i] = pageSessions[k]))
    const engagedSplit = allocate(engaged, p.pages.map((_, k) => pageSessions[k] * pageEngagement[k]))
    const secondsSplit = allocate(h.seconds[i], p.pages.map((_, k) => engagedSplit[k] * pageEngagement[k] * pageTime[k]))
    const keySplit = allocate(h.keyEvents[i], p.pages.map((pg, k) => pageSessions[k] * (pg.conversion ?? 1)))
    h.pages.forEach((pg, k) => {
      pg.engaged[i] = engagedSplit[k]
      pg.seconds[i] = secondsSplit[k]
      pg.keyEvents[i] = keySplit[k]
    })
  }
  return h
}

/* ───────────────────────── view model ───────────────────────── */

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const change = (after: number, before: number) => (before > 0 ? (after - before) / before : null)
/** Element-wise sum of equally long series. */
const add = (series: number[][], length: number) => Array.from({ length }, (_, i) => series.reduce((s, xs) => s + (xs[i] ?? 0), 0))

export type WebMetric = 'sessions' | 'views' | 'keyEvents'

export interface SiteEntry {
  site: Website
  history: SiteHistory
}

export interface PageRow {
  key: string
  site: Website
  brand?: Brand
  path: string
  sessions: number
  growth: number | null
  engagementRate: number
  /** Average engagement time per session, seconds. */
  avgSeconds: number
  keyEvents: number
  keyEventRate: number
  /** 7-day average of sessions over the range (every third day for 90 days), 0–1. */
  trend: number[]
}

/** Everything the Websites section shows for a range, for every site or one of them. */
export function selectWebsites(entries: SiteEntry[], brands: Brand[], range: Range, siteId: string | null) {
  const inView = entries.filter((e) => !siteId || e.site.id === siteId)
  const len = SITE_DAYS
  const cur = (xs: number[]) => xs.slice(len - range, len)
  const prev = (xs: number[]) => xs.slice(len - 2 * range, len - range)
  const total = (pick: (h: SiteHistory) => number[]) => add(inView.map((e) => pick(e.history)), len)

  const series = {
    sessions: total((h) => h.sessions),
    views: total((h) => h.views),
    keyEvents: total((h) => h.keyEvents),
  }
  const engaged = total((h) => h.engaged)
  const seconds = total((h) => h.seconds)
  const metric = (m: WebMetric) => ({ current: cur(series[m]), previous: prev(series[m]), total: sum(cur(series[m])), change: change(sum(cur(series[m])), sum(prev(series[m]))) })

  const sessions = sum(cur(series.sessions))
  const prevSessions = sum(prev(series.sessions))
  const rate = (a: number, b: number) => (b > 0 ? a / b : 0)

  const end = inView[0]?.history.end ?? entries[0]?.history.end
  const last = end ? new Date(`${end}T00:00:00Z`) : new Date()
  const days = Array.from({ length: range }, (_, i) => new Date(last.getTime() - (range - 1 - i) * DAY))

  const groups = new Map<ChannelGroup, number>()
  for (const e of inView) for (const [g, xs] of Object.entries(e.history.channels) as [ChannelGroup, number[]][]) groups.set(g, (groups.get(g) ?? 0) + sum(cur(xs)))
  const channels = [...groups.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const channelMax = Math.max(1, ...channels.map(([, v]) => v))

  const nets = new Map<NetworkId, number>()
  for (const e of inView) for (const [n, xs] of Object.entries(e.history.social) as [NetworkId, number[]][]) nets.set(n, (nets.get(n) ?? 0) + sum(cur(xs)))
  const social = [...nets.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const socialTotal = sum(social.map(([, v]) => v))
  const socialMax = Math.max(1, ...social.map(([, v]) => v))

  const pages: PageRow[] = inView.flatMap((e) =>
    e.history.pages.map((pg) => {
      const s = sum(cur(pg.sessions))
      // A 7-day average (the days before the range included) irons out the weekday rhythm;
      // 90 days are then thinned to every third day.
      const avg7 = pg.sessions.map((_, i) => sum(pg.sessions.slice(Math.max(0, i - 6), i + 1)) / Math.min(7, i + 1))
      const raw = cur(avg7)
      const step = Math.ceil(raw.length / 30)
      const daily = raw.filter((_, k) => k % step === step - 1 || k === raw.length - 1)
      const max = Math.max(...daily)
      const min = Math.min(...daily)
      return {
        key: `${e.site.id}${pg.path}`,
        site: e.site,
        brand: brands.find((b) => b.id === e.site.brandId),
        path: pg.path,
        sessions: s,
        growth: change(s, sum(prev(pg.sessions))),
        engagementRate: rate(sum(cur(pg.engaged)), s),
        avgSeconds: rate(sum(cur(pg.seconds)), s),
        keyEvents: sum(cur(pg.keyEvents)),
        keyEventRate: rate(sum(cur(pg.keyEvents)), s),
        trend: daily.map((v) => (max > min ? (v - min) / (max - min) : 0.5)),
      }
    }),
  ).filter((r) => r.sessions > 0)

  return {
    range,
    siteId,
    days,
    sites: entries.length,
    stats: {
      sessions,
      change: change(sessions, prevSessions),
      engagementRate: rate(sum(cur(engaged)), sessions),
      engagementRateBefore: rate(sum(prev(engaged)), prevSessions),
      avgSeconds: rate(sum(cur(seconds)), sessions),
      keyEventRate: rate(sum(cur(series.keyEvents)), sessions),
    },
    metrics: { sessions: metric('sessions'), views: metric('views'), keyEvents: metric('keyEvents') },
    channels: channels.map(([group, value]) => ({ group, sessions: value, share: rate(value, sessions), fill: value / channelMax })),
    social: {
      total: socialTotal,
      share: rate(socialTotal, sessions),
      rows: social.map(([network, value]) => ({ network, sessions: value, share: rate(value, socialTotal), fill: value / socialMax })),
    },
    pages: pages.sort((a, b) => b.sessions - a.sessions),
  }
}

export type WebsitesModel = ReturnType<typeof selectWebsites>
