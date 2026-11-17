import type { RouteId } from './routes.ts'
import type { Post, Workspace } from './types.ts'

/**
 * Planner mode: Kataru as a planner shared by the team and its clients. No
 * social network is connected and nothing goes out on its own — posts are
 * written, approved (by the client too, where the brand asks for it) and
 * scheduled here, then someone posts them by hand and marks them published,
 * with the link to the live post.
 *
 * Nothing here may import anything but types: the server loads this file.
 */

export const isPlanner = (ws: Pick<Workspace, 'settings'>) => ws.settings.mode === 'planner'

/** Pages that only make sense with the networks connected. */
export const CONNECTED_ONLY: RouteId[] = ['inbox', 'analytics', 'listening']

export const routeShown = (ws: Pick<Workspace, 'settings'>, id: string) => !isPlanner(ws) || !(CONNECTED_ONLY as string[]).includes(id)

/**
 * What everyone sees in planner mode: profiles are just profiles (no
 * connection to lose, nothing paused), nothing "failed" to publish (it's
 * simply still to post), and no warnings about connections.
 */
export function plannerView(ws: Workspace): Workspace {
  if (!isPlanner(ws)) return ws
  const channels = ws.channels.some((c) => c.status !== 'connected' || c.paused) ? ws.channels.map((c) => (c.status !== 'connected' || c.paused ? { ...c, status: 'connected' as const, paused: undefined } : c)) : ws.channels
  const posts = ws.posts.some((p) => p.status === 'failed' || p.failure) ? ws.posts.map((p) => (p.status === 'failed' || p.failure ? { ...p, status: p.status === 'failed' ? ('scheduled' as const) : p.status, failure: undefined } : p)) : ws.posts
  const notices = ws.notices.some((n) => n.event.type === 'disconnected' || n.event.type === 'expiring') ? ws.notices.filter((n) => n.event.type !== 'disconnected' && n.event.type !== 'expiring') : ws.notices
  return channels === ws.channels && posts === ws.posts && notices === ws.notices ? ws : { ...ws, channels, posts, notices }
}

/** Approved posts whose time has come (or comes within `aheadMs`): someone has to post them by hand. Overdue first. */
export function toPostByHand(ws: Workspace, nowMs: number, aheadMs = 24 * 3_600_000): Post[] {
  return ws.posts.filter((p) => p.status === 'scheduled' && Date.parse(p.scheduledAt) <= nowMs + aheadMs).sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
}

export const overdue = (p: Post, nowMs: number) => p.status === 'scheduled' && Date.parse(p.scheduledAt) < nowMs

/** A link that looks like a post on the web (what "Mark as published" accepts). */
export function cleanPostUrl(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.') ? u.toString().slice(0, 500) : null
  } catch {
    return null
  }
}
