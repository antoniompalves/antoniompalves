import { approversFor } from './permissions'
import type { Notice, NoticeEvent, Post, Workspace } from './types'

/** A post's first line, cut to 46 characters: how activity and notifications quote it. */
export const excerpt = (text: string) => {
  const line = text.split('\n')[0] ?? ''
  return line.length > 46 ? `${line.slice(0, 44)}…` : line
}

let made = 0
const notice = (event: NoticeEvent, href: string, at: number, forId: string): Notice => ({
  id: `n-${at.toString(36)}-${(made++).toString(36)}`,
  at: new Date(at).toISOString(),
  href,
  read: false,
  for: forId,
  event,
})

/** Tells each approver of the brand (but the sender) that a post waits for them. */
export const submittedNotices = (ws: Workspace, me: string, p: Post, at: number) =>
  approversFor(ws, p.brandId)
    .filter((m) => m.id !== me && m.id !== p.authorId)
    .map((m) => notice({ type: 'submitted', by: me, excerpt: excerpt(p.text) }, '#/approvals', at, m.id))

/** Tells the writer their post was approved (nobody needs telling about their own). */
export const approvedNotices = (me: string, p: Post, at: number) =>
  p.authorId === me ? [] : [notice({ type: 'approved', by: me, excerpt: excerpt(p.text) }, '#/calendar', at, p.authorId)]

/** Tells the writer what to change; the link opens the post in the composer. */
export const changesNotices = (me: string, p: Post, at: number) =>
  p.authorId === me ? [] : [notice({ type: 'changes', by: me, excerpt: excerpt(p.text) }, `#/compose/${p.id}`, at, p.authorId)]

/** Notifications meant for `me`, newest first. */
export const noticesFor = (ws: Workspace, me: string) => ws.notices.filter((n) => !n.for || n.for === me)
