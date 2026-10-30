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
import { addDays, dayKey, startOfDay } from './calendar'
import { byActivity, lastMessage } from './inbox'
import type { Messages } from '../i18n'

/* ───────────────────────── labels ───────────────────────── */

// Network names are brands: the same in every language.
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

/** Colour of each post status; the words come from `t.status`. */
export const STATUS_TONE: Record<PostStatus, Tone> = {
  draft: 'plain',
  awaiting_approval: 'butter',
  changes_requested: 'coral',
  scheduled: 'sea',
  published: 'pine',
  failed: 'coral',
}

/** Truncate the way the reference does: hard cut, then an ellipsis. */
export const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text)

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

export function selectOverview(ws: Workspace, now: Date, t: Messages) {
  const brand = (id: string) => ws.brands.find((b) => b.id === id)!
  const member = (id: string) => ws.team.find((m) => m.id === id)!
  const post = (id: string) => ws.posts.find((p) => p.id === id)!
  const user = member(ws.currentUserId)
  const firstName = (m: TeamMember) => m.name.split(' ')[0]

  // The workspace runs on UTC, like every date in the mock.
  const greeting = t.overview.greeting(now.getUTCHours(), firstName(user))

  // Header stats
  const audience = ws.networkStats.reduce((sum, n) => sum + n.followers, 0)
  const growth = (range: GrowthRange) => {
    const series = ws.followerGrowth.slice(-range)
    const added = series.reduce((sum, p) => sum + p.value, 0)
    return { series, added, rate: added / (audience - added) }
  }

  const todayStart = startOfDay(now)
  // "This week" is the calendar week (Mon–Sun), the same range the calendar opens on.
  const weekStart = addDays(todayStart, -((todayStart.getUTCDay() + 6) % 7))
  const weekEnd = addDays(weekStart, 7)
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
  const todos: TodoView[] = ws.todos.map((todo) => {
    if (todo.kind === 'channel') {
      const channel = ws.channels.find((c) => c.id === todo.channelId)!
      const b = brand(channel.brandId)
      const net = NETWORK_LABEL[channel.network]
      return channel.status === 'expiring'
        ? { id: todo.id, kind: todo.kind, channel, title: t.overview.todo.expiring(b.name, net, channel.expiresInDays ?? 0), detail: t.overview.todo.expiringDetail }
        : { id: todo.id, kind: todo.kind, channel, title: t.overview.todo.disconnected(b.name, net), detail: t.overview.todo.disconnectedDetail }
    }
    const p = post(todo.postId)
    const b = brand(p.brandId)
    if (todo.kind === 'failed_post') {
      const detail = p.failure ? t.failure(NETWORK_LABEL[p.failure.network], b.name) : t.overview.todo.failedDetail
      return { id: todo.id, kind: todo.kind, post: p, title: t.overview.todo.failed(b.name), detail }
    }
    const when = new Date(p.scheduledAt)
    return {
      id: todo.id,
      kind: todo.kind,
      post: p,
      title: clip(p.text, 51),
      detail: t.overview.todo.approval(firstName(member(p.authorId)), b.name, `${t.dates.relativeDay(when, now)} ${t.dates.time(when)}`),
    }
  })

  // Top post this month
  const monthKey = dayKey(now).slice(0, 7)
  const topPost = ws.posts
    .filter((p) => p.status === 'published' && p.metrics && p.scheduledAt.startsWith(monthKey))
    .sort((a, b) => b.metrics!.reach - a.metrics!.reach)
    .map((p) => ({ ...p, brand: brand(p.brandId), metrics: p.metrics! }))[0]

  // The week ahead
  const week: DayView[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(todayStart, i)
    const k = dayKey(date)
    return {
      date,
      isToday: i === 0,
      posts: ws.posts
        .filter((p) => p.status !== 'draft' && p.status !== 'published' && p.scheduledAt.startsWith(k))
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
  const latestUnread = open
    .filter((c) => c.unread)
    .sort(byActivity)
    .slice(0, 3)
    .map((c: Conversation) => ({ ...c, preview: lastMessage(c).text }))

  // Team activity
  const feed = ws.audit.map((e: AuditEvent) => ({
    ...e,
    actor: member(e.actorId),
    actorFirstName: firstName(member(e.actorId)),
    summary: t.activity(e.action, (id) => brand(id).name, (n) => NETWORK_LABEL[n]),
  }))

  return {
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
