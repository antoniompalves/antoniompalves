import type { NetworkId } from './types.ts'

/**
 * Links to live posts: which network and which post a link points at, and
 * how often its numbers are read again (data/stats on the server).
 *
 * Nothing here may import anything but types: the server loads this file.
 */

export interface PostRef {
  network: NetworkId
  /** The post's id as the link shows it: a shortcode (Instagram, Threads), a video id (YouTube, TikTok), a post id (Facebook, LinkedIn, X, Pinterest). */
  id: string
  /** The account name, when the link carries it (TikTok, Threads, X, some Facebook links). */
  handle?: string
  /** The link, tidied (https, no tracking parameters). */
  url: string
}

const host = (u: URL) => u.hostname.toLowerCase().replace(/^(www|m|mobile|web)\./, '')

/** Reads a post link; null when it isn't one Kataru recognises. */
export function parsePostLink(raw: string): PostRef | null {
  let u: URL
  try {
    u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const h = host(u)
  const parts = u.pathname.split('/').filter(Boolean)
  const clean = `https://${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, '')}`
  const ref = (network: NetworkId, id: string | undefined | null, handle?: string, url = clean): PostRef | null => (id && /^[\w.:-]+$/.test(id) ? { network, id, ...(handle && { handle }), url } : null)

  if (h === 'instagram.com') {
    // /p/CODE, /reel/CODE, /reels/CODE, /tv/CODE, also /{user}/p/CODE
    const i = parts.findIndex((p) => ['p', 'reel', 'reels', 'tv'].includes(p))
    return i >= 0 ? ref('instagram', parts[i + 1], i > 0 ? parts[0] : undefined) : null
  }
  if (h === 'youtube.com' || h === 'youtu.be' || h === 'music.youtube.com') {
    if (h === 'youtu.be') return ref('youtube', parts[0], undefined, `https://youtu.be/${parts[0]}`)
    if (parts[0] === 'watch') {
      const v = u.searchParams.get('v')
      return ref('youtube', v, undefined, `https://www.youtube.com/watch?v=${v}`)
    }
    if (parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'embed') return ref('youtube', parts[1])
    return null
  }
  if (h === 'tiktok.com') {
    // /@user/video/ID, /@user/photo/ID
    const i = parts.findIndex((p) => p === 'video' || p === 'photo')
    return i > 0 ? ref('tiktok', parts[i + 1], parts[0]!.replace(/^@/, '')) : null
  }
  if (h === 'threads.net' || h === 'threads.com') {
    // /@user/post/CODE
    const i = parts.indexOf('post')
    return i > 0 ? ref('threads', parts[i + 1], parts[0]!.replace(/^@/, '')) : null
  }
  if (h === 'facebook.com' || h === 'fb.com') {
    const story = u.searchParams.get('story_fbid')
    if (story) return ref('facebook', story, u.searchParams.get('id') ?? undefined, `https://www.facebook.com/permalink.php?story_fbid=${story}&id=${u.searchParams.get('id') ?? ''}`)
    const v = u.searchParams.get('v') ?? u.searchParams.get('fbid')
    if (v) return ref('facebook', v)
    // /{page}/posts/ID, /{page}/videos/ID, /reel/ID, /{page}/photos/a.x/ID
    const i = parts.findIndex((p) => ['posts', 'videos', 'reel', 'photos'].includes(p))
    return i >= 0 ? ref('facebook', parts[parts.length - 1], i > 0 && parts[i] !== 'reel' ? parts[0] : undefined) : null
  }
  if (h === 'linkedin.com') {
    const urn = decodeURIComponent(u.pathname).match(/urn:li:(?:activity|share|ugcPost):(\d+)/)
    if (urn) return ref('linkedin', urn[0])
    const act = u.pathname.match(/activity-(\d+)/)
    return act ? ref('linkedin', `urn:li:activity:${act[1]}`) : null
  }
  if (h === 'x.com' || h === 'twitter.com') {
    const i = parts.indexOf('status')
    return i > 0 ? ref('x', parts[i + 1], parts[0]) : null
  }
  if (h.endsWith('pinterest.com') || /^pinterest\.[a-z.]+$/.test(h)) {
    const i = parts.indexOf('pin')
    return i >= 0 ? ref('pinterest', parts[i + 1]) : null
  }
  return null
}

const HOUR = 3_600_000
const DAY = 24 * HOUR

/**
 * When a post's numbers are read again: every hour for its first two days
 * (when they move most), then once a day until it's 30 days old, then never
 * (they barely change, and every read counts against the networks' limits).
 */
export function statsDue(publishedAt: number, lastAt: number | undefined, now: number): boolean {
  const age = now - publishedAt
  if (age < 0 || age > 30 * DAY) return false
  if (lastAt === undefined) return true
  return now - lastAt >= (age < 2 * DAY ? HOUR : DAY) - 60_000
}

/** Networks whose numbers Kataru can read from a link (the rest are logged by hand). */
export const READABLE: NetworkId[] = ['instagram', 'facebook', 'threads', 'tiktok', 'youtube']
