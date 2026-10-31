/**
 * Data model for the Kataru workspace. Shapes were derived from what the
 * reference UI renders (DOM text, data-* attributes, chart paths), normalised
 * into entities so every widget on #/overview can be computed from them.
 */

import type { AccountRange, NetworkSeries, Range } from './analyticsData'

export type ISODate = string

export type NetworkId =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'threads'
  | 'pinterest'
  | 'youtube'
  | 'x'
  | 'linkedin'

/** Semantic colour roles used for badges, chips, brand marks and meters. */
export type Tone = 'butter' | 'pine' | 'coral' | 'sea' | 'lilac' | 'ink' | 'plain'

/** The seven roles every workspace starts with; teams can add their own (named) roles too. */
export type SystemRole = 'owner' | 'admin' | 'manager' | 'editor' | 'community' | 'analyst' | 'client'

/** What a role lets people do (the Team page's permission matrix). */
export type Permission =
  | 'post.create'
  | 'post.publish'
  | 'post.approve'
  | 'post.delete'
  | 'calendar.edit'
  | 'inbox.reply'
  | 'inbox.assign'
  | 'analytics.view'
  | 'analytics.export'
  | 'listening.manage'
  | 'library.manage'
  | 'channels.manage'
  | 'team.manage'
  | 'billing.manage'
  | 'settings.manage'

export interface RoleDef {
  /** A SystemRole, or a generated id for a role the team added. */
  id: string
  /** Only for added roles; system roles are named by the catalogues. */
  name?: string
  description?: string
  perms: Permission[]
  tone: Tone
  system: boolean
}

export interface Brand {
  id: string
  name: string
  initials: string
  tone: Tone
  /** Account handle used in post previews, e.g. "emberandoak". */
  handle: string
  /** "Coffee roasters · Portland" (workspace content, not translated). */
  industry: string
}

/** A dated marketing push for one brand, drawn as a ribbon across the calendar. */
export interface Campaign {
  id: string
  brandId: string
  name: string
  /** Inclusive day range, YYYY-MM-DD. */
  start: string
  end: string
}

export interface TeamMember {
  id: string
  name: string
  /** RoleDef id. */
  role: string
  /** Missing for people without a photo (and invites): tinted initials instead. */
  avatar?: string
  /** Job title shown when they're assigned a conversation. */
  title?: string
  /** Brands they work on; only these teammates are offered when assigning a conversation. */
  brands: string[] | 'all'
  /** Where scheduled reports are sent. */
  email: string
  status: 'active' | 'invited' | 'suspended'
  /** Two-factor sign-in turned on. */
  mfa: boolean
  joinedAt: ISODate
  /** Missing until they first sign in. */
  lastActiveAt?: ISODate
}

export type ChannelStatus = 'connected' | 'expiring' | 'disconnected'

/** One connected social account: a brand on a network. */
export interface Channel {
  id: string
  brandId: string
  network: NetworkId
  /** Handle or page name as the network shows it, e.g. "@emberandoak" or "Ember & Oak". */
  handle: string
  followers: number
  status: ChannelStatus
  /** Days until the token expires, when status === 'expiring'. */
  expiresInDays?: number
}

/**
 * A website a brand owns, measured with Google Analytics 4. Like social
 * accounts, a brand can have none, one or several.
 */
export interface Website {
  id: string
  brandId: string
  /** Hostname shown in the UI, e.g. "emberandoak.com". */
  domain: string
  /** GA4 property ID (digits only). With one, "Connect Google Analytics" reads the site's real data. */
  propertyId?: string
  /** Sites from the mock come with generated demo traffic; sites people add only ever show live data. */
  demo?: boolean
}

export type PostStatus =
  | 'draft'
  | 'awaiting_approval'
  | 'changes_requested'
  | 'scheduled'
  | 'published'
  | 'failed'

/** Lifetime totals of a published post across its networks. Engagements = likes + comments + shares + saves. */
export interface PostMetrics {
  impressions: number
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number
  /** Link clicks. */
  clicks: number
  views: number
}

/** One step of a post's sign-off: sent for approval, approved, or sent back with a note. */
export interface Review {
  /** Team member id. */
  by: string
  at: ISODate
  /** 'comment' is a note without a decision, e.g. withdrawing a post to keep editing it. */
  decision: 'submitted' | 'approved' | 'changes' | 'comment'
  note?: string
}

export interface Post {
  id: string
  brandId: string
  authorId: string
  text: string
  /** Photo seeds in order (see assets.ts), up to 10; posts without media render their brand mark. */
  media: string[]
  networks: NetworkId[]
  status: PostStatus
  /** Publish time; for drafts, the time they are pencilled in for. */
  scheduledAt: ISODate
  /** When it was started. */
  createdAt: ISODate
  reviews: Review[]
  campaignId?: string
  /** Instagram only: posted as the first comment, right after the post. */
  firstComment?: string
  link?: string
  metrics?: PostMetrics
  /** Why publishing failed; the UI words it per language. */
  failure?: { network: NetworkId; code: 'disconnected' }
}

export interface DailyPoint {
  date: ISODate
  value: number
}

export type Sentiment = 'positive' | 'neutral' | 'negative'

/** What kind of inbound item opened the conversation. */
export type ConversationKind = 'comment' | 'message' | 'mention' | 'review'

export interface Message {
  id: string
  from: 'them' | 'us'
  /** Internal note: shown to the team only, never sent to the contact. */
  note?: boolean
  /** Teammate who wrote it (replies and notes). */
  authorId?: string
  text: string
  at: ISODate
  /** Photo seed attached to the message (see assets.ts). */
  image?: string
  /** Replies only: whether the contact has seen it. */
  read?: boolean
}

export interface Contact {
  name: string
  handle: string
  /** Missing for contacts without a photo: the UI falls back to tinted initials. */
  avatar?: string
  followers: number
}

export interface Conversation {
  id: string
  brandId: string
  network: NetworkId
  kind: ConversationKind
  contact: Contact
  /** Post a comment was left on (comments only). */
  postId?: string
  messages: Message[]
  sentiment: Sentiment
  unread: boolean
  priority: boolean
  status: 'open' | 'done'
  assigneeId?: string
  tags: string[]
}

/** A picture in a brand's media library, offered by the composer's "Photo from the library". */
export interface MediaAsset {
  seed: string
  brandId: string
  title: string
  tags: string[]
  starred?: boolean
  width: number
  height: number
  addedAt: ISODate
  /** Team member id. */
  addedBy: string
}

/** A caption to start from; `{product}`-style slots are filled in by hand. */
export interface Template {
  id: string
  /** Null: every brand can use it. */
  brandId: string | null
  name: string
  text: string
}

/** Hashtags a brand always uses, added in one tap. */
export interface HashtagSet {
  id: string
  brandId: string
  name: string
  tags: string[]
}

/**
 * Who needs a second pair of eyes: nobody ('off'), people whose role lacks
 * "Publish without approval" ('perm'), or everyone but owners and admins ('all').
 */
export type ApprovalRule = 'off' | 'perm' | 'all'

export interface WorkspaceSettings {
  name: string
  /** 1 = weeks start on Monday. */
  weekStart: 0 | 1
  approval: ApprovalRule
  shortenLinks: boolean
  /** Tag links in posts with utm_source / utm_medium / utm_campaign. */
  utm: boolean
  utmSource: string
  notify: { approvals: boolean; mentions: boolean; failures: boolean; digest: boolean }
  plan: 'starter' | 'growth' | 'agency'
  seats: number
  requireMfa: boolean
}

export interface SavedReply {
  id: string
  title: string
  text: string
}

export type AuditKind = 'approval' | 'channel' | 'review' | 'member' | 'permission' | 'schedule' | 'inbox' | 'listening' | 'auth'


/** An analytics report emailed on a schedule. */
export interface ScheduledReport {
  id: string
  name: string
  frequency: 'weekly' | 'monthly'
  recipientIds: string[]
  /** What it covers, e.g. "All brands · Instagram". */
  scope: string
}

/** What happened, as data: the activity feed turns it into a sentence in the current language. */
export type AuditAction =
  | { type: 'approved'; excerpt: string; brandId: string }
  | { type: 'reconnected'; brandId: string; network: NetworkId }
  | { type: 'requestedChanges'; brandId: string }
  | { type: 'invited'; name: string; role: string }
  | { type: 'grantedPermission'; role: string; permission: Permission }
  | { type: 'scheduled'; count: number; brandId: string }
  | { type: 'closedConversations'; count: number }
  | { type: 'trackedKeyword'; term: string; brandId: string }
  | { type: 'untrackedKeyword'; term: string; brandId: string }
  | { type: 'openedMention'; network: NetworkId; term: string }
  | { type: 'savedDraft'; brandId: string }
  | { type: 'sentForApproval'; excerpt: string; brandId: string }
  | { type: 'publishedPost'; excerpt: string; networks: number }
  | { type: 'scheduledPost'; excerpt: string; at: ISODate }
  | { type: 'sentBack'; excerpt: string }
  | { type: 'withdrew'; excerpt: string }
  | { type: 'approvedMany'; count: number }
  | { type: 'connectedChannel'; brandId: string; network: NetworkId; again: boolean }
  | { type: 'signedIn' }
  | { type: 'signedOut' }
  | { type: 'switchedAccount'; to: string }

export interface AuditEvent {
  id: string
  actorId: string
  kind: AuditKind
  action: AuditAction
  at: ISODate
}

/* ───────────── listening ───────────── */

/** What a tracked keyword stands for; sets its badge and dot colour. */
export type KeywordKind = 'brand' | 'hashtag' | 'topic' | 'competitor'

/** A term the workspace listens for on every network, on behalf of one brand. */
export interface Keyword {
  id: string
  brandId: string
  /** "Ember & Oak", "#slowcoffee", "pour over"… */
  term: string
  kind: KeywordKind
  /** Mentions per day in the week before this one, oldest first (the first half of its 14-day line). */
  history: number[]
}

/** A public post that matched a tracked keyword. */
export interface Mention {
  id: string
  keywordId: string
  network: NetworkId
  author: string
  /** Without the "@". */
  handle: string
  /** Missing for people without a photo: the UI falls back to tinted initials. */
  avatar?: string
  text: string
  at: ISODate
  sentiment: Sentiment
  /** Potential reach: the author's audience on that network. */
  reach: number
  saved?: boolean
  hidden?: boolean
  /** Conversation opened from it with "Reply in inbox". */
  conversationId?: string
}

/** A rival account a brand benchmarks against (share of voice, competitors table). */
export interface Competitor {
  id: string
  brandId: string
  name: string
  handle: string
  followers: number
  /** Follower growth over the last 30 days, as a fraction. */
  growth: number
  engagementRate: number
  postsPerWeek: number
  /** Mentions of them this week from sources beyond our own keywords. */
  mentions: number
}

export interface AnalyticsHistory {
  series: Record<NetworkId, NetworkSeries>
  /** Keyed by channel id. */
  accounts: Record<string, Record<Range, AccountRange>>
  networkTrends: Record<NetworkId, Record<Range, number[]>>
  heat: Record<NetworkId | 'all', number[]>
}

export interface Workspace {
  /** Frozen "now" so relative labels (Tomorrow, 18 h 45 min…) are reproducible. */
  now: ISODate
  /**
   * The workspace's time zone, as shown in labels. Every date is formatted in
   * UTC, which Lisbon follows from the end of summer time (Oct 25) to March.
   */
  timeZone: string
  currentUserId: string
  brands: Brand[]
  campaigns: Campaign[]
  team: TeamMember[]
  roles: RoleDef[]
  settings: WorkspaceSettings
  channels: Channel[]
  websites: Website[]
  posts: Post[]
  /** Follower, impression, engagement and click history per network and account (analyticsData.ts). */
  analytics: AnalyticsHistory
  reports: ScheduledReport[]
  /**
   * Relative engagement per weekday (Mon…Sun) and hour (6 AM…11 PM), 0–1.
   * Shades the calendar's "Best times" overlay.
   */
  bestTimes: number[][]
  conversations: Conversation[]
  keywords: Keyword[]
  mentions: Mention[]
  competitors: Competitor[]
  savedReplies: SavedReply[]
  media: MediaAsset[]
  templates: Template[]
  hashtagSets: HashtagSet[]
  audit: AuditEvent[]
  notices: Notice[]
  /** The top bar's brand switcher: one brand, or null for every brand the person sees. */
  brandScope: string | null
  /** False after "Sign out": the sign-in screen shows until someone signs in. */
  signedIn: boolean
}

/** What a notification says, as data (worded in the current language). */
export type NoticeEvent =
  | { type: 'waiting'; count: number }
  | { type: 'disconnected'; brandId: string; network: NetworkId; failed: number }
  | { type: 'expiring'; brandId: string; network: NetworkId; days: number }
  | { type: 'trending'; brandId: string; ratio: number }
  | { type: 'submitted'; by: string; excerpt: string }
  | { type: 'approved'; by: string; excerpt: string }
  | { type: 'changes'; by: string; excerpt: string }

/** A notification in the bell's list; `for` keeps it to one person. */
export interface Notice {
  id: string
  at: ISODate
  href: string
  read: boolean
  for?: string
  event: NoticeEvent
}

export interface NavItem {
  id: string
  label: string
  href: `#/${string}`
  badge?: number
}
