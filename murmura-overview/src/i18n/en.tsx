import type { ReactNode } from 'react'
import type { AuditAction, ConversationKind, NetworkId, Permission, PostStatus, Role, Sentiment } from '../data/types'
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

const ROLES: Record<Role, string> = {
  Owner: 'Owner',
  Admin: 'Admin',
  Manager: 'Manager',
  Editor: 'Editor',
  Contributor: 'Contributor',
  Community: 'Community',
  Analyst: 'Analyst',
}

const PERMISSIONS: Record<Permission, string> = { assignConversations: 'Assign conversations' }

const KINDS: Record<ConversationKind, { one: string; many: string }> = {
  comment: { one: 'Comment', many: 'Comments' },
  message: { one: 'Message', many: 'Messages' },
  mention: { one: 'Mention', many: 'Mentions' },
  review: { one: 'Review', many: 'Reviews' },
}

const SENTIMENT: Record<Sentiment, string> = { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' }

type RouteText = { label: string; title: string; sections: string[] }

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
    ago: (iso: string, now: Date) => {
      const mins = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60_000))
      if (mins < 1) return 'just now'
      if (mins < 60) return `${mins} min ago`
      const h = Math.floor(mins / 60)
      return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`
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
    /** "976.3K" */
    compact: (n: number) => num('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n),
    pct1,
    signedPct1: (f: number) => `${f >= 0 ? '+' : '−'}${pct1(Math.abs(f))}`,
    /** "8.9×" */
    times: (n: number) => `${n}×`,
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
    documentTitle: (page: string, contact?: string) => (contact ? `${contact} · ${page} · Murmura` : `${page} · Murmura`),
    home: 'Murmura — overview',
    mainNav: 'Main',
    brandSwitcher: 'Brand: all brands',
    allBrands: 'All brands',
    notifications: 'Notifications',
    notificationsUnread: (n: number) => `Notifications, ${n} unread`,
    account: (name: string, role: string) => `Account: ${name}, ${role}`,
    accountMenu: 'Account',
    language: 'Language',
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
    notRecreated: (routes: ReactNode[]) => (
      <>
        Only {routes[0]}, {routes[1]} and {routes[2]} are recreated. This route exists in the reference with the sections below.
      </>
    ),
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
        return `invited ${a.name} as ${ROLES[a.role]}`
      case 'grantedPermission':
        return `gave ${ROLES[a.role]} the “${PERMISSIONS[a.permission]}” permission`
      case 'scheduled':
        return `scheduled ${plural(a.count, 'post', 'posts')} for ${brand(a.brandId)}`
      case 'closedConversations':
        return `closed ${plural(a.count, 'conversation', 'conversations')}`
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
}

export type Messages = typeof en
