/**
 * The contract between Kataru and its publishing service (server/): which
 * networks it posts to, what a post looks like on the wire, and what comes
 * back. The server imports these types too (`import type`), so both sides
 * change together. See docs/PUBLISHING.md.
 */

/** Networks the publishing service can post to. */
export type PublishNetwork = 'facebook' | 'instagram' | 'threads' | 'linkedin' | 'tiktok' | 'youtube'

/** One sign-in can bring several networks: a Meta login lists Facebook Pages and the Instagram accounts linked to them. */
export type PublishProvider = 'meta' | 'threads' | 'linkedin' | 'tiktok' | 'youtube'

export const PROVIDER_OF: Record<PublishNetwork, PublishProvider> = {
  facebook: 'meta',
  instagram: 'meta',
  threads: 'threads',
  linkedin: 'linkedin',
  tiktok: 'tiktok',
  youtube: 'youtube',
}

/** TikTok asks every post for an audience the creator's account allows (no default, by TikTok's rules). */
export type TikTokPrivacy = 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY'

export interface PublishMedia {
  /** A public HTTPS URL (Meta and Threads fetch it themselves), or one returned by `POST /api/media`. */
  url: string
  kind: 'image' | 'video'
  alt?: string
}

export interface PublishPost {
  text: string
  media: PublishMedia[]
  /** Shared as a link card where the network has one (Facebook, LinkedIn, Threads). */
  link?: string
  /** Instagram: posted as the first comment once the post is live. */
  firstComment?: string
  options?: {
    tiktok?: {
      privacy: TikTokPrivacy
      disableComment?: boolean
      disableDuet?: boolean
      disableStitch?: boolean
      /** "Your brand": promoting the creator's own business. */
      brandOrganic?: boolean
      /** "Branded content": a paid partnership. */
      brandContent?: boolean
      aiGenerated?: boolean
      /** Photo posts have a separate title (90 characters). */
      photoTitle?: string
    }
    youtube?: {
      /** Defaults to the post's first line (100 characters). */
      title?: string
      privacy?: 'public' | 'unlisted' | 'private'
      categoryId?: string
      madeForKids?: boolean
      tags?: string[]
    }
    linkedin?: { visibility?: 'PUBLIC' | 'CONNECTIONS' }
  }
}

/** A page, profile or channel the service can post as. */
export interface PublishAccount {
  /** "<network>:<id on the network>" */
  id: string
  network: PublishNetwork
  provider: PublishProvider
  connectionId: string
  name: string
  handle?: string
  avatar?: string
  /** "expiring" and "expired" ask for a new sign-in. */
  status: 'ok' | 'expiring' | 'expired'
  /** When the sign-in stops working, if the network says (ISO). */
  expiresAt?: string
}

export type JobStatus = 'scheduled' | 'publishing' | 'processing' | 'published' | 'failed' | 'canceled'

export type PublishErrorCode = 'auth' | 'permission' | 'rate_limit' | 'invalid' | 'media' | 'transient' | 'not_configured' | 'unknown'

/** One post going to one account. */
export interface PublishJob {
  id: string
  batchId: string
  accountId: string
  network: PublishNetwork
  status: JobStatus
  publishAt: string
  attempts: number
  /** The app's own post id, to match jobs back to posts. */
  ref?: string
  result?: { remoteId: string; url?: string; note?: string }
  error?: { code: PublishErrorCode; message: string }
}

export interface PublishRequest {
  accountIds: string[]
  post: PublishPost
  /** ISO time; omitted or past = now. */
  publishAt?: string
  ref?: string
}

/** 422 body: what each account would reject, before anything is sent. */
export interface PublishRejection {
  error: 'invalid'
  issues: { accountId: string; messages: string[] }[]
}

export interface PublisherHealth {
  ok: true
  version: number
  /** Which sign-ins have credentials on the server. */
  providers: Record<PublishProvider, boolean>
}

/** What the sign-in popup posts back to the app. */
export interface ConnectMessage {
  type: 'kataru:publisher'
  ok: boolean
  provider: PublishProvider
  accounts?: PublishAccount[]
  error?: string
}
