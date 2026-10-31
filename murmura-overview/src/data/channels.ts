import { can, needsApproval, roleName, seesBrand } from './permissions'
import type { Messages } from '../i18n'
import type { Channel, NetworkId, Post, Workspace } from './types'

const DAY = 86_400_000
/** Tokens last 60 days (the meter's full length). */
export const TOKEN_DAYS = 60

/** Networks the workspace supports, in the reference's order. */
export const SUPPORTED: NetworkId[] = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'threads']

/** Whole days of access left (rounded up), 0 once disconnected. */
export const daysLeft = (c: Channel, now: number) => (c.status === 'disconnected' ? 0 : Math.max(0, Math.ceil((Date.parse(c.tokenExpiresAt) - now) / DAY)))

/** "Expires in 2 d": the nearest whole day, as relative times read. */
export const expiresIn = (c: Channel, now: number) => Math.max(0, Math.round((Date.parse(c.tokenExpiresAt) - now) / DAY))

export const tokenTone = (c: Channel, now: number) => {
  const d = daysLeft(c, now)
  return d === 0 ? 'coral' : d <= 14 ? 'butter' : 'pine'
}

export const needsAttention = (c: Channel) => c.status !== 'connected'

export type ChannelTab = 'all' | 'attention' | 'paused'

export const matches = (ws: Workspace, c: Channel, tab: ChannelTab, query: string, label: (n: NetworkId) => string) => {
  const q = query.trim().toLowerCase()
  const brand = ws.brands.find((b) => b.id === c.brandId)?.name ?? ''
  return (tab === 'all' || (tab === 'attention' ? needsAttention(c) : !!c.paused)) && (!q || `${c.handle} ${label(c.network)} ${brand}`.toLowerCase().includes(q))
}

/** Header figures. */
export const channelStats = (ws: Workspace) => ({
  connected: ws.channels.filter((c) => c.status === 'connected').length,
  attention: ws.channels.filter(needsAttention).length,
  audience: ws.channels.reduce((s, c) => s + c.followers, 0),
  networks: new Set(ws.channels.map((c) => c.network)).size,
})

/** 30-day growth and follower curve (0–1), from the account's analytics history. */
export function channelTrend(ws: Workspace, c: Channel) {
  const stats = ws.analytics.accounts[c.id]?.[30]
  const gained = stats?.gained ?? 0
  const before = c.followers - gained
  return { growth: before > 0 ? gained / before : 0, curve: (stats?.trend ?? [0, 1000]).map((v) => v / 1000) }
}

/** Who can post to a brand, and which roles publish directly or need approval (the access line on each brand). */
export function whoCanPost(ws: Workspace, brandId: string, t: Messages) {
  const people = ws.team.filter((m) => m.status === 'active' && seesBrand(m, brandId) && (can(ws, m.id, 'post.create') || can(ws, m.id, 'post.publish')))
  const direct = new Set<string>()
  const reviewed = new Set<string>()
  for (const m of people) (needsApproval(ws, m.id) ? reviewed : direct).add(roleName(t, ws, m.role))
  return { people, direct: [...direct], reviewed: [...reviewed] }
}

/** Scheduled posts that would go out on this channel (they wait while it's paused, and skip it once it's disconnected). */
export const waitingPosts = (ws: Workspace, c: Channel) => ws.posts.filter((p: Post) => p.brandId === c.brandId && p.networks.includes(c.network) && p.status === 'scheduled').length

/** Posts that failed to publish, in the brands on screen. */
export const failedPosts = (ws: Workspace) => ws.posts.filter((p) => p.status === 'failed')

/** Channels needing attention, disconnected ones first (the banner's list). */
export const attentionList = (ws: Workspace) => ws.channels.filter(needsAttention).sort((a, b) => (a.status === 'disconnected' ? -1 : 1) - (b.status === 'disconnected' ? -1 : 1))

/** What each network can do here: publish, answer in the inbox, report. Pinterest has no inbox. */
export const CAPS: Record<NetworkId, { publish: boolean; inbox: boolean; analytics: boolean }> = {
  instagram: { publish: true, inbox: true, analytics: true },
  facebook: { publish: true, inbox: true, analytics: true },
  x: { publish: true, inbox: true, analytics: true },
  linkedin: { publish: true, inbox: true, analytics: true },
  tiktok: { publish: true, inbox: true, analytics: true },
  youtube: { publish: true, inbox: true, analytics: true },
  pinterest: { publish: true, inbox: false, analytics: true },
  threads: { publish: true, inbox: true, analytics: true },
}

/** Followers per network, largest first, with each one's share (the "Audience by network" bars). */
export function audienceByNetwork(ws: Workspace) {
  const rows = SUPPORTED.map((n) => ({ network: n, followers: ws.channels.filter((c) => c.network === n).reduce((s, c) => s + c.followers, 0) }))
    .filter((r) => r.followers > 0)
    .sort((a, b) => b.followers - a.followers)
  const total = rows.reduce((s, r) => s + r.followers, 0)
  return { rows, total, max: rows[0]?.followers ?? 1 }
}

/** A new channel for a brand on a network, as the demo's sign-in creates it. */
export function newChannel(ws: Workspace, brandId: string, network: NetworkId, me: string, now: number): Channel {
  const brand = ws.brands.find((b) => b.id === brandId)!
  const id = `ch-${brandId}-${network}`
  // A plausible audience for a new account, the same every time for this brand and network.
  const seed = [...id].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 100_000, 7)
  return {
    id,
    brandId,
    network,
    handle: network === 'linkedin' || network === 'youtube' || network === 'facebook' ? brand.name : `@${brand.handle}`,
    followers: 2000 + (seed % 30_000),
    status: 'connected',
    tokenExpiresAt: new Date(now + TOKEN_DAYS * DAY).toISOString(),
    connectedById: me,
    connectedAt: new Date(now).toISOString(),
    lastSyncAt: new Date(now).toISOString(),
  }
}
