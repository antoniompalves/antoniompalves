import { approversFor, can } from './permissions'
import type { Post, Review, Workspace } from './types'
import { isClient, needsClient, reviewsAt, stageOf } from './workflow'

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

/**
 * Whether `me` may approve or send back this post: approvers of its brand who
 * didn't write it; for brands with client approval, the team first, then the
 * client (workflow.ts).
 */
export const canReview = reviewsAt

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

/** Who can sign a post off at its step: the brand's approvers but its author, `me` first. */
export const reviewersOf = (ws: Workspace, me: string, p: Post) =>
  approversFor(ws, p.brandId)
    .filter((m) => m.id !== p.authorId && (!needsClient(ws, p.brandId) || (stageOf(ws, p) === 'client') === (m.role === 'client')))
    .sort((a, b) => Number(b.id === me) - Number(a.id === me))

/** When "Due soon" applies: it goes out within a day. */
export const dueState = (p: Post, now: number) => (at(p) < now ? 'late' : at(p) - now < DAY ? 'soon' : 'later')

/** The next half hour from an hour away: where an approved post that's already due goes. */
export function nextSlot(now: number) {
  const d = new Date(now + 60 * MINUTE)
  d.setUTCMinutes(d.getUTCMinutes() < 30 ? 30 : 60, 0, 0)
  return d.getTime()
}

/**
 * Approving at a post's step: a team approval of a brand with client approval
 * hands it to the client; otherwise it is scheduled.
 */
export function approveStep(ws: Workspace, p: Post, me: string, now: number): { post: Post; toClient: boolean } {
  if (needsClient(ws, p.brandId) && stageOf(ws, p) === 'team' && !isClient(ws, me))
    return { post: { ...p, stage: 'client', reviews: [...p.reviews, { by: me, at: new Date(now).toISOString(), decision: 'approved' }] }, toClient: true }
  const { stage: _done, ...rest } = approve(p, me, now)
  void _done
  return { post: rest, toClient: false }
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
  stage: undefined,
  reviews: [...p.reviews, { by: me, at: new Date(now).toISOString(), decision: 'changes', note }],
})

export const withdraw = (p: Post, me: string, now: number, note: string): Post => ({
  ...p,
  status: 'draft',
  stage: undefined,
  reviews: [...p.reviews, { by: me, at: new Date(now).toISOString(), decision: 'comment', note }],
})

/** A post's last decision of a kind (for notes and badges elsewhere). */
export { lastOf }
