import type { PublishErrorCode, PublishNetwork, PublishPost, PublishProvider } from '../../src/data/publishing.ts'

export interface Tokens {
  accessToken: string
  /** Epoch ms; absent when the network gives no expiry. */
  expiresAt?: number
  refreshToken?: string
  refreshExpiresAt?: number
  scopes: string[]
  /** When this token was issued (Threads only refreshes tokens older than a day). */
  issuedAt: number
}

/** Something the service can post as: a Page, a profile, a channel. */
export interface Account {
  /** "<network>:<remoteId>" */
  id: string
  network: PublishNetwork
  remoteId: string
  name: string
  handle?: string
  avatar?: string
  /** Facebook Page access token (used for the Page and its Instagram account). */
  token?: string
  /** Provider details: the Page behind an Instagram account, a LinkedIn author URN… */
  meta?: Record<string, string>
}

export interface Connection {
  id: string
  provider: PublishProvider
  /** The signed-in person on the network. */
  subject: string
  label: string
  tokens: Tokens
  accounts: Account[]
  status: 'ok' | 'expiring' | 'expired'
  lastError?: string
  createdAt: number
  updatedAt: number
}

export interface Loaded {
  bytes: Buffer
  mime: string
  size: number
}

/** How a connector gets media: the URL as given, or its bytes (downloaded or from the service's own store). */
export interface MediaSource {
  load(url: string): Promise<Loaded>
}

export interface PublishContext {
  connection: Connection
  account: Account
  post: PublishPost
  media: MediaSource
}

export interface PublishResult {
  remoteId: string
  url?: string
  /** "processing": the network accepted it and finishes on its own (TikTok); check() follows up. */
  status: 'published' | 'processing'
  note?: string
}

export interface Exchanged {
  tokens: Tokens
  subject: string
  label: string
  accounts: Account[]
}

export interface Provider {
  id: PublishProvider
  networks: PublishNetwork[]
  configured: boolean
  /** The sign-in URL; `verifier` is kept with the state when the provider uses PKCE. */
  authorize(state: string, redirectUri: string): { url: string; verifier?: string }
  exchange(code: string, redirectUri: string, verifier?: string): Promise<Exchanged>
  refresh?(tokens: Tokens): Promise<Tokens>
  publish(ctx: PublishContext): Promise<PublishResult>
  /** Follows up on a "processing" result. */
  check?(ctx: PublishContext, remoteId: string): Promise<PublishResult>
}

export class ProviderError extends Error {
  code: PublishErrorCode
  retryable: boolean
  status?: number
  provider?: PublishProvider
  constructor(code: PublishErrorCode, message: string, opts: { retryable?: boolean; status?: number; provider?: PublishProvider } = {}) {
    super(message)
    this.name = 'ProviderError'
    this.code = code
    this.retryable = opts.retryable ?? (code === 'transient' || code === 'rate_limit')
    this.status = opts.status
    this.provider = opts.provider
  }
}

export const invalid = (message: string, provider?: PublishProvider) => new ProviderError('invalid', message, { provider })
