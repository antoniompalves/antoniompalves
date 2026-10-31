import type { ReactNode } from 'react'
import type { AuditAction, ConversationKind, KeywordKind, NetworkId, NoticeEvent, Permission, PostStatus, Sentiment, SystemRole } from '../data/types'
import type { PermissionGroup } from '../data/permissions'
import { dayDiff, num, splitMinutes, utc } from './format'

/**
 * English catalogue — the source of truth for every key (`Messages` is its
 * type). The wording and formats are the reference template's own, so the
 * English UI stays identical to it.
 */

const L = 'en-US'
const dt = (o: Intl.DateTimeFormatOptions) => utc(L, o)
const plural = (n: number, one: string, other: string) => `${n} ${n === 1 ? one : other}`

const time = (d: Date) => dt({ hour: 'numeric', minute: '2-digit' }).format(d)
/** "Oct 10" */
const monthDay = (d: Date) => `${dt({ month: 'short' }).format(d)} ${d.getUTCDate()}`
/** "Sun, Nov 1" */
const dayLong = (d: Date) => dt({ weekday: 'short', month: 'short', day: 'numeric' }).format(d)
const weekday = (d: Date) => dt({ weekday: 'short' }).format(d)
const pct1 = (f: number) => `${(f * 100).toFixed(1)}%`

const STATUS: Record<PostStatus, string> = {
  draft: 'Draft',
  awaiting_approval: 'Awaiting approval',
  changes_requested: 'Changes requested',
  scheduled: 'Scheduled',
  published: 'Published',
  failed: 'Failed',
}

const ROLES: Record<SystemRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  editor: 'Editor',
  community: 'Community',
  analyst: 'Analyst',
  client: 'Client',
}

const ROLE_DESCRIPTIONS: Record<SystemRole, string> = {
  owner: 'Full control, including billing. Cannot be edited.',
  admin: 'Runs the workspace: team, roles, channels and settings.',
  manager: 'Publishes and approves for the brands they look after.',
  editor: 'Writes posts; every post goes to a manager for approval.',
  community: 'Answers the inbox and hands conversations on.',
  analyst: 'Reads every report and runs listening. Cannot post.',
  client: 'Your client: reviews and approves their own brand’s posts.',
}

const PERMISSIONS: Record<Permission, { label: string; hint: string }> = {
  'post.create': { label: 'Write posts', hint: 'Draft posts and send them for approval' },
  'post.publish': { label: 'Publish without approval', hint: 'Schedule or publish straight away' },
  'post.approve': { label: 'Approve posts', hint: 'Approve or send back other people’s posts' },
  'post.delete': { label: 'Delete posts', hint: 'Remove scheduled and published posts' },
  'calendar.edit': { label: 'Reschedule', hint: 'Drag posts to a new time on the calendar' },
  'inbox.reply': { label: 'Reply in inbox', hint: 'Answer comments, messages and mentions' },
  'inbox.assign': { label: 'Assign conversations', hint: 'Hand conversations to teammates' },
  'analytics.view': { label: 'View analytics', hint: 'See reports and post performance' },
  'analytics.export': { label: 'Export reports', hint: 'Download CSV and PDF reports' },
  'listening.manage': { label: 'Manage listening', hint: 'Add and remove tracked keywords' },
  'library.manage': { label: 'Manage library', hint: 'Upload, tag and delete media and templates' },
  'channels.manage': { label: 'Connect channels', hint: 'Connect, reconnect and remove social accounts' },
  'team.manage': { label: 'Manage team & roles', hint: 'Invite people, change roles and permissions' },
  'billing.manage': { label: 'Billing', hint: 'Change plan, seats and payment details' },
  'settings.manage': { label: 'Workspace settings', hint: 'Approval rules, time zone, branding' },
}

const PERMISSION_GROUPS: Record<PermissionGroup, string> = {
  publishing: 'Publishing',
  engagement: 'Engagement',
  insights: 'Insights',
  content: 'Content',
  admin: 'Admin',
}

const role = (id: string) => ROLES[id as SystemRole] ?? id

const KINDS: Record<ConversationKind, { one: string; many: string }> = {
  comment: { one: 'Comment', many: 'Comments' },
  message: { one: 'Message', many: 'Messages' },
  mention: { one: 'Mention', many: 'Mentions' },
  review: { one: 'Review', many: 'Reviews' },
}

const SENTIMENT: Record<Sentiment, string> = { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' }

type RouteText = { label: string; title: string; sections: string[] }

const WEB_METRIC = { sessions: 'Sessions', views: 'Views', keyEvents: 'Key events' }
const METRIC = { impressions: 'Impressions', engagements: 'Engagements', clicks: 'Link clicks' }
const WEEKDAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
/** "8 AM"; 24 wraps to "12 AM". */
const HOUR = (h: number) => `${h % 12 || 12} ${h % 24 < 12 ? 'AM' : 'PM'}`

export const en = {
  /** Dates and times; every instant is shown in UTC, like the mock workspace. */
  dates: {
    /** "9:30 AM" */
    time,
    /** "9 AM" or "9:30 AM" — week-ahead chips. */
    shortTime: (d: Date) => (d.getUTCMinutes() === 0 ? dt({ hour: 'numeric' }).format(d) : time(d)),
    /** Month chips and the now pill: "9:45a", "8p" (always with minutes: "2:15p"). */
    compactTime: (d: Date, alwaysMinutes = false) => {
      const h = d.getUTCHours()
      const m = d.getUTCMinutes()
      const mm = m || alwaysMinutes ? `:${String(m).padStart(2, '0')}` : ''
      return `${h % 12 || 12}${mm}${h < 12 ? 'a' : 'p'}`
    },
    /** Week grid gutter: "6 AM" */
    hour: (h: number) => dt({ hour: 'numeric' }).format(new Date(Date.UTC(2026, 0, 1, h))),
    /** "Mon" */
    weekday,
    /** Day headings in the list view: "Mon". */
    weekdayTitle: weekday,
    /** Week grid column heads (shown in capitals). */
    weekdayHead: weekday,
    /** Month view header, Monday first. */
    weekdayHeads: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    /** Mini calendar header, Monday first. */
    weekdayInitials: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    monthDay,
    /** "October 10" */
    monthDayLong: (d: Date) => `${dt({ month: 'long' }).format(d)} ${d.getUTCDate()}`,
    /** "October 2026" */
    monthYear: (d: Date) => dt({ month: 'long', year: 'numeric' }).format(d),
    dayLong,
    /** "Sunday, November 1" */
    dayFull: (d: Date) => dt({ weekday: 'long', month: 'long', day: 'numeric' }).format(d),
    dayNum: (d: Date) => String(d.getUTCDate()),
    /** "Today" · "Tomorrow" · "Sun, Nov 1" */
    relativeDay: (d: Date, now: Date) => {
      const diff = dayDiff(now, d)
      return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : dayLong(d)
    },
    /** Calendar heading: "Oct 26 – Nov 1, 2026", "Oct 12 – 25, 2026" or "October 2026". */
    period: (start: Date, end: Date | null) => {
      if (!end) return dt({ month: 'long', year: 'numeric' }).format(start)
      const sameMonth = start.getUTCMonth() === end.getUTCMonth()
      const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
      const left = `${monthDay(start)}${sameYear ? '' : `, ${start.getUTCFullYear()}`}`
      const right = `${sameMonth ? '' : `${dt({ month: 'short' }).format(end)} `}${end.getUTCDate()}, ${end.getUTCFullYear()}`
      return `${left} – ${right}`
    },
    /** "Mon, Nov 2, 9:00 AM" */
    dayTime: (d: Date) => `${dayLong(d)}, ${time(d)}`,
    /** Suggested times within the week: "Tomorrow 6:00 PM", "Sun 12:00 PM". */
    slot: (d: Date, now: Date) => {
      const diff = dayDiff(now, d)
      return `${diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : weekday(d)} ${time(d)}`
    },
    /** "Today · 9:30 AM", "Yesterday · 8:15 AM", "Nov 3 · 12:00 PM" */
    dayStamp: (d: Date, now: Date) => {
      const diff = dayDiff(now, d)
      return `${diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : monthDay(d)} · ${time(d)}`
    },
    /** "in 45 min", "in 22 h", "in 3 d" (rounded like `ago`), then the date. */
    fromNow: (d: Date, now: Date) => {
      const ms = Math.max(0, d.getTime() - now.getTime())
      if (ms < 60_000) return 'now'
      const mins = Math.round(ms / 60_000)
      const hours = Math.round(ms / 3_600_000)
      const days = Math.round(ms / 86_400_000)
      return mins < 60 ? `in ${mins} min` : hours < 24 ? `in ${hours} h` : days < 7 ? `in ${days} d` : `on ${monthDay(d)}`
    },
    /** "Oct 30 · 4:49 PM" */
    stamp: (iso: string) => `${monthDay(new Date(iso))} · ${time(new Date(iso))}`,
    /** Conversation list: today → "4:49 PM", then "Yesterday", the weekday within a week, else "Oct 3". */
    listTime: (iso: string, now: Date) => {
      const diff = dayDiff(iso, now)
      if (diff <= 0) return time(new Date(iso))
      if (diff === 1) return 'Yesterday'
      return diff < 7 ? weekday(new Date(iso)) : monthDay(new Date(iso))
    },
    /** Sticky day separators in a thread. */
    threadDay: (iso: string, now: Date) => {
      const diff = dayDiff(iso, now)
      return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : dt({ weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(iso))
    },
    /** "just now", "45 min ago", "2 h ago" (rounded), "3 d ago", then the date. */
    ago: (iso: string, now: Date) => {
      const ms = Math.max(0, now.getTime() - Date.parse(iso))
      if (ms < 60_000) return 'just now'
      const mins = Math.round(ms / 60_000)
      const hours = Math.round(ms / 3_600_000)
      const days = Math.round(ms / 86_400_000)
      return mins < 60 ? `${mins} min ago` : hours < 24 ? `${hours} h ago` : days < 7 ? `${days} d ago` : monthDay(new Date(iso))
    },
    /** Up next: "18 h 45 min", "12 min", "3 d 4 h" from 48 h on. */
    countdown: (ms: number) => {
      const { h, m } = splitMinutes(ms / 60_000)
      if (h >= 48) return `${Math.floor(h / 24)} d ${h % 24} h`
      return h > 0 ? `${h} h ${m} min` : `${m} min`
    },
    /** Median reply time: "22m", "1h 5m". */
    duration: (min: number | null) => (min === null ? '—' : min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${min % 60}m`),
  },

  numbers: {
    /** "976.3K", "10.83M" */
    compact: (n: number) => num('en', { notation: 'compact', maximumFractionDigits: Math.abs(n) >= 1e6 ? 2 : 1 }).format(n),
    /** "2,305" */
    int: (n: number) => num('en').format(n),
    pct1,
    /** "30%" */
    pct0: (f: number) => `${Math.round(f * 100)}%`,
    signedPct1: (f: number) => `${f >= 0 ? '+' : '−'}${pct1(Math.abs(f))}`,
    /** "2.5", "10" */
    decimal: (n: number) => num('en', { maximumFractionDigits: 1 }).format(n),
    /** "8.9×" */
    times: (n: number) => `${num('en', { maximumFractionDigits: 1 }).format(n)}×`,
  },

  common: {
    undo: 'Undo',
    close: 'Close',
    clear: 'Clear',
    clearFilters: 'Clear filters',
    today: 'Today',
    newPost: 'New post',
    calendar: 'Calendar',
    post: (n: number) => plural(n, 'post', 'posts'),
  },

  status: STATUS,
  roles: ROLES,
  roleDescriptions: ROLE_DESCRIPTIONS,
  permissions: PERMISSIONS,
  permissionGroups: PERMISSION_GROUPS,
  kinds: KINDS,
  sentiment: SENTIMENT,

  routes: {
    overview: { label: 'Overview', title: 'Overview', sections: ['Up next', 'Needs you', 'Audience growth', 'Top post this month', 'The week ahead', 'Network pulse', 'Inbox pulse', 'Team activity'] },
    compose: { label: 'Compose', title: 'New post', sections: ['New post', 'Preview', 'When', 'Your drafts'] },
    calendar: { label: 'Calendar', title: 'Publishing calendar', sections: ['Week · Month · List', 'Jump to a date', 'Unscheduled drafts', 'This week by network'] },
    inbox: { label: 'Inbox', title: 'Inbox', sections: ['Conversation list', 'Thread'] },
    approvals: { label: 'Approvals', title: 'Approvals', sections: ['Waiting for me', 'All pending', 'Changes requested', 'My submissions', 'Recently approved', 'The rule in force', 'Who approves'] },
    analytics: { label: 'Analytics', title: 'Analytics', sections: ['Audience growth', 'Impressions & engagement', 'Best time to post', 'Content mix', 'By network', 'Top posts', 'Brand comparison'] },
    listening: { label: 'Listening', title: 'Listening', sections: ['Tracked keywords', 'Mentions', 'Share of voice', 'Trending terms', 'Sentiment over time', 'Competitors'] },
    library: { label: 'Library', title: 'Library', sections: ['Media', 'Templates', 'Hashtag sets', 'Saved replies'] },
    channels: { label: 'Channels', title: 'Channels', sections: ['Needs attention', 'Per-brand channels', 'Audience by network', 'Supported networks'] },
    team: { label: 'Team & roles', title: 'Team & roles', sections: ['Members', 'Roles & permissions', 'Audit log'] },
    settings: { label: 'Settings', title: 'Settings', sections: ['Profile', 'Notifications', 'Workspace', 'Approvals', 'Security', 'Billing', 'Appearance', 'Data'] },
  } satisfies Record<string, RouteText>,

  shell: {
    documentTitle: (page: string, contact?: string) => (contact ? `${contact} · ${page} · Kataru` : `${page} · Kataru`),
    home: 'Kataru — overview',
    mainNav: 'Main',
    brandSwitcher: (brand: string | null) => `Brand: ${brand ?? 'all brands'}`,
    allBrands: 'All brands',
    /** The switcher's first row for someone who sees only some brands. */
    allMyBrands: 'All my brands',
    showingAll: 'Showing every brand',
    showing: (brand: string) => `Showing ${brand}`,
    notifications: 'Notifications',
    notificationsUnread: (n: number) => `Notifications, ${n} unread`,
    account: (name: string, role: string) => `Account: ${name}, ${role}`,
    accountMenu: 'Account',
    language: 'Language',
    reset: {
      item: 'Reset demo data',
      title: 'Reset demo data?',
      text: 'Every change you made here goes back to the starting data. Your theme stays.',
      confirm: 'Reset',
      cancel: 'Cancel',
      done: 'Demo data reset',
    },
    dock: 'Quick actions',
    search: 'Search',
    create: 'Create',
    todaysQueue: 'Today’s queue',
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
    theme: 'Theme',
    mobileNav: 'Mobile',
    mobileHome: 'Home',
    mobileInbox: 'Inbox',
    more: 'More',
    morePages: 'More pages',
    dark: 'Dark',
    light: 'Light',
    notRecreated: (routes: ReactNode[]) => (
      <>
        Only {routes[0]}, {routes[1]}, {routes[2]}, {routes[3]}, {routes[4]}, {routes[5]} and {routes[6]} are recreated. This route exists in the reference with the sections below.
      </>
    ),
  },

  /** The bell's list. Brand, network and person names are resolved by the caller. */
  notices: {
    title: 'Notifications',
    markAll: 'Mark all read',
    empty: 'You’re all caught up.',
    text: (e: NoticeEvent, brand: (id: string) => string, network: (id: NetworkId) => string, person: (id: string) => string) => {
      switch (e.type) {
        case 'waiting':
          return `${plural(e.count, 'post is', 'posts are')} waiting for your approval`
        case 'disconnected':
          return `${brand(e.brandId)} · ${network(e.network)} disconnected — ${plural(e.failed, 'post', 'posts')} failed`
        case 'expiring':
          return `${brand(e.brandId)} · ${network(e.network)} access expires in ${plural(e.days, 'day', 'days')}`
        case 'trending':
          return `A ${brand(e.brandId).split(' ')[0]} post is trending: ${e.ratio.toFixed(1)}× usual reach`
        case 'submitted':
          return `${person(e.by)} sent “${e.excerpt}” for approval`
        case 'approved':
          return `${person(e.by)} approved “${e.excerpt}”`
        case 'changes':
          return `${person(e.by)} asked for changes on “${e.excerpt}”`
      }
    },
  },

  /** Today's queue (dock clock, the More sheet's Today). */
  today: {
    title: 'Today',
    /** "Friday, Oct 30" */
    date: (d: Date) => dt({ weekday: 'long', month: 'short', day: 'numeric' }).format(d),
    empty: 'Nothing goes out today.',
    openCalendar: 'Open calendar',
    newPost: 'New post',
  },

  /** The dock's + (and the phone bar's Create). */
  createMenu: {
    newPost: 'New post',
    tomorrow: 'Schedule for tomorrow 9:00',
    connect: 'Connect a channel',
    invite: 'Invite a teammate',
  },

  overview: {
    greeting: (hour: number, name: string) => `${hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening'}, ${name}`,
    audienceGrowthBadge: (pct: string) => `${pct} in 30 days`,
    audience: 'Audience across your channels',
    engagement: 'Engagement rate, last 30 days',
    postsThisWeek: 'Posts going out this week',
    upNext: 'Up next',
    liveQueue: 'Live queue',
    openCalendar: 'Open calendar',
    openPost: 'Open post',
    goesOutIn: 'goes out in',
    comingUp: 'Coming up',
    needsYou: 'Needs you',
    approve: 'Approve',
    review: 'Review',
    retry: 'Retry',
    reconnect: 'Reconnect',
    showLess: 'Show less',
    showMore: (n: number) => `Show ${n} more`,
    todo: {
      expiring: (brand: string, network: string, days: number) => `${brand} · ${network} expires in ${days} d`,
      expiringDetail: 'Reconnect now so nothing stops going out.',
      disconnected: (brand: string, network: string) => `${brand} · ${network} is disconnected`,
      disconnectedDetail: 'Posts to it will fail until someone reconnects it.',
      failed: (brand: string) => `A ${brand} post failed`,
      failedDetail: 'Publishing failed.',
      approval: (author: string, brand: string, when: string) => `${author} wants approval · ${brand} · ${when}`,
      changes: (name: string) => `${name} asked for changes`,
      unhappy: (name: string) => `${name} is unhappy`,
      myPending: (n: number) => `${n} of your ${n === 1 ? 'post is' : 'posts are'} waiting for approval`,
      myPendingDetail: 'You’ll get a notification the moment someone reviews it.',
      edit: 'Edit',
      reply: 'Reply',
      view: 'View',
    },
    audienceGrowth: 'Audience growth',
    growthRange: 'Growth range',
    rangeOption: (days: number) => `${days}D`,
    expand: 'Expand',
    newFollowersIn: (days: number, rate: string) => `new followers in ${days} days · ${rate} growth`,
    newFollowersPerDay: 'New followers per day',
    newFollowers: 'New followers',
    topPost: 'Top post this month',
    openTopPost: 'Open the top post',
    usualReach: (times: string) => `${times} usual reach`,
    reach: 'reach',
    engRate: 'eng. rate',
    saves: 'saves',
    weekAhead: 'The week ahead',
    networkPulse: 'Network pulse',
    channels: 'Channels',
    engShort: (pct: string) => `${pct} eng.`,
    inboxPulse: 'Inbox pulse',
    openInbox: 'Open inbox',
    open: 'open',
    unread: 'unread',
    priority: 'priority',
    sentimentSplit: (p: number, n: number, neg: number) => `${p} positive, ${n} neutral, ${neg} negative`,
    sentimentLegend: (s: Sentiment, n: number) => `${SENTIMENT[s]} ${n}`,
    teamActivity: 'Team activity',
    auditLog: 'Audit log',
  },

  /** One line of the team activity feed, after the actor's first name. */
  activity: (a: AuditAction, brand: (id: string) => string, network: (n: NetworkId) => string) => {
    switch (a.type) {
      case 'approved':
        return `approved “${a.excerpt}” for ${brand(a.brandId)}`
      case 'reconnected':
        return `reconnected ${brand(a.brandId)} on ${network(a.network)}`
      case 'requestedChanges':
        return `requested changes on a ${brand(a.brandId)} post`
      case 'invited':
        return `invited ${a.name} as ${role(a.role)}`
      case 'grantedPermission':
        return `gave ${role(a.role)} the “${PERMISSIONS[a.permission].label}” permission`
      case 'scheduled':
        return `scheduled ${plural(a.count, 'post', 'posts')} for ${brand(a.brandId)}`
      case 'closedConversations':
        return `closed ${plural(a.count, 'conversation', 'conversations')}`
      case 'trackedKeyword':
        return `started tracking “${a.term}” for ${brand(a.brandId)}`
      case 'untrackedKeyword':
        return `stopped tracking “${a.term}” for ${brand(a.brandId)}`
      case 'openedMention':
        return `opened a conversation from ${/^[aeiox]/i.test(network(a.network)) ? 'an' : 'a'} ${network(a.network)} mention of “${a.term}”`
      case 'savedDraft':
        return `saved a draft for ${brand(a.brandId)}`
      case 'sentForApproval':
        return `sent “${a.excerpt}” for approval (${brand(a.brandId)})`
      case 'publishedPost':
        return `published “${a.excerpt}” to ${plural(a.networks, 'network', 'networks')}`
      case 'scheduledPost':
        return `scheduled “${a.excerpt}” for ${monthDay(new Date(a.at))} · ${time(new Date(a.at))}`
      case 'sentBack':
        return `requested changes on “${a.excerpt}”`
      case 'withdrew':
        return `withdrew “${a.excerpt}” from approval`
      case 'approvedMany':
        return `approved ${a.count} posts at once`
      case 'connectedChannel':
        return `${a.again ? 'reconnected' : 'connected'} ${brand(a.brandId)} on ${network(a.network)}`
    }
  },

  /** Why a post failed to publish. */
  failure: (network: string, brand: string) => `${network} disconnected the page — reconnect ${brand} to retry.`,

  postActions: {
    published: (networks: string[]) => `Published to ${networks.join(', ')}`,
    duplicated: 'Duplicated as a draft',
    deleted: 'Post deleted',
  },

  calendar: {
    titleLines: ['Publishing', 'calendar'],
    title: 'Publishing calendar',
    scheduledThisWeek: 'Scheduled this week',
    awaitingApproval: 'Awaiting approval',
    publishedThisWeek: 'Published this week',
    emptyDays: 'Empty days in the next 7',
    view: 'Calendar view',
    views: { week: 'Week', month: 'Month', list: 'List' },
    previous: (unit: 'week' | 'month') => `Previous ${unit}`,
    next: (unit: 'week' | 'month') => `Next ${unit}`,
    moved: (day: string, time: string) => `Moved to ${day} · ${time}`,
    pastSlot: 'That time has already passed. Pick a later slot.',
    periodSummary: (posts: number, brands: number) => `${plural(posts, 'post', 'posts')} · ${plural(brands, 'brand', 'brands')}`,
    bestTimes: 'Best times',
    quietBusy: 'quiet → busy',
    bestTimesHint: 'Shade each hour by how well posts do then',
    bestTimesOn: 'Best times on — darker hours get more engagement',
    nothingMatches: 'Nothing matches these filters',
    nothingInPeriod: (unit: 'week' | 'month') => `Nothing in this ${unit} fits that combination. Try another network or status.`,
    planningTools: 'Planning tools',
    allNetworks: 'All networks',
    byNetwork: 'Filter by network',
    byStatus: 'Filter by status',
    campaign: 'Campaign',
    allCampaigns: 'All campaigns',
    statusFilters: {
      scheduled: { label: 'Scheduled', legend: 'Scheduled' },
      pending: { label: 'Awaiting approval', legend: 'Awaiting' },
      published: { label: 'Published', legend: 'Published' },
      draft: { label: 'Drafts', legend: 'Drafts' },
      failed: { label: 'Failed', legend: 'Needs attention' },
    },
    nothingScheduled: 'Nothing scheduled yet',
    free: 'Free',
    /** An upcoming day with nothing going out. */
    gap: 'Gap',
    peak: 'Peak',
    campaigns: 'Campaigns',
    until: (date: string) => `until ${date}`,
    tile: (brand: string, status: string, when: string, text: string, movable: boolean) =>
      `${brand}, ${status}, ${when}: ${text}${movable ? '. Alt plus arrow keys move it' : ''}`,
    chip: (brand: string, status: string, when: string, text: string) => `${brand}, ${status}, ${when}: ${text}`,
    openWeekOf: (day: string) => `Open the week of ${day}`,
    newPostOn: (day: string) => `New post on ${day}`,
    more: (n: number) => `+${n} more`,
    jumpToDate: 'Jump to a date',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    dayPosts: (day: string, n: number) => `${day}, ${n} posts`,
    unscheduledDrafts: 'Unscheduled drafts',
    draftsHint: 'Drag one onto the calendar to give it a time',
    noDrafts: 'No drafts waiting for a slot.',
    draftLabel: (text: string) => `Draft: ${text}. Drag onto the calendar`,
    pencilled: (author: string, day: string, time: ReactNode) => (
      <>
        {author} · pencilled {day}, {time}
      </>
    ),
    thisWeekByNetwork: 'This week by network',
    nothingThisWeek: 'Nothing goes out this week.',
  },

  drawer: {
    label: 'Post',
    verb: {
      published: 'Published',
      draft: 'Pencilled for',
      failed: 'Was due',
      scheduled: 'Goes out',
      awaiting_approval: 'Goes out',
      changes_requested: 'Goes out',
    } satisfies Record<PostStatus, string>,
    /** "Goes out Tomorrow · 9:00 AM" */
    when: (status: PostStatus, stamp: string) => `${en.drawer.verb[status]} ${stamp}`,
    by: (name: string) => ` · by ${name}`,
    previewNetwork: 'Preview network',
    impressions: 'Impressions',
    reach: 'Reach',
    engagements: 'Engagements',
    engRate: 'Eng. rate',
    publishNow: 'Publish now',
    edit: 'Edit',
    duplicate: 'Duplicate',
    delete: 'Delete post',
    preview: (network: string) => `${network} preview`,
    like: 'Like',
    comment: 'Comment',
    repost: 'Repost',
    noMedia: 'No media',
    likes: (n: string) => `${n} likes`,
  },

  inbox: {
    title: 'Inbox',
    conversations: 'Conversations',
    openCount: 'open conversations',
    summary: (unread: ReactNode, median: ReactNode) => (
      <>
        {unread} unread · {median} median first reply
      </>
    ),
    filters: 'Filters',
    markAllRead: 'Mark all read',
    searchPlaceholder: 'Search or filter chats',
    searchLabel: 'Search conversations',
    viewsLabel: 'Views',
    views: { all: 'All', unread: 'Unread', mine: 'Mine', unassigned: 'Unassigned', priority: 'Priority', done: 'Done' },
    kind: 'Kind',
    network: 'Network',
    sentimentLabel: 'Sentiment',
    row: (o: { name: string; kind: string; network: string; brand: string; unread: number; priority: boolean; assignee?: string }) =>
      `${o.name}, ${o.kind} on ${o.network}, ${o.brand}${o.unread ? `, ${o.unread} unread` : ''}${o.priority ? ', priority' : ''}${o.assignee ? `, assigned to ${o.assignee}` : ''}`,
    previewYou: 'You: ',
    previewNote: 'Note: ',
    photo: 'Photo',
    done: 'Done',
    empty: {
      search: (q: string) => ({ title: 'Nothing matches', text: `No conversation here mentions “${q}”.` }),
      filtered: { title: 'Nothing matches', text: 'No conversation fits these filters.' },
      unread: { title: 'All caught up', text: 'Nothing unread across your networks.' },
      all: { title: 'Inbox zero', text: 'Every conversation is handled.' },
      mine: { title: 'Nothing assigned to you', text: 'Conversations a teammate hands you show up here.' },
      priority: { title: 'No priorities', text: 'Flag a conversation to keep it at hand.' },
      done: { title: 'Nothing closed yet', text: 'Conversations you mark done land here.' },
      unassigned: { title: 'Everyone has an owner', text: 'Every open conversation is assigned.' },
    },
    context: (kind: ConversationKind, network: string, brand: string) =>
      `${network} · ${
        kind === 'comment' ? `Comment on ${brand}’s post` : kind === 'message' ? `Message to ${brand}` : kind === 'mention' ? `Mentioned ${brand}` : `Review of ${brand}`
      }`,
    conversation: 'Conversation',
    backToChats: 'Back to chats',
    contactInfoFor: (name: string) => `Contact info for ${name}`,
    assignedTo: (name: string) => `Assigned to ${name} — reassign`,
    assign: 'Assign',
    removePriority: 'Remove priority',
    markPriority: 'Mark as priority',
    reopenKey: 'Reopen (E)',
    markDoneKey: 'Mark done (E)',
    contactInfo: 'Contact info',
    moreActions: 'More actions',
    markUnread: 'Mark as unread',
    openThePost: 'Open the post',
    copyHandle: (handle: string) => `Copy @${handle}`,
    addTagEllipsis: 'Add a tag…',
    assignToMe: 'Assign to me',
    unassigned: 'Unassigned',
    you: ' (you)',
    openPostLabel: (text: string) => `Open the post: ${text}`,
    onPost: (brand: string, date: string) => `On ${brand}’s post · ${date}`,
    log: (name: string) => `Conversation with ${name}`,
    noteBadge: 'Note · only your team sees this',
    read: 'Read',
    delivered: 'Delivered',
    attach: 'Attach',
    internalNote: 'Internal note',
    removePhoto: 'Remove photo',
    replyTo: (name: string) => `Reply to ${name}`,
    notePlaceholder: 'Note for the team…',
    moreSendOptions: 'More send options',
    addNote: 'Add note',
    send: 'Send',
    keyHint: (label: string) => `${label} (Enter)`,
    savedReplies: 'Saved replies',
    photoFromLibrary: 'Photo from the library',
    insertHandle: (handle: string) => `Insert @${handle}`,
    choosePhoto: 'Choose a photo',
    library: (brand: string) => `${brand} library`,
    noPhotos: 'No photos for this brand yet.',
    sendOptions: 'Send options',
    sendAndClose: 'Send & close',
    writeNote: 'Write an internal note',
    pick: 'Pick a conversation',
    pickHint: 'Every comment, message, mention and review from all your networks lands in one list.',
    keys: { nav: 'Next / previous', done: 'Mark done', reply: 'Reply', search: 'Search', send: 'Send' },
    closeInfo: 'Close contact info',
    followers: (network: string, n: string) => `${network} · ${n} followers`,
    kindLabel: 'Kind',
    statusLabel: 'Status',
    open: 'Open',
    priority: 'Priority',
    assignee: 'Assignee',
    handOff: 'Hand this to a teammate',
    tags: 'Tags',
    removeTag: (tag: string) => `Remove tag ${tag}`,
    tag: 'Tag',
    onThisPost: 'On this post',
    activity: 'Activity',
    messages: 'Messages',
    inOut: (inbound: number, outbound: number) => `· ${inbound} in · ${outbound} out`,
    firstContact: 'First contact',
    lastMessage: 'Last message',
    reopen: 'Reopen',
    markDone: 'Mark done',
    addTag: 'Add a tag',
    newTag: 'New tag',
    toast: {
      reopened: (first: string, kind: ConversationKind) => `Reopened ${first}’s ${kind}`,
      done: (first: string, kind: ConversationKind) => `Done · ${first}’s ${kind} closed`,
      sentAndClosed: (first: string) => `Sent to ${first} · conversation closed`,
      markedRead: (n: number) => `Marked ${n} as read`,
      priorityOn: 'Marked as priority',
      priorityOff: 'Priority removed',
      sentiment: (s: Sentiment) => `Marked ${s}`,
      tagged: (tag: string) => `Tagged ${tag}`,
      untagged: (tag: string) => `Removed ${tag}`,
      unread: 'Marked as unread',
      copied: (handle: string) => `Copied @${handle}`,
    },
  },
  analytics: {
    title: 'Analytics',
    audience: (accounts: number) => `Audience across ${plural(accounts, 'account', 'accounts')}`,
    newFollowers: (days: number) => `New followers, last ${days} days`,
    impressions: (days: number) => `Impressions, last ${days} days`,
    engagement: (posts: number) => `Avg. engagement rate, ${plural(posts, 'post', 'posts')}`,
    dateRange: 'Date range',
    rangeOption: (days: number) => `${days}D`,
    exportCsv: 'Export CSV',
    scheduleReport: 'Schedule a report',
    filterByNetwork: 'Filter by network',
    allNetworks: 'All networks',
    /** "5 brands · last 30 days", or the one brand in view. */
    note: (brands: number | string, days: number) => `${typeof brands === 'string' ? brands : plural(brands, 'brand', 'brands')} · last ${days} days`,
    expand: 'Expand',
    collapse: 'Collapse',
    thisPeriod: 'This period',
    previousPeriod: 'Previous period',
    growth: {
      title: 'Audience growth',
      sub: (days: number, vsBefore: string | null) =>
        `followers gained, last ${days} days · ${vsBefore === null ? 'no earlier period' : `${vsBefore} vs the ${days} days before`}`,
      legend: 'Followers gained, this period',
      chart: 'Followers gained per day, this period and the previous one',
    },
    metrics: {
      title: 'Impressions & engagement',
      label: 'Metric',
      options: { impressions: 'Impressions', engagements: 'Engagements', clicks: 'Clicks' },
      sub: (metric: 'impressions' | 'engagements' | 'clicks', days: number) => `${METRIC[metric].toLowerCase()}, last ${days} days`,
      legend: (metric: 'impressions' | 'engagements' | 'clicks') => `${METRIC[metric]}, this period`,
      chart: (metric: 'impressions' | 'engagements' | 'clicks') => `Daily ${METRIC[metric].toLowerCase()}, this period and the previous one`,
    },
    best: {
      title: 'Best time to post',
      sub: (timeZone: string) => `Engagement by weekday and hour, your time zone (${timeZone.replace('_', ' ')})`,
      networks: 'Network',
      all: 'All',
      heatmap: (network: string | null, slots: string[]) =>
        `Engagement heatmap for ${network ?? 'all networks'}. Best slots: ${slots.join(', ')}. Use the arrow keys to read any hour.`,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      /** Axis ticks every three hours: "12a", "3p". */
      hourTick: (h: number) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`,
      /** "Saturday 8 AM" */
      slot: (day: number, hour: number) => `${WEEKDAY_LONG[day]} ${HOUR(hour)}`,
      /** "Sat 8 AM" */
      slotShort: (day: number, hour: number) => `${WEEKDAY_SHORT[day]} ${HOUR(hour)}`,
      /** "Saturday · 8 AM–9 AM" */
      cell: (day: number, hour: number) => `${WEEKDAY_LONG[day]} · ${HOUR(hour)}–${HOUR(hour + 1)}`,
      index: (n: number) => `index ${n}`,
      engagementIndex: 'Engagement index',
      bestSlot: 'Best slot',
      plan: (slot: string) => `Plan a post for ${slot}`,
      bestSlots: 'Three best slots',
      quiet: 'Quiet',
      busy: 'Busy',
    },
    mix: {
      title: 'Content mix',
      sub: (posts: number, deliveries: number | null, days: number) =>
        deliveries === null
          ? `${posts === 1 ? 'post' : 'posts'} published, last ${days} days`
          : `${posts === 1 ? 'post' : 'posts'} published, ${plural(deliveries, 'network delivery', 'network deliveries')}`,
      row: (network: string, n: number, total: number) => `${network}: ${n} of ${plural(total, 'delivery', 'deliveries')}`,
      emptyTitle: 'Nothing published',
      emptyText: 'Posts that go out in this window are counted per network here.',
    },
    table: {
      byNetwork: 'By network',
      accountsOn: (network: string) => `${network} accounts`,
      caption: (days: number, byAccount: boolean) =>
        `Followers, growth, impressions, engagement rate and posts per ${byAccount ? 'account' : 'network'} for the last ${days} days. Column headers sort the table.`,
      network: 'Network',
      account: 'Account',
      accounts: 'Accounts',
      status: 'Status',
      followers: 'Followers',
      growth: 'Growth',
      impressions: 'Impressions',
      engRate: 'Eng. rate',
      posts: 'Posts',
      trend: 'Followers trend',
      trendShort: 'Trend',
      accountCount: (n: number) => plural(n, 'account', 'accounts'),
      channelStatus: { connected: 'Connected', expiring: 'Expiring', disconnected: 'Disconnected' },
      emptyTitle: 'No accounts here',
      emptyText: (network: string | null) => (network ? `Nothing in this view is connected on ${network}.` : 'Connect a channel to start collecting numbers.'),
    },
    top: {
      title: 'Top posts',
      rankBy: 'Rank by',
      options: { reach: 'Reach', eng: 'Eng. rate', clicks: 'Clicks' },
      unit: { reach: 'reach', eng: 'engagement rate', clicks: 'link clicks' },
      label: (rank: number, by: 'reach' | 'eng' | 'clicks', text: string) =>
        `#${rank} by ${by === 'reach' ? 'reach' : by === 'eng' ? 'engagement rate' : 'link clicks'}: ${text}`,
      impressions: 'Impressions',
      engagements: 'Engagements',
      emptyTitle: 'No published posts in this window',
      emptyText: (network: string | null, days: number) => `Nothing went out ${network ? `on ${network} ` : ''}in the last ${days} days. Try a longer range.`,
    },
    brands: {
      title: 'Brand comparison',
      compareBy: 'Compare by',
      options: { followers: 'Followers', eng: 'Eng. rate', impressions: 'Impressions' },
      meta: (accounts: number, posts: number) => `${plural(accounts, 'account', 'accounts')} · ${plural(posts, 'post', 'posts')}`,
    },
    /** What a report covers: "All brands", "All brands · Instagram". */
    scope: (network: string | null, brand: string | null = null) => `${brand ?? 'All brands'}${network ? ` · ${network}` : ''}`,
    exported: (days: number) => `Report for the last ${days} days exported`,
    report: {
      title: 'Schedule a report',
      sub: (scope: string) => `The ${scope} report is emailed as a PDF and a CSV, every period, to the people you pick.`,
      name: 'Report name',
      defaultName: (scope: string) => `${scope} — performance`,
      frequency: 'How often',
      frequencies: { weekly: 'Weekly, Mondays at 9:00', monthly: 'Monthly, on the 1st at 9:00' },
      recipients: 'Recipients',
      pickOne: 'Pick at least one recipient.',
      cancel: 'Cancel',
      submit: 'Schedule',
      scheduled: (frequency: 'weekly' | 'monthly', first: string) => `${frequency === 'weekly' ? 'Weekly' : 'Monthly'} report scheduled · first one ${first}`,
      menu: 'Scheduled reports',
      item: (name: string, frequency: 'weekly' | 'monthly', people: number) => `${name} · ${frequency}, ${plural(people, 'person', 'people')}`,
      hint: (names: string[], next: string) => `Recipients: ${names.join(', ')}. Next: ${next}`,
      newReport: 'New scheduled report',
      stopTitle: 'Stop this report?',
      stopText: (name: string, people: number) => `“${name}” stops going to ${plural(people, 'person', 'people')}.`,
      stop: 'Stop report',
      stopped: 'Report stopped',
    },
    web: {
      title: 'Websites',
      source: {
        demo: 'Google Analytics 4 · demo data',
        connecting: 'Connecting to Google Analytics…',
        live: (time: string) => `Google Analytics 4 · live · updated ${time}`,
      },
      connect: 'Connect Google Analytics',
      settings: 'GA4 settings',
      refresh: 'Refresh',
      disconnect: 'Disconnect',
      filter: 'Filter by website',
      allSites: 'All sites',
      noSite: (brands: string[]) => `No website: ${brands.join(', ')}`,
      waiting: (domains: string[]) => `Shown once Google Analytics is connected: ${domains.join(', ')}`,
      noProperty: (domains: string[]) => `No GA4 property: ${domains.join(', ')}`,
      emptyTitle: 'No website data yet',
      emptyText: 'Connect Google Analytics to see sessions, traffic sources and landing pages for your sites.',
      /** "1m 12s" */
      duration: (seconds: number) => {
        const s = Math.round(seconds)
        return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
      },
      traffic: {
        title: 'Website traffic',
        label: 'Metric',
        options: { sessions: 'Sessions', views: 'Views', keyEvents: 'Key events' },
        sub: (metric: 'sessions' | 'views' | 'keyEvents', days: number) => `${WEB_METRIC[metric].toLowerCase()}, last ${days} days`,
        legend: (metric: 'sessions' | 'views' | 'keyEvents') => `${WEB_METRIC[metric]}, this period`,
        chart: (metric: 'sessions' | 'views' | 'keyEvents') => `Daily ${WEB_METRIC[metric].toLowerCase()}, this period and the previous one`,
        engagementRate: 'Engagement rate',
        avgTime: 'Avg. engagement time',
        keyEventRate: 'Key event rate',
        points: (delta: string) => `${delta} pts`,
      },
      sources: {
        title: 'Traffic sources',
        sub: (share: string) => `sessions from social networks · ${share} of all`,
        label: 'Breakdown',
        options: { social: 'Social networks', channels: 'Channels' },
        channels: {
          organicSearch: 'Organic search',
          direct: 'Direct',
          organicSocial: 'Organic social',
          paidSocial: 'Paid social',
          referral: 'Referral',
          email: 'Email',
          paidSearch: 'Paid search',
          organicVideo: 'Organic video',
          display: 'Display',
          other: 'Other',
        },
        row: (name: string, sessions: string, share: string) => `${name}: ${sessions} sessions, ${share}`,
        emptySocial: 'No visits from social networks in this window.',
      },
      pages: {
        title: 'Landing pages',
        caption: (days: number) => `Sessions, change, engagement and key events per landing page for the last ${days} days. Column headers sort the table.`,
        page: 'Landing page',
        sessions: 'Sessions',
        change: 'Change',
        engRate: 'Eng. rate',
        avgTime: 'Avg. time',
        keyEvents: 'Key events',
        keyRate: 'Key event rate',
        trend: 'Sessions trend',
        showAll: (n: number) => `Show all ${n}`,
        showFewer: 'Show fewer',
        empty: 'No landing pages had sessions in this window.',
      },
      dialog: {
        title: 'Connect Google Analytics',
        sub: 'Read-only access to your GA4 properties. The access token stays in this tab and is never saved.',
        clientId: 'OAuth client ID',
        clientIdHint: 'Google Cloud → APIs & Services → Credentials, type “Web application”, with this address as an authorised JavaScript origin. Enable the Google Analytics Data API in the same project.',
        sites: 'Websites',
        sitesHint: 'A brand can have several websites, or none. Leave the property ID empty to keep a site out of live data.',
        brand: 'Brand',
        domain: 'Domain',
        property: 'GA4 property ID',
        propertyPlaceholder: 'e.g. 123456789',
        addSite: 'Add a website',
        remove: (domain: string) => `Remove ${domain || 'this website'}`,
        invalidProperty: 'Property IDs are numbers, like 123456789 (Admin → Property details).',
        needDomain: 'Add the domain.',
        needClient: 'Add the OAuth client ID to connect.',
        needProperty: 'Add at least one property ID to connect.',
        cancel: 'Cancel',
        save: 'Save',
        connect: 'Save and connect',
        disconnect: 'Disconnect',
      },
      toast: {
        connected: (sites: number) => `Google Analytics connected · ${plural(sites, 'site', 'sites')}`,
        refreshed: 'Google Analytics data refreshed',
        disconnected: 'Disconnected · back to demo data',
        saved: 'Website settings saved',
      },
      errors: {
        unreachable: 'Google sign-in couldn’t be loaded. Check the connection or any blocker.',
        closed: 'The Google window was closed before access was granted.',
        signIn: 'Google sign-in failed.',
        denied: 'This Google account can’t read that property.',
        expired: 'The Google session expired. Refresh to sign in again.',
        notFound: 'Property not found. Check the ID.',
        api: 'Google Analytics returned an error.',
      },
      siteError: (domain: string, message: string) => `${domain}: ${message}`,
    },
    csv: {
      separator: ',',
      file: (days: number, network: string | null) => `kataru-analytics-${days}d${network ? `-${network}` : ''}.csv`,
      title: 'Kataru analytics report',
      scope: 'Scope',
      period: 'Period',
      generated: 'Generated',
      summary: 'Summary',
      audience: 'Audience',
      newFollowers: 'New followers',
      followerGrowth: 'Follower growth',
      impressions: 'Impressions',
      avgEngagement: 'Avg. engagement rate',
      postsPublished: 'Posts published',
      date: 'Date',
      followers: 'Followers',
      engagements: 'Engagements',
      linkClicks: 'Link clicks',
      network: 'Network',
      account: 'Account',
      accounts: 'Accounts',
      growth: 'Growth',
      engRate: 'Eng. rate',
      posts: 'Posts',
      post: 'Post',
      brand: 'Brand',
      published: 'Published',
      networks: 'Networks',
      reach: 'Reach',
      /** Percentages with two decimals: "10.10%". */
      pct: (f: number) => `${(f * 100).toFixed(2)}%`,
      stamp: (d: Date) => d.toLocaleString(L),
    },
  },

  listening: {
    title: 'Listening',
    stats: {
      mentions: 'Mentions this week',
      net: 'Net sentiment, positive − negative',
      reach: 'Potential reach this week',
      share: (brand: string) => `Share of voice, ${brand}`,
    },
    track: 'Track a keyword',
    kinds: { brand: 'Brand', hashtag: 'Hashtag', topic: 'Topic', competitor: 'Competitor' } satisfies Record<KeywordKind, string>,
    keywords: {
      title: 'Tracked keywords',
      hint: 'Pick a keyword to filter the stream. Lines show 14 days of volume.',
      /** After the count: "9 this week". */
      thisWeek: 'this week',
      split: (pos: string, neu: string, neg: string) => `${pos} positive, ${neu} neutral, ${neg} negative`,
      splitTitle: (pos: string, neu: string, neg: string) => `${pos} positive · ${neu} neutral · ${neg} negative`,
      stop: (term: string) => `Stop tracking ${term}`,
      showAll: 'Show all keywords',
      showFewer: 'Show fewer',
      noneTitle: 'No keywords yet',
      noneText: 'Track your brand name, a hashtag or a competitor to start hearing what people say.',
    },
    stream: {
      title: 'Mentions',
      live: 'Live',
      paused: 'Paused',
      pause: 'Pause the live stream',
      resume: 'Resume the live stream',
      sentiment: 'Sentiment',
      all: 'All',
      network: 'Network',
      allNetworks: 'All networks',
      saved: 'Saved',
      activeFilters: 'Active filters',
      clearKeyword: (term: string) => `Clear keyword filter: ${term}`,
      clearTerm: (term: string) => `Clear search: ${term}`,
      reach: (n: string) => `${n} reach`,
      reply: 'Reply in inbox',
      openInInbox: 'Open in inbox',
      save: 'Save',
      unsave: 'Unsave',
      hide: 'Hide',
      more: (n: number) => `Show ${n} more`,
      everything: 'That’s every mention in view.',
      noneTitle: 'No mentions yet',
      noneText: 'New mentions of your keywords land here as they happen.',
      noMatchTitle: 'Nothing matches these filters',
      noMatchText: 'Try another sentiment or network, or clear the filters.',
      noSaved: 'Star a mention to keep it here.',
    },
    voice: {
      title: 'Share of voice',
      brand: 'Brand',
      of: 'of the conversation, this week',
      you: 'You',
      count: (name: string, n: number) => `${name}: ${plural(n, 'mention', 'mentions')} this week`,
      noneTitle: 'No competitors tracked',
      noneText: (brand: string) => `Add competitors for ${brand} to see how loud you are next to them.`,
    },
    trending: {
      title: 'Trending terms',
      sub: 'This week, in the mentions you track. Pick one to search the stream.',
      count: (n: number) => `${plural(n, 'mention', 'mentions')} this week`,
      noneTitle: 'Quiet week',
      noneText: 'Terms people use around your keywords will gather here.',
    },
    sentiment: {
      title: 'Sentiment over time',
      /** Next to the net figure; `pts` is the change in percentage points (rounded). */
      sub: (pts: number) => `net sentiment this week · ${pts === 0 ? 'level with' : `${pts > 0 ? '+' : '−'}${Math.abs(pts)} pts vs`} the week before`,
      chart: 'Mentions per day by sentiment, last 14 days',
    },
    competitors: {
      title: 'Competitors',
      caption: 'Followers, monthly growth, engagement rate and posts per week for the brand and its competitors.',
      account: 'Account',
      followers: 'Followers',
      growth: 'Growth',
      engagement: 'Engagement',
      perWeek: 'Posts / wk',
      you: 'You · last 30 days',
      noneTitle: 'No competitors for this brand',
      noneText: 'Competitors are set up per brand by an admin.',
    },
    dialog: {
      title: 'Track a keyword',
      sub: 'Kataru listens on every connected network and backfills the last few days.',
      term: 'Keyword, hashtag or name',
      placeholder: '#flatwhite, “cold brew”, a competitor…',
      kind: 'Kind',
      brand: 'For brand',
      cancel: 'Cancel',
      submit: 'Start tracking',
      tooShort: 'That keyword is too short to listen for.',
      duplicate: (brand: string, term: string) => `${brand} already tracks “${term}”.`,
    },
    toast: {
      tracking: (term: string, n: number) => `Tracking “${term}” · ${plural(n, 'mention', 'mentions')} backfilled`,
      stopped: (term: string) => `Stopped tracking “${term}”`,
      paused: 'Live stream paused — new mentions wait until you resume',
      resumed: 'Live stream resumed',
      hidden: 'Mention hidden from the stream',
      saved: 'Saved · find it under Saved',
      unsaved: 'Removed from saved',
      moved: (brand: string) => `Moved to the inbox · ${brand}`,
      noChannel: (brand: string) => `${brand} has no connected channel to reply from`,
    },
  },

  compose: {
    title: 'Compose',
    stats: { drafts: 'Your drafts & changes', waiting: 'Waiting for approval', scheduled: 'Scheduled, next 7 days' },
    newPost: 'New post',
    untitled: 'Untitled post',
    editor: {
      newTitle: 'New post',
      editTitle: 'Edit post',
      viewTitle: 'View post',
      brand: 'Brand',
      pickBrand: 'Pick a brand',
      postTo: 'Post to',
      picked: (n: number, total: number) => `${n} of ${total}`,
      channel: (network: string, on: boolean) => `${on ? 'Remove' : 'Add'} ${network}`,
      expiring: (network: string) => `${network} access expires soon`,
      disconnected: (network: string) => `${network} is disconnected`,
      fix: 'Fix',
      askAdmin: 'Ask an admin',
      noChannels: 'This brand has no connected channel yet.',
      noChannelsLink: 'Connect one',
      text: 'Post text',
      placeholder: (brand: string) => `What’s new at ${brand}? Write once — Kataru fits it to every network.`,
      media: 'Media',
      hashtags: 'Hashtags',
      template: 'Template',
      assist: 'Assist',
      left: (network: string, n: string, limit: string) => `${network}: ${n} of ${limit} characters left`,
      over: (network: string, n: string) => `${network}: ${n} over the limit`,
      photos: 'Photos',
      removePhoto: (n: number) => `Remove photo ${n}`,
      moveEarlier: (n: number) => `Move photo ${n} earlier`,
      moveLater: (n: number) => `Move photo ${n} later`,
      addMedia: 'Add more media',
      more: 'More options',
      moreSub: 'First comment, link, campaign',
      firstComment: 'First comment',
      firstCommentHint: 'Goes up as the first comment, right after the post.',
      firstCommentPlaceholder: 'Hashtags or a link, posted as the first comment',
      firstCommentNeedsIg: 'Pick an Instagram channel to add a first comment.',
      link: 'Link',
      utm: 'Tag for web analytics',
      utmHint: 'Tag every link so web analytics knows it came from social.',
      copyLink: 'Copy link',
      insertLink: 'Insert',
      campaign: 'Campaign',
      noCampaign: 'No campaign',
      noCampaigns: 'No campaigns for this brand',
    },
    issues: {
      noChannel: 'Pick at least one channel',
      empty: 'Write something or add a photo',
      past: 'Pick a time in the future',
      link: 'That link looks incomplete',
      over: (n: string, network: string) => `${n} characters over ${network}’s limit`,
      needsPhoto: (network: string) => `${network} needs a photo`,
      needsVideo: (network: string) => `${network} needs a video or photo carousel`,
      expires: (network: string, days: number) => `${network} access expires in ${plural(days, 'day', 'days')}`,
      ready: (n: number) => `Ready for ${plural(n, 'network', 'networks')}`,
    },
    preview: {
      title: 'Preview',
      network: 'Preview network',
      sub: (network: string, handle: string) => `${network} · @${handle}`,
      show: 'Show preview',
      hide: 'Hide preview',
      noneTitle: 'Nothing to preview',
      noneText: 'Pick a channel and the post shows up here, laid out the way that network shows it.',
      tips: {
        instagram: 'The first 125 characters show before “more”. Photos crop to a square.',
        facebook: 'Long posts fold after about 240 characters.',
        x: 'Links count as 23 characters, however long they are.',
        linkedin: 'About 210 characters show before “see more”.',
        tiktok: 'Vertical 9:16 — the caption sits over the video.',
        youtube: 'Shorts are vertical; the caption sits over the video.',
        pinterest: 'The first sentence becomes the pin’s title.',
        threads: '500 characters. Links unfurl into a card.',
      } satisfies Record<NetworkId, string>,
    },
    when: {
      title: 'When',
      date: 'Date',
      time: 'Time',
      goesOut: (rel: string) => `Goes out ${rel}`,
      setFor: (rel: string) => `Set for ${rel}`,
      wentOut: (rel: string) => `Went out ${rel}`,
      passed: 'That time has passed — pick another',
      best: 'Best times',
      bestFor: 'Best times for',
      nextFree: 'Next free slot',
      nextFreeToast: (when: string) => `Next free slot: ${when}`,
      day: 'That day',
      close: (n: number, brand: string) => `${plural(n, 'other post', 'other posts')} from ${brand} within an hour of this one`,
      sameDay: (n: number, brand: string) => `${plural(n, 'other post', 'other posts')} from ${brand} that day, none close to this one`,
      nothing: (brand: string) => `Nothing else from ${brand} that day`,
      ticks: ['12a', '6a', '12p', '6p', '12a'],
      tz: (zone: string) => `Times are in the workspace time zone, ${zone}.`,
    },
    bar: {
      direct: 'You can publish directly',
      approval: 'Goes through approval',
      approvers: (names: string[]) =>
        names.length === 1 ? `${names[0]} can approve` : names.length === 2 ? `${names[0]} or ${names[1]} can approve` : `${names.slice(0, 2).join(', ')} +${names.length - 2} can approve`,
      noApprovers: 'No one can approve this brand yet',
      channels: (n: number): string => (n === 1 ? 'channel' : 'channels'),
      schedule: 'Schedule',
      update: 'Update schedule',
      send: 'Send for approval',
      resend: 'Resend for approval',
      now: 'Publish now',
      draft: 'Save draft',
      ruleAll: 'Workspace rule: every post goes through approval',
      fix: (n: number) => `${plural(n, 'thing', 'things')} to fix before it can go`,
      notify: 'You’ll get a notification when it’s approved.',
      goesOut: (rel: string) => `Goes out ${rel}.`,
      published: 'Published',
      readOnly: 'Read only',
      open: 'Open post',
      duplicate: 'Duplicate',
    },
    drafts: {
      title: 'Your drafts',
      toFinish: 'To finish',
      waiting: 'Waiting for approval',
      started: (status: string, rel: string) => `${status} · started ${rel}`,
      sent: (status: string, rel: string) => `${status} · sent ${rel}`,
      remove: 'Delete draft',
      noneTitle: 'No drafts waiting',
      noneText: 'Save a post as a draft and it waits here. Posts sent back to you with changes land here too.',
    },
    notes: {
      changes: (name: string) => `${name} asked for changes`,
      noNote: 'No note left.',
      fixIt: (rel: string) => `${rel} · fix it here, then send it again`,
      waiting: (names: string) => `Waiting on ${names}`,
      anApprover: 'an approver',
      sentBy: (who: string, rel: string) => `${who} sent it ${rel}. Saving changes sends the new version for approval.`,
      you: 'You',
      scheduled: (when: string) => `Scheduled for ${when}`,
      keeps: 'Saving keeps it scheduled, at the time you set below.',
      backForApproval: 'Your changes go back for approval before it goes out.',
      published: (when: string) => `Published ${when}`,
      publishedText: 'Published posts can’t be edited. Open it to see how it’s doing, or start a new post from it.',
      failed: 'This post didn’t go out',
    },
    pickers: {
      library: (brand: string) => `${brand} library`,
      selected: (n: number) => `${n} selected`,
      openLibrary: 'Open library',
      done: 'Done',
      noMedia: (brand: string) => `${brand} has no media yet`,
      noMediaText: 'Photos uploaded to the Library show up here.',
      hashtags: 'Hashtag sets',
      suggested: 'Suggested',
      noSets: 'No hashtag sets for this brand',
      noSetsText: 'Save sets in the Library. Assist → Add hashtags still suggests a few.',
      templates: 'Templates',
      everyBrand: 'Every brand',
      noTemplates: 'No templates yet',
      noTemplatesText: 'Templates saved in the Library show up here.',
      templateHint: 'Replace the {braces} before posting.',
    },
    assist: {
      shorter: { label: 'Shorter', done: 'Trimmed it down', same: 'Already short and sweet' },
      friendlier: { label: 'Friendlier', done: 'Warmed it up', same: 'Already friendly' },
      tags: { label: 'Add hashtags', done: 'Added the brand’s hashtags', same: 'Those hashtags are already in' },
      cta: { label: 'Add a call to action', done: 'Added a call to action', same: 'It already has a call to action' },
      tidy: { label: 'Fix spacing', done: 'Spacing and capitals fixed', same: 'Spacing already looks right' },
      undo: (label: string) => `Undo “${label}”`,
      undone: (label: string) => `Undid “${label}”`,
      writeFirst: 'Write something first — Assist rewrites your text',
      greeting: /^(?:hey|hi|hello|morning|good morning|friends)\b/i,
      hello: 'Hey friends!',
      ctaLine: (brandId: string) =>
        ({
          eo: 'Grab a bag before Thursday — link in bio.',
          hh: 'Shop the collection — link in bio.',
          vg: 'Book your slot — link in bio.',
          wb: 'Find your ritual — link in bio.',
          ns: 'Want this for your brand? Send us a message.',
        })[brandId] ?? 'Tap the link to find out more.',
    },
    toast: {
      draftSaved: 'Draft saved',
      sent: (n: number) => `Sent for approval · ${n} can approve`,
      published: (networks: string[]) => `Published to ${networks.join(', ')}`,
      scheduled: (when: string) => `Scheduled for ${when}`,
      view: 'View',
      deleted: 'Draft deleted',
      photoRemoved: 'Photo removed',
      maxMedia: 'Up to 10 photos in one post',
      linkCopied: 'Link copied',
      linkAdded: 'Link added to the post',
      tagsAdded: (name: string) => `Added “${name}”`,
      templateInserted: (name: string) => `“${name}” inserted`,
      writeBeforeDraft: 'Write something before saving a draft',
      fixFirst: 'Fix the post first',
      gone: 'That post isn’t here any more',
      duplicated: 'Duplicated as a new post',
    },
  },

  approvals: {
    title: 'Approvals',
    stats: {
      waiting: 'Waiting for you',
      yours: 'Your posts in review',
      /** `rel` is an `ago` string: "5 h ago" → "oldest 5 h". */
      oldest: (rel: string) => `oldest ${rel.replace(/ ago$/, '')}`,
      changes: 'Changes requested',
      week: 'Approved this week',
      average: 'Average time to approve',
    },
    /** "45 min", "2.6 h" */
    duration: (min: number) => (min < 60 ? `${Math.round(min)} min` : `${(min / 60).toFixed(1)} h`),
    queue: 'Approval queue',
    tabs: { mine: 'Waiting for me', pending: 'All pending', changes: 'Changes requested', submitted: 'My submissions', approved: 'Recently approved' },
    brands: 'Filter by brand',
    all: 'All',
    selectAll: 'Select all',
    more: (n: number) => `Show ${n} more`,
    select: (title: string) => `Select “${title}”`,
    posts: 'Posts',
    textOnly: 'Text only',
    photo: (n: number) => `Photo ${n}`,
    when: { goesOut: 'Goes out', dueSoon: 'Due soon · goes out', wasDue: 'Was due', wentOut: 'Went out' },
    /** "Tomorrow 09:00", "Sun 19:00", "Nov 5 10:00" — 24-hour, as the reference's cards show it. */
    slot: (d: Date, now: Date) => {
      const diff = dayDiff(now, d)
      const hm = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
      return `${diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff > 1 && diff < 7 ? weekday(d) : monthDay(d)} ${hm}`
    },
    sent: (rel: string) => `sent ${rel}`,
    writtenBy: 'Written by',
    canApprove: 'Can approve',
    approvers: 'Approvers',
    you: 'You',
    reviewers: (names: string[], total: number) => (total === 1 ? names[0] : total === 2 ? `${names[0]} or ${names[1]}` : `${names[0]}, ${names[1]} +${total - 2}`),
    noOne: 'No one can approve this brand',
    history: 'Review history',
    earlier: (n: number) => `${plural(n, 'earlier step', 'earlier steps')}`,
    did: { submitted: 'sent it for approval', approved: 'approved it', changes: 'asked for changes', comment: 'left a note' },
    approve: 'Approve',
    requestChanges: 'Request changes',
    fix: 'Fix & resubmit',
    withdraw: 'Withdraw to drafts',
    edit: 'Edit',
    open: 'Open post',
    ownPost: 'You wrote this post — another approver signs it off',
    stamp: 'Approved',
    sentBackTo: (name: string) => `Sent back to ${name}`,
    justNow: 'just now',
    rule: {
      title: 'The rule in force',
      perm: { title: 'Approval when it’s needed', text: 'Anyone without “Publish without approval” sends their posts here first.' },
      all: { title: 'Every post is approved', text: 'Even a manager’s post needs a second pair of eyes before it goes out.' },
      off: { title: 'Approvals are off', text: 'Posts go straight to the calendar. Turn the rule on to review before anything goes out.' },
      path: 'A post’s path',
      steps: { draft: 'Draft', approval: 'Approval', scheduled: 'Scheduled', published: 'Published' },
      loop: 'Changes requested go back to the writer',
      needs: 'Needs approval',
      can: 'Can approve',
      noOne: 'No one',
      direct: 'Your posts go straight to the calendar.',
      reviewed: 'Your posts come here first.',
      reviewer: 'You don’t write posts — you review them.',
      change: 'Change the rule',
    },
    who: {
      title: 'Who approves',
      hint: 'tap a brand to filter',
      count: (n: number, waiting: number) => `${n} can approve${waiting ? ` · ${waiting} waiting` : ''}`,
      noOne: 'No one can approve',
    },
    bulk: { region: 'Selected posts', selected: 'selected', approve: 'Approve selected', clear: 'Clear' },
    dialog: {
      title: 'Request changes',
      sub: (name: string) => `${name} will see this note on the post.`,
      quick: 'Quick notes',
      chips: ['Swap the photo', 'Shorten the caption', 'Check the price', 'Add the link', 'Fix the hashtags', 'Move the time'],
      label: 'What should change?',
      placeholder: 'Lead with the price, and swap the photo for the close-up.',
      required: 'Say what should change.',
      submit: 'Send back',
      cancel: 'Cancel',
    },
    toast: {
      approved: (when: string) => `Approved · goes out ${when}`,
      approvedMany: (n: number) => `Approved ${plural(n, 'post', 'posts')} · they go out on schedule`,
      sentBack: (name: string) => `Sent back to ${name}`,
      withdrawn: 'Withdrawn to drafts',
      withdrawNote: 'Withdrew it to keep editing.',
      reconnectFirst: 'Reconnect the channel first',
      channels: 'Channels',
    },
    empty: {
      brandTitle: 'Nothing for this brand here',
      brandText: (brand: string, n: number) => `No ${brand} posts in this tab — ${n} from other brands.`,
      everyBrand: 'Show every brand',
      mine: { title: 'Inbox zero for approvals', text: 'Nothing is waiting on you. New posts land here the moment someone sends one.' },
      notReviewer: { title: 'Approving isn’t part of your role', text: 'Your posts go to a manager or the client. Follow them under My submissions.' },
      pending: { title: 'Nothing pending', text: 'Every post that needed sign-off has had it. Drafts sent for approval show up here.' },
      changes: { title: 'No posts sent back', text: 'When an approver asks for changes, the post and their note wait here for the writer.' },
      submitted: { title: 'You have nothing in review', text: 'Write a post — if it needs sign-off it comes here, and you’ll see every note on it.' },
      approved: { title: 'Nothing approved lately', text: 'Posts approved in the last 14 days are listed here with when they go out.' },
      write: 'Write a post',
    },
  },

  /** Signing a channel back in (overview "Reconnect", channels page). */
  authorise: {
    title: (network: string) => `Authorise on ${network}`,
    sub: (handle: string) => `Signed in as ${handle}. Kataru is asking to:`,
    scopes: (brand: string) => ['Publish posts and stories', 'Read comments and messages', `Reply as ${brand}`, 'Read page insights'],
    allow: 'Allow access',
    cancel: 'Cancel',
    connected: (brand: string, network: string) => `${brand} · ${network} connected`,
  },
}

export type Messages = typeof en
