import { can, member, seesBrand } from './access.ts'
import type { Conversation, Notice, Post, RepeatRule, Workspace } from './types.ts'

/**
 * Who signs a post off, and in what order; who has read what. Shared by the
 * browser and the accounts server (which enforces the client's sign-off), so
 * nothing here may import anything but types and access.ts.
 *
 * Brands with client approval: the team approves first (skipped when a
 * manager or admin sends it), then the brand's client; only then is it
 * scheduled. Brands without it keep the single step, as before.
 */

/** The brand's clients who can sign posts off. */
export const clientsOf = (ws: Workspace, brandId: string) => ws.team.filter((m) => m.status === 'active' && m.role === 'client' && seesBrand(m, brandId) && can(ws, m.id, 'post.approve'))

/** Whether the brand's posts wait for its client (and it has one to ask). */
export const needsClient = (ws: Workspace, brandId: string) => !!ws.brands.find((b) => b.id === brandId)?.clientApproval && clientsOf(ws, brandId).length > 0

export const isClient = (ws: Workspace, memberId: string) => member(ws, memberId)?.role === 'client'

/** Where a post sent by `author` starts: with the client straight away when the author can approve posts themselves. */
export const firstStage = (ws: Workspace, author: string, brandId: string): 'team' | 'client' => (needsClient(ws, brandId) && can(ws, author, 'post.approve') && !isClient(ws, author) ? 'client' : 'team')

/** The step a post waiting for approval is at. */
export const stageOf = (ws: Workspace, p: Post): 'team' | 'client' => (needsClient(ws, p.brandId) ? (p.stage ?? 'team') : 'team')

/** Whether `me` may approve or send back `p` at its current step. */
export function reviewsAt(ws: Workspace, me: string, p: Post) {
  const m = member(ws, me)
  if (!m || p.authorId === me || !can(ws, me, 'post.approve') || !seesBrand(m, p.brandId)) return false
  if (!needsClient(ws, p.brandId)) return true
  return stageOf(ws, p) === 'client' ? m.role === 'client' : m.role !== 'client'
}

/** Whether the client signed off this round (an approval by a client after the last time it was sent). */
export function clientApproved(ws: Workspace, p: Post) {
  let i = p.reviews.length - 1
  for (; i >= 0; i--) if (p.reviews[i]!.decision === 'submitted') break
  return p.reviews.slice(i + 1).some((r) => r.decision === 'approved' && isClient(ws, r.by))
}

/** What may go out: posts of brands with client approval need the client's sign-off. */
export const mayGoOut = (ws: Workspace, p: Post) => !needsClient(ws, p.brandId) || clientApproved(ws, p)

/* ───────────── read, per person ───────────── */

export const noticeRead = (n: Notice, me: string) => n.read || !!n.readBy?.includes(me)

/** Unread for `me`: new messages came in since they last opened it. */
export const unreadFor = (c: Conversation, me: string) => c.unread && !c.seenBy?.includes(me)

/* ───────────── recurring posts ───────────── */

const DAY = 86_400_000

/** When occurrence `k` of a series starting at `first` goes out. */
export function occurrenceAt(first: number, rule: Pick<RepeatRule, 'every'>, k: number) {
  if (rule.every === 'month') {
    const d = new Date(first)
    const day = d.getUTCDate()
    d.setUTCDate(1)
    d.setUTCMonth(d.getUTCMonth() + k)
    // The 31st becomes the month's last day.
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
    d.setUTCDate(Math.min(day, last))
    return d.getTime()
  }
  return first + k * (rule.every === '2weeks' ? 14 : 7) * DAY
}

/** The text of occurrence `k`: the main text, then each variation in turn. */
export const occurrenceText = (main: string, rule: Pick<RepeatRule, 'variations'>, k: number) => {
  const texts = [main, ...rule.variations.filter((v) => v.trim())]
  return texts[k % texts.length]!
}
