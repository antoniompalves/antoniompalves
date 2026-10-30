import type { Campaign, NetworkId, Post, PostStatus, Workspace } from './types'

/**
 * Calendar geometry and selectors, reverse-engineered from the reference
 * #/calendar: the week grid runs 6 AM → midnight in 72px hour rows, weeks
 * start on Monday, drag targets snap to 30 minutes. All dates are UTC to
 * match the mock workspace.
 */

export const HOUR_PX = 72
export const DAY_START = 6
export const DAY_HOURS = 18
export const SNAP_MIN = 30

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

export type CalendarView = 'week' | 'month' | 'list'
export type StatusFilter = 'scheduled' | 'pending' | 'published' | 'draft' | 'failed'

export interface Filters {
  networks: NetworkId[]
  statuses: StatusFilter[]
  campaignId: string | null
}

export const NO_FILTERS: Filters = { networks: [], statuses: [], campaignId: null }

/* ───────────────────────── dates ───────────────────────── */

export const dayKey = (d: Date) => d.toISOString().slice(0, 10)
export const fromKey = (key: string) => new Date(`${key}T00:00:00Z`)
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS)
export const startOfDay = (d: Date) => fromKey(dayKey(d))
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getUTCDay() + 6) % 7))
export const startOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
export const addMonths = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))
export const days = (start: Date, count: number) => Array.from({ length: count }, (_, i) => addDays(start, i))
/** The 6-week grid the month view and the mini calendar draw. */
export const monthGrid = (anchor: Date) => days(startOfWeek(startOfMonth(anchor)), 42)
export const minutesOfDay = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes()
/** Fractional hour rows from the top of the week grid. */
export const rowOf = (d: Date) => (minutesOfDay(d) - DAY_START * 60) / 60

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts })
const F = {
  weekday: fmt({ weekday: 'short' }),
  weekdayLong: fmt({ weekday: 'long' }),
  monthShort: fmt({ month: 'short' }),
  monthLong: fmt({ month: 'long' }),
  monthYear: fmt({ month: 'long', year: 'numeric' }),
  dayLong: fmt({ weekday: 'short', month: 'short', day: 'numeric' }),
  ariaDay: fmt({ weekday: 'long', month: 'long', day: 'numeric' }),
  time: fmt({ hour: 'numeric', minute: '2-digit' }),
  hour: fmt({ hour: 'numeric' }),
}

export const fmtWeekday = (d: Date) => F.weekday.format(d)
export const fmtWeekdayLong = (d: Date) => F.weekdayLong.format(d)
/** "Oct 10" */
export const fmtShortDate = (d: Date) => `${F.monthShort.format(d)} ${d.getUTCDate()}`
export const fmtMonthDay = (d: Date) => `${F.monthLong.format(d)} ${d.getUTCDate()}`
export const fmtMonthYear = (d: Date) => F.monthYear.format(d)
export const fmtDayLong = (d: Date) => F.dayLong.format(d)
export const fmtAriaDay = (d: Date) => F.ariaDay.format(d)
/** "9:30 AM" */
export const fmtTime = (d: Date) => F.time.format(d)
/** Hour gutter label: "6 AM" */
export const fmtHour = (h: number) => F.hour.format(new Date(Date.UTC(2026, 0, 1, h)))
/** Month chips: "9:45a", "8p" */
export function fmtTimeShort(d: Date, alwaysMinutes = false) {
  const h = d.getUTCHours()
  const m = d.getUTCMinutes()
  const mm = m || alwaysMinutes ? `:${String(m).padStart(2, '0')}` : ''
  return `${h % 12 || 12}${mm}${h < 12 ? 'a' : 'p'}`
}
/** "Today" · "Tomorrow" · "Sun, Nov 1" */
export function fmtRelativeDay(d: Date, now: Date) {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY_MS)
  return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : fmtDayLong(d)
}

/** "Oct 26 – Nov 1, 2026", "Oct 12 – 25, 2026", "October 2026" */
export function periodLabel(view: CalendarView, anchor: Date) {
  if (view === 'month') return fmtMonthYear(anchor)
  const start = startOfWeek(anchor)
  const end = addDays(start, view === 'week' ? 6 : 13)
  const sameMonth = start.getUTCMonth() === end.getUTCMonth()
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
  const left = `${F.monthShort.format(start)} ${start.getUTCDate()}${sameYear ? '' : `, ${start.getUTCFullYear()}`}`
  const right = `${sameMonth ? '' : `${F.monthShort.format(end)} `}${end.getUTCDate()}, ${end.getUTCFullYear()}`
  return `${left} – ${right}`
}

/** Visible day range for a view: [start, start + count). */
export function periodDays(view: CalendarView, anchor: Date) {
  if (view === 'month') return monthGrid(anchor)
  return days(startOfWeek(anchor), view === 'week' ? 7 : 14)
}

export function stepAnchor(view: CalendarView, anchor: Date, dir: -1 | 1) {
  return view === 'month' ? addMonths(anchor, dir) : addDays(anchor, 7 * dir)
}

/* ───────────────────────── posts ───────────────────────── */

export const statusGroup = (s: PostStatus): StatusFilter =>
  s === 'awaiting_approval' ? 'pending' : s === 'changes_requested' || s === 'failed' ? 'failed' : s

/** Published posts are history; everything else can still be rescheduled. */
export const isMovable = (p: Post) => p.status !== 'published'

export const isLive = (s: PostStatus) => s === 'scheduled' || s === 'awaiting_approval' || s === 'published'

export function campaignOf(p: Post, campaigns: Campaign[]) {
  const k = p.scheduledAt.slice(0, 10)
  return campaigns.find((c) => c.brandId === p.brandId && k >= c.start && k <= c.end) ?? null
}

export function matchesFilters(p: Post, f: Filters, campaigns: Campaign[]) {
  if (f.networks.length && !p.networks.some((n) => f.networks.includes(n))) return false
  if (f.statuses.length && !f.statuses.includes(statusGroup(p.status))) return false
  if (f.campaignId && campaignOf(p, campaigns)?.id !== f.campaignId) return false
  return true
}

export const hasFilters = (f: Filters) => f.networks.length > 0 || f.statuses.length > 0 || f.campaignId !== null

export function postsByDay(posts: Post[]) {
  const map = new Map<string, Post[]>()
  for (const p of [...posts].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))) {
    const k = p.scheduledAt.slice(0, 10)
    map.set(k, [...(map.get(k) ?? []), p])
  }
  return map
}

/**
 * Side-by-side lanes for tiles whose one-hour boxes overlap (".cl-tile"
 * --lane/--lanes): greedy lane per post, lane count shared by its cluster.
 */
export function layoutLanes(dayPosts: Post[]) {
  const out = new Map<string, { lane: number; lanes: number }>()
  let cluster: { id: string; lane: number; end: number }[] = []
  let clusterEnd = -Infinity
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1))
    cluster.forEach((c) => out.set(c.id, { lane: c.lane, lanes }))
    cluster = []
  }
  for (const p of dayPosts) {
    const start = Date.parse(p.scheduledAt)
    if (start >= clusterEnd) {
      flush()
      clusterEnd = -Infinity
    }
    const busy = cluster.filter((c) => c.end > start).map((c) => c.lane)
    let lane = 0
    while (busy.includes(lane)) lane++
    cluster.push({ id: p.id, lane, end: start + HOUR_MS })
    clusterEnd = Math.max(clusterEnd, start + HOUR_MS)
  }
  flush()
  return out
}

export interface Ribbon {
  campaign: Campaign
  row: number
  /** 0-based first visible day and exclusive end within the range. */
  from: number
  to: number
  openLeft: boolean
  openRight: boolean
}

/** Campaign ribbons crossing [start, start + count) days, one row each, ordered by start date. */
export function ribbons(campaigns: Campaign[], start: Date, count: number): Ribbon[] {
  const first = dayKey(start)
  const last = dayKey(addDays(start, count - 1))
  return campaigns
    .filter((c) => c.start <= last && c.end >= first)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((campaign, row) => {
      const from = Math.max(0, Math.round((fromKey(campaign.start).getTime() - start.getTime()) / DAY_MS))
      const to = Math.min(count, Math.round((fromKey(campaign.end).getTime() - start.getTime()) / DAY_MS) + 1)
      return { campaign, row, from, to, openLeft: campaign.start < first, openRight: campaign.end > last }
    })
}

/* ───────────────────────── header stats & side panel ───────────────────────── */

export function calendarStats(ws: Workspace, now: Date) {
  const weekStart = startOfWeek(now)
  const weekEnd = addDays(weekStart, 7)
  const inWeek = (p: Post) => {
    const t = Date.parse(p.scheduledAt)
    return t >= weekStart.getTime() && t < weekEnd.getTime()
  }
  const today = startOfDay(now)
  const emptyDays = days(today, 7).filter(
    (d) => !ws.posts.some((p) => p.scheduledAt.startsWith(dayKey(d)) && isLive(p.status)),
  ).length
  return {
    scheduled: ws.posts.filter((p) => p.status === 'scheduled' && inWeek(p)).length,
    awaiting: ws.posts.filter((p) => p.status === 'awaiting_approval').length,
    published: ws.posts.filter((p) => p.status === 'published' && inWeek(p)).length,
    emptyDays,
  }
}

/** Posts per network in a week, busiest first (ties keep first-appearance order). */
export function networkCounts(posts: Post[]) {
  const counts = new Map<NetworkId, number>()
  for (const p of [...posts].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))) {
    for (const n of p.networks) counts.set(n, (counts.get(n) ?? 0) + 1)
  }
  return [...counts.entries()].map(([network, count]) => ({ network, count })).sort((a, b) => b.count - a.count)
}

/** Snap minutes-of-day to the drop grid and keep it inside the visible hours. */
export function snapMinutes(min: number) {
  const snapped = Math.round(min / SNAP_MIN) * SNAP_MIN
  return Math.min((DAY_START + DAY_HOURS) * 60 - SNAP_MIN, Math.max(DAY_START * 60, snapped))
}

export const atMinutes = (day: Date, minutes: number) => new Date(startOfDay(day).getTime() + minutes * 60_000)
