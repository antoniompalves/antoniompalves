/**
 * Data model for the Murmura overview. Shapes were derived from what the
 * reference UI renders (DOM text, data-* attributes, chart paths), normalised
 * into entities so every widget on #/overview can be computed from them.
 */

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

export type Role = 'Owner' | 'Admin' | 'Manager' | 'Editor' | 'Contributor' | 'Community' | 'Analyst'

export interface Brand {
  id: string
  name: string
  initials: string
  tone: Tone
  /** Account handle used in post previews, e.g. "emberandoak". */
  handle: string
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
  role: Role
  avatar: string
  /** Job title shown when they're assigned a conversation. */
  title?: string
  /** Brands they work on; only these teammates are offered when assigning a conversation. */
  brands: string[] | 'all'
}

export type ChannelStatus = 'connected' | 'expiring' | 'disconnected'

export interface Channel {
  id: string
  brandId: string
  network: NetworkId
  status: ChannelStatus
  /** Days until the token expires, when status === 'expiring'. */
  expiresInDays?: number
}

export type PostStatus =
  | 'draft'
  | 'awaiting_approval'
  | 'changes_requested'
  | 'scheduled'
  | 'published'
  | 'failed'

export interface PostMetrics {
  impressions: number
  reach: number
  engagements: number
  engagementRate: number
  saves: number
  /** Reach relative to the brand's median post, e.g. 8.9 → "8.9× usual reach". */
  reachVsUsual: number
}

export interface Post {
  id: string
  brandId: string
  authorId: string
  text: string
  /** Photo seed (see assets.ts); posts without media render their brand mark. */
  image?: string
  networks: NetworkId[]
  status: PostStatus
  /** Publish time; for drafts, the time they are pencilled in for. */
  scheduledAt: ISODate
  metrics?: PostMetrics
  /** Why publishing failed; the UI words it per language. */
  failure?: { network: NetworkId; code: 'disconnected' }
}

export interface NetworkStat {
  network: NetworkId
  followers: number
  /** Follower growth over the last 30 days, as a fraction (0.07 → +7.0%). */
  growth30d: number
  engagementRate: number
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
}

export interface SavedReply {
  id: string
  title: string
  text: string
}

export type AuditKind = 'approval' | 'channel' | 'review' | 'member' | 'permission' | 'schedule' | 'inbox'

export type Permission = 'assignConversations'

/** What happened, as data: the activity feed turns it into a sentence in the current language. */
export type AuditAction =
  | { type: 'approved'; excerpt: string; brandId: string }
  | { type: 'reconnected'; brandId: string; network: NetworkId }
  | { type: 'requestedChanges'; brandId: string }
  | { type: 'invited'; name: string; role: Role }
  | { type: 'grantedPermission'; role: Role; permission: Permission }
  | { type: 'scheduled'; count: number; brandId: string }
  | { type: 'closedConversations'; count: number }

export interface AuditEvent {
  id: string
  actorId: string
  kind: AuditKind
  action: AuditAction
  at: ISODate
}

export type TodoItem =
  | { kind: 'approval'; id: string; postId: string }
  | { kind: 'failed_post'; id: string; postId: string }
  | { kind: 'channel'; id: string; channelId: string }

export interface Workspace {
  /** Frozen "now" so relative labels (Tomorrow, 18 h 45 min…) are reproducible. */
  now: ISODate
  timeZone: string
  currentUserId: string
  brands: Brand[]
  campaigns: Campaign[]
  team: TeamMember[]
  channels: Channel[]
  posts: Post[]
  networkStats: NetworkStat[]
  /**
   * Relative engagement per weekday (Mon…Sun) and hour (6 AM…11 PM), 0–1.
   * Shades the calendar's "Best times" overlay.
   */
  bestTimes: number[][]
  /** New followers per day across all channels, oldest first (90 days). */
  followerGrowth: DailyPoint[]
  engagementRate30d: number
  conversations: Conversation[]
  savedReplies: SavedReply[]
  media: MediaAsset[]
  todos: TodoItem[]
  audit: AuditEvent[]
  notifications: { unread: number }
}

export interface NavItem {
  id: string
  label: string
  href: `#/${string}`
  badge?: number
}
