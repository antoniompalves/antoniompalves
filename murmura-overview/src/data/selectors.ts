import type {
  AuditEvent,
  Brand,
  Channel,
  Conversation,
  NetworkId,
  NetworkStat,
  Post,
  PostStatus,
  TeamMember,
  Tone,
  Workspace,
} from './types'

/* ───────────────────────── formatting ───────────────────────── */

const compactFmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

export const compact = (n: number) => compactFmt.format(n)
export const pct1 = (f: number) => `${(f * 100).toFixed(1)}%`
export const signedPct1 = (f: number) => `${f >= 0 ? '+' : '−'}${pct1(Math.abs(f))}`

export const NETWORK_LABEL: Record<NetworkId, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  threads: 'Threads',
  pinterest: 'Pinterest',
  youtube: 'YouTube',
  x: 'X',
  linkedin: 'LinkedIn',
}

/** Order the reference uses whenever it lists every network. */
export const NETWORK_ORDER: NetworkId[] = ['instagram', 'facebook', 'tiktok', 'threads', 'pinterest', 'youtube', 'x', 'linkedin']

export const STATUS_META: Record<PostStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'plain' },
  awaiting_approval: { label: 'Awaiting approval', tone: 'butter' },
  changes_requested: { label: 'Changes requested', tone: 'coral' },
  scheduled: { label: 'Scheduled', tone: 'sea' },
  published: { label: 'Published', tone: 'pine' },
  failed: { label: 'Failed', tone: 'coral' },
}

/** Truncate the way the reference does: hard cut, then an ellipsis. */
export const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text)

export function makeDates(timeZone: string) {
  const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const timeFull = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })
  const hourOnly = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric' })
  const minuteOf = new Intl.DateTimeFormat('en-US', { timeZone, minute: 'numeric' })
  const dayLong = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric' })
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' })
  const dayNum = new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric' })
  const monthDay = new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric' })
  const hourOfDay = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' })

  const key = (d: Date) => dayKey.format(d)
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)

  return {
    key,
    addDays,
    /** "9:00 AM" */
    time: (d: Date) => timeFull.format(d),
    /** "9 AM" or "9:30 AM" — used on calendar chips. */
    shortTime: (d: Date) => (Number(minuteOf.format(d)) === 0 ? hourOnly.format(d) : timeFull.format(d)),
    /** "Today" / "Tomorrow" / "Sun, Nov 1" relative to now. */
    day: (d: Date, now: Date) => {
      if (key(d) === key(now)) return 'Today'
      if (key(d) === key(addDays(now, 1))) return 'Tomorrow'
      return dayLong.format(d)
    },
    weekday: (d: Date) => weekday.format(d),
    dayNum: (d: Date) => dayNum.format(d),
    monthDay: (d: Date) => monthDay.format(d),
    hour: (d: Date) => Number(hourOfDay.format(d)),
  }
}

export function countdown(ms: number) {
  const mins = Math.max(0, Math.floor(ms / 60_000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h >= 48) return `${Math.floor(h / 24)} d ${h % 24} h`
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

export function ago(iso: string, now: Date) {
  const mins = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60_000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.floor(mins / 60)
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`
}

/* ───────────────────────── view model ───────────────────────── */

export type GrowthRange = 30 | 90

export interface TodoView {
  id: string
  kind: 'approval' | 'failed_post' | 'channel'
  title: string
  detail: string
  post?: Post
  channel?: Channel
}

export interface DayView {
  date: Date
  isToday: boolean
  posts: (Post & { brand: Brand })[]
}

export function selectOverview(ws: Workspace, now: Date) {
  const dates = makeDates(ws.timeZone)
  const brand = (id: string) => ws.brands.find((b) => b.id === id)!
  const member = (id: string) => ws.team.find((m) => m.id === id)!
  const post = (id: string) => ws.posts.find((p) => p.id === id)!
  const user = member(ws.currentUserId)
  const firstName = (m: TeamMember) => m.name.split(' ')[0]

  const hour = dates.hour(now)
  const greeting = `${hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening'}, ${firstName(user)}`

  // Header stats
  const audience = ws.networkStats.reduce((sum, n) => sum + n.followers, 0)
  const growth = (range: GrowthRange) => {
    const series = ws.followerGrowth.slice(-range)
    const added = series.reduce((sum, p) => sum + p.value, 0)
    return { series, added, rate: added / (audience - added) }
  }

  const todayStart = new Date(`${dates.key(now)}T00:00:00Z`)
  // "This week" is the calendar week (Mon–Sun), the same range the calendar opens on.
  const weekStart = dates.addDays(todayStart, -((todayStart.getUTCDay() + 6) % 7))
  const weekEnd = dates.addDays(weekStart, 7)
  const postsThisWeek = ws.posts.filter((p) => {
    const t = Date.parse(p.scheduledAt)
    return p.status !== 'draft' && t >= weekStart.getTime() && t < weekEnd.getTime()
  }).length

  // Up next: the queue of posts still to publish, soonest first
  const queue = ws.posts
    .filter((p) => (p.status === 'scheduled' || p.status === 'awaiting_approval') && Date.parse(p.scheduledAt) > now.getTime())
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
    .map((p) => ({ ...p, brand: brand(p.brandId) }))

  // Needs you
  const todos: TodoView[] = ws.todos.map((t) => {
    if (t.kind === 'channel') {
      const channel = ws.channels.find((c) => c.id === t.channelId)!
      const b = brand(channel.brandId)
      const net = NETWORK_LABEL[channel.network]
      return channel.status === 'expiring'
        ? { id: t.id, kind: t.kind, channel, title: `${b.name} · ${net} expires in ${channel.expiresInDays} d`, detail: 'Reconnect now so nothing stops going out.' }
        : { id: t.id, kind: t.kind, channel, title: `${b.name} · ${net} is disconnected`, detail: 'Posts to it will fail until someone reconnects it.' }
    }
    const p = post(t.postId)
    const b = brand(p.brandId)
    if (t.kind === 'failed_post') {
      return { id: t.id, kind: t.kind, post: p, title: `A ${b.name} post failed`, detail: p.failure?.reason ?? 'Publishing failed.' }
    }
    const when = new Date(p.scheduledAt)
    return {
      id: t.id,
      kind: t.kind,
      post: p,
      title: clip(p.text, 51),
      detail: `${firstName(member(p.authorId))} wants approval · ${b.name} · ${dates.day(when, now)} ${dates.time(when)}`,
    }
  })

  // Top post this month
  const monthKey = dates.key(now).slice(0, 7)
  const topPost = ws.posts
    .filter((p) => p.status === 'published' && p.metrics && dates.key(new Date(p.scheduledAt)).startsWith(monthKey))
    .sort((a, b) => b.metrics!.reach - a.metrics!.reach)
    .map((p) => ({ ...p, brand: brand(p.brandId), metrics: p.metrics! }))[0]

  // The week ahead
  const week: DayView[] = Array.from({ length: 7 }, (_, i) => {
    const date = dates.addDays(todayStart, i)
    const k = dates.key(date)
    return {
      date,
      isToday: i === 0,
      posts: ws.posts
        .filter((p) => p.status !== 'draft' && p.status !== 'published' && dates.key(new Date(p.scheduledAt)) === k)
        .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
        .map((p) => ({ ...p, brand: brand(p.brandId) })),
    }
  })

  // Network pulse
  const nets = [...ws.networkStats].sort((a, b) => b.followers - a.followers)
  const maxFollowers = nets[0]?.followers ?? 1
  const networkPulse = nets.map((n: NetworkStat) => ({ ...n, share: n.followers / maxFollowers }))

  // Inbox pulse
  const open = ws.conversations.filter((c) => c.status === 'open')
  const sentiment = {
    positive: open.filter((c) => c.sentiment === 'positive').length,
    neutral: open.filter((c) => c.sentiment === 'neutral').length,
    negative: open.filter((c) => c.sentiment === 'negative').length,
  }
  const latestUnread: Conversation[] = open
    .filter((c) => c.unread)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 3)

  // Team activity
  const feed = ws.audit.map((e: AuditEvent) => ({ ...e, actor: member(e.actorId), actorFirstName: firstName(member(e.actorId)) }))

  return {
    dates,
    user,
    greeting,
    stats: {
      audience,
      audienceGrowth30d: growth(30).rate,
      engagementRate: ws.engagementRate30d,
      postsThisWeek,
    },
    badges: {
      inbox: open.filter((c) => c.unread).length,
      approvals: ws.posts.filter((p) => p.status === 'awaiting_approval').length,
      notifications: ws.notifications.unread,
      channelsNeedAttention: ws.channels.some((c) => c.status !== 'connected'),
    },
    upNext: { hero: queue[0], comingUp: queue.slice(1, 7) },
    todos,
    growth,
    topPost,
    week,
    networkPulse,
    inbox: { open: open.length, unread: open.filter((c) => c.unread).length, priority: open.filter((c) => c.priority).length, sentiment, latest: latestUnread },
    feed,
  }
}

export type OverviewModel = ReturnType<typeof selectOverview>
