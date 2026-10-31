import { approversFor, can, seesBrand } from './permissions'
import type { Post, Review, Workspace } from './types'

/**
 * #/approvals: the queues, the header figures and the review steps, as the
 * reference computes them. Posts carry their own review trail (sent, approved,
 * sent back with a note, a comment), so every figure comes from that history.
 */

const MINUTE = 60_000
const DAY = 86_400_000

export type ApprovalTab = 'mine' | 'pending' | 'changes' | 'submitted' | 'approved'
export const APPROVAL_TABS: ApprovalTab[] = ['mine', 'pending', 'changes', 'submitted', 'approved']

const lastOf = (p: Post, decision: Review['decision']) => [...p.reviews].reverse().find((r) => r.decision === decision)
const at = (p: Post) => Date.parse(p.scheduledAt)

/** Whether `me` may approve or send back this post: approvers of its brand who didn't write it. */
export const canReview = (ws: Workspace, me: string, p: Post) =>
  p.authorId !== me && can(ws, me, 'post.approve') && !!ws.team.find((m) => m.id === me && seesBrand(m, p.brandId))

/** One queue, soonest first ("Recently approved": last approved first, 14 days back). */
export function queue(ws: Workspace, me: string, tab: ApprovalTab, now: number, brandId: string | null = null) {
  const posts = ws.posts.filter((p) => !brandId || p.brandId === brandId)
  const soonest = (a: Post, b: Post) => at(a) - at(b)
  switch (tab) {
    case 'mine':
      return posts.filter((p) => p.status === 'awaiting_approval' && canReview(ws, me, p)).sort(soonest)
    case 'pending':
      return posts.filter((p) => p.status === 'awaiting_approval').sort(soonest)
    case 'changes':
      return posts.filter((p) => p.status === 'changes_requested').sort(soonest)
    case 'submitted':
      return posts.filter((p) => p.authorId === me && (p.status === 'awaiting_approval' || p.status === 'changes_requested')).sort(soonest)
    case 'approved':
      return posts
        .filter((p) => {
          const ok = lastOf(p, 'approved')
          return !!ok && now - Date.parse(ok.at) < 14 * DAY && (p.status === 'scheduled' || p.status === 'published')
        })
        .sort((a, b) => Date.parse(lastOf(b, 'approved')!.at) - Date.parse(lastOf(a, 'approved')!.at))
  }
}

/** Header figures: what waits on me (and since when), what was sent back, approvals this week, average time to approve. */
export function approvalStats(ws: Workspace, me: string, now: number) {
  const reviewer = can(ws, me, 'post.approve')
  const first = queue(ws, me, reviewer ? 'mine' : 'submitted', now)
  const oldest = reviewer ? Math.min(...first.map((p) => Date.parse(lastOf(p, 'submitted')?.at ?? p.createdAt))) : Infinity
  const waits: number[] = []
  let week = 0
  for (const p of ws.posts)
    p.reviews.forEach((r, i) => {
      if (r.decision !== 'approved') return
      if (Date.parse(r.at) > now - 7 * DAY) week++
      for (let j = i - 1; j >= 0; j--)
        if (p.reviews[j].decision === 'submitted') {
          waits.push((Date.parse(r.at) - Date.parse(p.reviews[j].at)) / MINUTE)
          break
        }
    })
  return {
    reviewer,
    first: first.length,
    oldest: Number.isFinite(oldest) ? new Date(oldest).toISOString() : null,
    changes: ws.posts.filter((p) => p.status === 'changes_requested').length,
    week,
    /** Minutes. */
    average: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0,
  }
}

/** Who can sign a post off: the brand's approvers but its author, `me` first. */
export const reviewersOf = (ws: Workspace, me: string, p: Post) =>
  approversFor(ws, p.brandId)
    .filter((m) => m.id !== p.authorId)
    .sort((a, b) => Number(b.id === me) - Number(a.id === me))

/** When "Due soon" applies: it goes out within a day. */
export const dueState = (p: Post, now: number) => (at(p) < now ? 'late' : at(p) - now < DAY ? 'soon' : 'later')

/** The next half hour from an hour away: where an approved post that's already due goes. */
export function nextSlot(now: number) {
  const d = new Date(now + 60 * MINUTE)
  d.setUTCMinutes(d.getUTCMinutes() < 30 ? 30 : 60, 0, 0)
  return d.getTime()
}

export function approve(p: Post, me: string, now: number): Post {
  return {
    ...p,
    status: 'scheduled',
    scheduledAt: at(p) < now + 10 * MINUTE ? new Date(nextSlot(now)).toISOString() : p.scheduledAt,
    reviews: [...p.reviews, { by: me, at: new Date(now).toISOString(), decision: 'approved' }],
  }
}

export const sendBack = (p: Post, me: string, note: string, now: number): Post => ({
  ...p,
  status: 'changes_requested',
  reviews: [...p.reviews, { by: me, at: new Date(now).toISOString(), decision: 'changes', note }],
})

export const withdraw = (p: Post, me: string, now: number, note: string): Post => ({
  ...p,
  status: 'draft',
  reviews: [...p.reviews, { by: me, at: new Date(now).toISOString(), decision: 'comment', note }],
})

/** A post's last decision of a kind (for notes and badges elsewhere). */
export { lastOf }
