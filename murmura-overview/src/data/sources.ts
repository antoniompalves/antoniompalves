import { lastInbound } from './inbox'
import type { Conversation, InboxSource, Workspace } from './types'

/**
 * Rules for the inbox sources beyond the social networks, as the platforms set
 * them (2026): WhatsApp Business answers freely for 24 hours after the
 * customer's last message, then only with an approved template; Messenger and
 * Instagram direct messages answer freely for 24 hours, then up to 7 days with
 * the "human agent" tag; a Google review gets one public reply, which can be
 * edited. A source that isn't connected for the brand can't be answered.
 */

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** The inbox filter's order: the networks people message most, then the rest. */
export const INBOX_SOURCES: InboxSource[] = ['instagram', 'facebook', 'messenger', 'whatsapp', 'google', 'x', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'threads']

export type ReplyWindow =
  /** Reply any time (comments, mentions, X and LinkedIn messages). */
  | { kind: 'open' }
  /** Free replies until `endsAt`. */
  | { kind: 'window'; endsAt: number }
  /** Past 24 hours: replies carry the human agent tag until `endsAt`. */
  | { kind: 'agent'; endsAt: number }
  /** WhatsApp past 24 hours: templates only. */
  | { kind: 'template'; closedAt: number }
  /** Messenger or Instagram past 7 days: no replies. */
  | { kind: 'closed'; closedAt: number }
  /** A Google review: one public reply, `replied` when there is one. */
  | { kind: 'review'; replied: boolean }
  /** The source isn't connected for this brand. */
  | { kind: 'offline' }

/** Whether the brand's WhatsApp number, Google location or (for Messenger) Facebook Page is connected. */
export function sourceConnected(ws: Workspace, brandId: string, source: InboxSource) {
  if (source === 'whatsapp' || source === 'google') return ws.inboxAccounts.some((a) => a.brandId === brandId && a.source === source)
  if (source === 'messenger') return ws.channels.some((c) => c.brandId === brandId && c.network === 'facebook' && c.status !== 'disconnected')
  return true
}

/** What answering this conversation is allowed to look like right now. */
export function replyWindow(ws: Workspace, c: Conversation, now: number): ReplyWindow {
  if (!sourceConnected(ws, c.brandId, c.network)) return { kind: 'offline' }
  if (c.network === 'google') return { kind: 'review', replied: c.messages.some((m) => m.from === 'us' && !m.note) }
  const last = Date.parse(lastInbound(c).at)
  if (c.network === 'whatsapp') return now < last + DAY ? { kind: 'window', endsAt: last + DAY } : { kind: 'template', closedAt: last + DAY }
  const dm = c.network === 'messenger' || (c.kind === 'message' && (c.network === 'instagram' || c.network === 'facebook'))
  if (!dm) return { kind: 'open' }
  if (now < last + DAY) return { kind: 'window', endsAt: last + DAY }
  if (now < last + 7 * DAY) return { kind: 'agent', endsAt: last + 7 * DAY }
  return { kind: 'closed', closedAt: last + 7 * DAY }
}

/** Free-text replies are off: the window closed, or the source is offline (notes still work). */
export const repliesBlocked = (w: ReplyWindow) => w.kind === 'template' || w.kind === 'closed' || w.kind === 'offline'

/** A template's body with its {{n}} parts filled in (empty parts stay as written). */
export const fillTemplate = (body: string, values: string[]) => body.replace(/\{\{(\d+)\}\}/g, (m, n) => values[Number(n) - 1]?.trim() || m)

/** How many {{n}} parts a template has. */
export const templateParams = (body: string) => Math.max(0, ...[...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])))
