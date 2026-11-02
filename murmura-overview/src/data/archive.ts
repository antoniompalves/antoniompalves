import type { CollectionKey } from './reducer.ts'
import type { Workspace } from './types.ts'

/**
 * What can leave the live workspace once it's old (a year by default), so
 * everyone's app stays light: published posts (not evergreen ones), closed
 * conversations, mentions, activity, notifications, declined or finished
 * ideas, and creator campaigns that ended (with their deliverables). Archived
 * items are kept on the server, searchable and restorable (server/workspace/archive.ts).
 *
 * Nothing here may import anything but types: the server loads this file as is.
 */

export const ARCHIVE_LISTS = ['posts', 'conversations', 'mentions', 'audit', 'notices', 'ideas', 'creatorCampaigns', 'deliverables'] as const satisfies readonly CollectionKey[]
export type ArchiveList = (typeof ARCHIVE_LISTS)[number]

export interface ArchiveItem {
  list: ArchiveList
  id: string
  brandId: string | null
  /** When it happened (published, last message, ended…), ms. */
  at: number
  /** A line to find it by. */
  title: string
  item: unknown
}

const DAY = 86_400_000
const line = (s: string) => (s.split('\n')[0] ?? '').slice(0, 200)

/** Everything older than `days` that may be archived. */
export function archivable(ws: Workspace, now: number, days: number): ArchiveItem[] {
  if (!(days > 0)) return []
  const cutoff = now - days * DAY
  const out: ArchiveItem[] = []
  const posts = new Set<string>()
  for (const p of ws.posts) {
    const at = Date.parse(p.scheduledAt)
    if (p.status !== 'published' || p.evergreen || at >= cutoff) continue
    posts.add(p.id)
    out.push({ list: 'posts', id: p.id, brandId: p.brandId, at, title: line(p.text), item: p })
  }
  for (const c of ws.conversations) {
    const at = Math.max(...c.messages.map((m) => Date.parse(m.at)), 0)
    if (c.status !== 'done' || at >= cutoff) continue
    out.push({ list: 'conversations', id: c.id, brandId: c.brandId, at, title: `${c.contact.name}: ${line(c.messages[c.messages.length - 1]?.text ?? '')}`, item: c })
  }
  const keywordBrand = new Map(ws.keywords.map((k) => [k.id, k.brandId]))
  for (const m of ws.mentions) {
    const at = Date.parse(m.at)
    if (at >= cutoff || m.conversationId) continue
    out.push({ list: 'mentions', id: m.id, brandId: keywordBrand.get(m.keywordId) ?? null, at, title: `${m.author}: ${line(m.text)}`, item: m })
  }
  for (const e of ws.audit) {
    const at = Date.parse(e.at)
    if (at < cutoff) out.push({ list: 'audit', id: e.id, brandId: null, at, title: e.action.type, item: e })
  }
  for (const n of ws.notices) {
    const at = Date.parse(n.at)
    if (at < cutoff) out.push({ list: 'notices', id: n.id, brandId: null, at, title: n.event.type, item: n })
  }
  for (const i of ws.ideas ?? []) {
    const at = Date.parse(i.at)
    const done = i.status === 'declined' || (i.postId && (posts.has(i.postId) || !ws.posts.some((p) => p.id === i.postId)))
    if (done && at < cutoff) out.push({ list: 'ideas', id: i.id, brandId: i.brandId, at, title: i.title, item: i })
  }
  for (const c of ws.creatorCampaigns) {
    const at = Date.parse(`${c.end}T23:59:59Z`)
    if (at >= cutoff) continue
    out.push({ list: 'creatorCampaigns', id: c.id, brandId: c.brandId, at, title: c.name, item: c })
    for (const d of ws.deliverables.filter((x) => x.campaignId === c.id)) out.push({ list: 'deliverables', id: d.id, brandId: c.brandId, at, title: `${c.name} · ${d.network}`, item: d })
  }
  return out
}

/** Ids per list, for the "archive" change. */
export const idsByList = (items: ArchiveItem[]) => {
  const out: Partial<Record<ArchiveList, string[]>> = {}
  for (const i of items) (out[i.list] ??= []).push(i.id)
  return out
}
