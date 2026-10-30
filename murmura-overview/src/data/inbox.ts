import type { Conversation, ConversationKind, Message, NetworkId, Sentiment } from './types'

/**
 * Inbox selectors, reverse-engineered from the reference #/inbox: the list is
 * ordered by the latest inbound message, unread counts are the contact's
 * messages since our last reply, and "median first reply" is taken over every
 * thread we've answered.
 */

export type InboxView = 'all' | 'unread' | 'mine' | 'unassigned' | 'priority' | 'done'

export interface InboxFilters {
  kinds: ConversationKind[]
  networks: NetworkId[]
  sentiments: Sentiment[]
}

export const NO_INBOX_FILTERS: InboxFilters = { kinds: [], networks: [], sentiments: [] }

export const VIEWS: InboxView[] = ['all', 'unread', 'mine', 'unassigned', 'priority', 'done']

export const lastMessage = (c: Conversation) => c.messages[c.messages.length - 1]
/** What a list row previews: the latest message people actually exchanged, notes only when there's nothing else. */
export const previewMessage = (c: Conversation) => [...c.messages].reverse().find((m) => !m.note) ?? lastMessage(c)
export const lastInbound = (c: Conversation) => [...c.messages].reverse().find((m) => m.from === 'them') ?? c.messages[0]

/** The reference's badge: inbound messages since our last (non-note) reply, at least 1 when unread. */
export function unreadCount(c: Conversation) {
  if (!c.unread) return 0
  let n = 0
  for (let i = c.messages.length - 1; i >= 0; i--) {
    const m = c.messages[i]
    if (m.from === 'us' && !m.note) break
    if (m.from === 'them') n++
  }
  return Math.max(1, n)
}

/** Ordered newest first by the contact's latest message. */
export const byActivity = (a: Conversation, b: Conversation) => Date.parse(lastInbound(b).at) - Date.parse(lastInbound(a).at)

export function medianFirstReply(conversations: Conversation[]) {
  const gaps = conversations
    .map((c) => {
      const first = c.messages.find((m) => m.from === 'them')
      const reply = c.messages.find((m) => m.from === 'us' && !m.note)
      return first && reply ? (Date.parse(reply.at) - Date.parse(first.at)) / 60_000 : null
    })
    .filter((g): g is number => g !== null)
    .sort((a, b) => a - b)
  if (!gaps.length) return null
  const mid = gaps.length / 2
  return Math.round(gaps.length % 2 ? gaps[Math.floor(mid)] : (gaps[mid - 1] + gaps[mid]) / 2)
}

export function inView(c: Conversation, view: InboxView, me: string) {
  if (view === 'done') return c.status === 'done'
  if (c.status !== 'open') return false
  if (view === 'unread') return c.unread
  if (view === 'mine') return c.assigneeId === me
  if (view === 'unassigned') return !c.assigneeId
  if (view === 'priority') return c.priority
  return true
}

export function matchesInboxFilters(c: Conversation, f: InboxFilters) {
  if (f.kinds.length && !f.kinds.includes(c.kind)) return false
  if (f.networks.length && !f.networks.includes(c.network)) return false
  if (f.sentiments.length && !f.sentiments.includes(c.sentiment)) return false
  return true
}

export const filterCount = (f: InboxFilters) => f.kinds.length + f.networks.length + f.sentiments.length

/**
 * Lower-case and drop accents so "marquez" finds "Márquez" and "acucar" finds
 * "açúcar". Folds one character at a time and keeps any character whose fold
 * would change its length, so indices still line up with the original text.
 */
export function fold(text: string) {
  let out = ''
  for (const ch of text) {
    const f = ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    out += f.length === ch.length ? f : ch
  }
  return out
}

export function matchesSearch(c: Conversation, q: string) {
  const needle = fold(q.trim())
  if (!needle) return true
  const hay = fold([c.contact.name, c.contact.handle, ...c.tags, ...c.messages.map((m: Message) => m.text)].join('\n'))
  return hay.includes(needle)
}

/** Split text around case- and accent-insensitive matches so the UI can wrap them in <mark>. */
export function splitMatches(text: string, q: string): { text: string; hit: boolean }[] {
  const needle = q.trim()
  if (!needle) return [{ text, hit: false }]
  const parts: { text: string; hit: boolean }[] = []
  const lower = fold(text)
  const n = fold(needle)
  let i = 0
  for (let at = lower.indexOf(n); at !== -1; at = lower.indexOf(n, i)) {
    if (at > i) parts.push({ text: text.slice(i, at), hit: false })
    parts.push({ text: text.slice(at, at + n.length), hit: true })
    i = at + n.length
  }
  if (i < text.length) parts.push({ text: text.slice(i), hit: false })
  return parts
}

export function inboxStats(conversations: Conversation[], me: string) {
  const open = conversations.filter((c) => c.status === 'open')
  const count = (view: InboxView) => conversations.filter((c) => inView(c, view, me)).length
  return {
    open: open.length,
    unread: count('unread'),
    medianReply: medianFirstReply(conversations),
    views: Object.fromEntries(VIEWS.map((v) => [v, count(v)])) as Record<InboxView, number>,
  }
}

/** Tags offered when tagging: the workspace's own first, then the usual suspects, capped at ten. */
const DEFAULT_TAGS = ['support', 'sales', 'shipping', 'refund', 'wholesale', 'press', 'ugc', 'question', 'vip'].map((t) => `#${t}`)

export function tagSuggestions(all: Conversation[], c: Conversation) {
  return [...new Set([...all.flatMap((x) => x.tags), ...DEFAULT_TAGS])].filter((t) => !c.tags.includes(t)).slice(0, 10)
}

/** "Big Order!" → "#big-order", "Devolução" → "#devolucao": lowercase, unaccented, hyphenated, letters/digits only, 24 characters at most. */
export function normalizeTag(raw: string) {
  const slug = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/^#/, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 24)
  return slug ? `#${slug}` : ''
}
