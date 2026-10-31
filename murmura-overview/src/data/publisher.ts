import { loadSetting, saveSetting } from '../storage'
import type {
  ConnectMessage,
  PublishAccount,
  PublishJob,
  PublishPost,
  PublishProvider,
  PublishRejection,
  PublishRequest,
  PublisherHealth,
  TikTokPrivacy,
} from './publishing'
import type { Post } from './types'

/**
 * Browser client for Kataru's publishing service (server/, docs/PUBLISHING.md).
 * The service's address and access key are entered per browser, like the
 * Google Analytics client ID, never baked into the build.
 */

export interface PublisherSettings {
  url: string
  key: string
}

export function loadPublisherSettings(): PublisherSettings | null {
  try {
    const s = JSON.parse(loadSetting('publisher') ?? 'null')
    return s && typeof s.url === 'string' && typeof s.key === 'string' ? s : null
  } catch {
    return null
  }
}

export const savePublisherSettings = (s: PublisherSettings | null) => saveSetting('publisher', s ? JSON.stringify({ url: s.url.replace(/\/$/, ''), key: s.key }) : '')

export class PublisherError extends Error {
  status: number
  code: string
  /** On 422: what each account would refuse. */
  issues?: PublishRejection['issues']
  constructor(status: number, code: string, message: string, issues?: PublishRejection['issues']) {
    super(message)
    this.status = status
    this.code = code
    this.issues = issues
  }
}

export interface CreatorInfo {
  creator_username: string
  creator_nickname: string
  creator_avatar_url: string
  privacy_level_options: TikTokPrivacy[]
  comment_disabled: boolean
  duet_disabled: boolean
  stitch_disabled: boolean
  max_video_post_duration_sec: number
}

export function createPublisher({ url, key }: PublisherSettings) {
  const base = url.replace(/\/$/, '')

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response
    try {
      res = await fetch(`${base}${path}`, { ...init, headers: { authorization: `Bearer ${key}`, ...(init.body && typeof init.body === 'string' && { 'content-type': 'application/json' }), ...init.headers } })
    } catch {
      throw new PublisherError(0, 'unreachable', `Can't reach the publishing service at ${base}`)
    }
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new PublisherError(res.status, body.error ?? 'unknown', body.message ?? (res.status === 422 ? 'Some networks would refuse this post' : `HTTP ${res.status}`), body.issues)
    return body as T
  }

  /**
   * Opens the network's sign-in in a popup and resolves with what the service
   * reports once the person comes back. The popup opens straight away (inside
   * the click) so browsers don't block it, then goes to the sign-in URL.
   */
  async function connect(provider: PublishProvider): Promise<ConnectMessage> {
    const popup = window.open('about:blank', 'kataru-connect', 'popup,width=600,height=760')
    try {
      const { url: signIn } = await request<{ url: string }>(`/api/connect/${provider}`, { method: 'POST' })
      if (!popup) throw new PublisherError(0, 'popup_blocked', 'Allow pop-ups for this site to sign in')
      popup.location.href = signIn
    } catch (e) {
      popup?.close()
      throw e
    }
    const origin = new URL(base).origin
    return new Promise((resolve, reject) => {
      const done = () => {
        window.removeEventListener('message', onMessage)
        window.clearInterval(watch)
      }
      const onMessage = (e: MessageEvent) => {
        if (e.origin !== origin || e.data?.type !== 'kataru:publisher') return
        done()
        resolve(e.data as ConnectMessage)
      }
      // Closing the popup without finishing ends the attempt.
      const watch = window.setInterval(() => {
        if (popup!.closed) {
          done()
          reject(new PublisherError(0, 'closed', 'The sign-in window was closed'))
        }
      }, 600)
      window.addEventListener('message', onMessage)
    })
  }

  return {
    health: () => fetch(`${base}/health`).then((r) => r.json() as Promise<PublisherHealth>),
    accounts: () => request<PublishAccount[]>('/api/accounts'),
    connect,
    disconnect: (connectionId: string) => request<{ ok: true }>(`/api/connections/${connectionId}`, { method: 'DELETE' }),
    /** Hosts a file on the service so networks that fetch media by URL can reach it. */
    upload: (file: Blob) => request<{ id: string; url: string; mime: string; size: number }>('/api/media', { method: 'POST', body: file, headers: { 'content-type': file.type } }),
    publish: (req: PublishRequest) => request<{ batchId: string; jobs: PublishJob[] }>('/api/posts', { method: 'POST', body: JSON.stringify(req) }),
    batch: (batchId: string) => request<PublishJob[]>(`/api/posts/${batchId}`),
    jobs: (q: { status?: string; ref?: string } = {}) => request<PublishJob[]>(`/api/jobs?${new URLSearchParams(q as Record<string, string>)}`),
    cancel: (jobId: string) => request<PublishJob>(`/api/jobs/${jobId}`, { method: 'DELETE' }),
    /** TikTok's rules: show the creator's name and allowed audiences before every post. */
    tiktokCreator: (accountId: string) => request<CreatorInfo>(`/api/tiktok/${encodeURIComponent(accountId)}/creator`),
  }
}

export type Publisher = ReturnType<typeof createPublisher>

const VIDEO = /\.(mp4|mov|webm)($|\?)/i

/** A Kataru post as the service expects it; `mediaUrl` turns the post's media references into public URLs. */
export function toPublishPost(post: Post, mediaUrl: (ref: string) => string, options?: PublishPost['options']): PublishPost {
  return {
    text: post.text,
    media: post.media.map((ref) => {
      const url = mediaUrl(ref)
      return { url, kind: VIDEO.test(url) ? 'video' : 'image' }
    }),
    ...(post.link && { link: post.link }),
    ...(post.firstComment && { firstComment: post.firstComment }),
    ...(options && { options }),
  }
}
