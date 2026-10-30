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

export type Role = 'Owner' | 'Admin' | 'Editor' | 'Contributor' | 'Community' | 'Analyst'

export interface Brand {
  id: string
  name: string
  initials: string
  tone: Tone
}

export interface TeamMember {
  id: string
  name: string
  role: Role
  avatar: string
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
  reach: number
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
  /** Square media; first item is the cover. */
  media: string[]
  networks: NetworkId[]
  status: PostStatus
  scheduledAt: ISODate
  metrics?: PostMetrics
  failure?: { network: NetworkId; reason: string }
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

export interface Conversation {
  id: string
  brandId: string
  network: NetworkId
  contact: { name: string; avatar: string }
  preview: string
  sentiment: Sentiment
  unread: boolean
  priority: boolean
  status: 'open' | 'closed'
  updatedAt: ISODate
}

export type AuditKind = 'approval' | 'channel' | 'review' | 'member' | 'permission' | 'schedule' | 'inbox'

export interface AuditEvent {
  id: string
  actorId: string
  kind: AuditKind
  /** Sentence that follows the actor's first name. */
  summary: string
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
  team: TeamMember[]
  channels: Channel[]
  posts: Post[]
  networkStats: NetworkStat[]
  /** New followers per day across all channels, oldest first (90 days). */
  followerGrowth: DailyPoint[]
  engagementRate30d: number
  conversations: Conversation[]
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
