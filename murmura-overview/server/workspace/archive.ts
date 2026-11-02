import { gunzipSync, gzipSync } from 'node:zlib'
import { randomBytes } from 'node:crypto'
import { ARCHIVE_LISTS, archivable, idsByList } from '../../src/data/archive.ts'
import type { ArchiveList } from '../../src/data/archive.ts'
import type { Workspace } from '../../src/data/types.ts'
import type { Db } from '../db.ts'
import { upsert } from '../db.ts'
import type { Hub } from './hub.ts'

/**
 * Keeping the shared workspace light, and safe:
 *
 * - The archive: once a day, posts published, conversations closed, mentions,
 *   activity and the like older than `settings.archiveDays` (365 by default)
 *   move out of the live workspace into kt_archive, one row each, where they
 *   can be searched, read and brought back. Everyone's app loads less.
 * - Backups: once a day (and whenever someone asks) the whole workspace is
 *   saved gzip-compressed in kt_backups: the last 7 days, 4 Sundays and 10
 *   made by hand are kept. Any of them can be downloaded or restored.
 */

const DAY = 86_400_000
export const DEFAULT_ARCHIVE_DAYS = 365
const SYSTEM = { userId: null, memberId: null }

/* ───────────── archive ───────────── */

/** Moves what's old out of the live workspace; returns how many items moved. */
export async function runArchive(db: Db, hub: Hub, now: number) {
  await hub.sync()
  const ws = hub.ws
  if (!ws) return 0
  const items = archivable(ws, now, ws.settings.archiveDays ?? DEFAULT_ARCHIVE_DAYS)
  if (!items.length) return 0
  await db.tx(async (t) => {
    for (const i of items) await upsert(t, 'kt_archive', ['list', 'id'], { list: i.list, id: i.id, brand_id: i.brandId, at: i.at, title: i.title.slice(0, 250), archived_at: now, doc: JSON.stringify(i.item) })
  })
  await hub.apply(SYSTEM, [{ type: 'archive', lists: idsByList(items) }])
  return items.length
}

export interface ArchiveQuery {
  lists?: ArchiveList[]
  /** Brands the person sees ('all' for everyone); items without a brand need `withoutBrand`. */
  brands: string[] | 'all'
  withoutBrand: boolean
  q?: string
  year?: number
  offset?: number
  limit?: number
}

export async function listArchive(db: Db, o: ArchiveQuery) {
  const where: string[] = []
  const params: (string | number)[] = []
  const lists = (o.lists ?? [...ARCHIVE_LISTS]).filter((l) => (ARCHIVE_LISTS as readonly string[]).includes(l))
  where.push(`list IN (${lists.map(() => '?').join(', ') || "''"})`)
  params.push(...lists)
  if (o.brands !== 'all') {
    const own = o.brands.length ? `brand_id IN (${o.brands.map(() => '?').join(', ')})` : '1 = 0'
    where.push(o.withoutBrand ? `(${own} OR brand_id IS NULL)` : own)
    params.push(...o.brands)
  } else if (!o.withoutBrand) where.push('brand_id IS NOT NULL')
  if (o.q) {
    where.push('LOWER(title) LIKE ?')
    params.push(`%${o.q.toLowerCase().replace(/[%_]/g, '')}%`)
  }
  if (o.year) {
    where.push('at >= ? AND at < ?')
    params.push(Date.UTC(o.year, 0, 1), Date.UTC(o.year + 1, 0, 1))
  }
  const sql = `FROM kt_archive WHERE ${where.join(' AND ')}`
  const total = Number((await db.get<{ n: number | string }>(`SELECT COUNT(*) AS n ${sql}`, params))?.n ?? 0)
  const limit = Math.min(Math.max(o.limit ?? 50, 1), 200)
  const rows = await db.all<{ list: string; id: string; brand_id: string | null; at: number | string; title: string }>(`SELECT list, id, brand_id, at, title ${sql} ORDER BY at DESC LIMIT ${limit} OFFSET ${Math.max(0, o.offset ?? 0)}`, params)
  return { total, items: rows.map((r) => ({ list: r.list as ArchiveList, id: r.id, brandId: r.brand_id, at: new Date(Number(r.at)).toISOString(), title: r.title })) }
}

export async function archived(db: Db, list: string, id: string) {
  const row = await db.get<{ doc: string; brand_id: string | null }>('SELECT doc, brand_id FROM kt_archive WHERE list = ? AND id = ?', [list, id])
  return row ? { brandId: row.brand_id, item: JSON.parse(row.doc) as unknown } : null
}

/** Brings an archived item back into the live workspace (a campaign brings its deliverables). */
export async function restoreArchived(db: Db, hub: Hub, list: ArchiveList, id: string) {
  const found = await archived(db, list, id)
  if (!found) return false
  const lists: Partial<Record<ArchiveList, unknown[]>> = { [list]: [found.item] }
  const extra: { list: ArchiveList; id: string }[] = []
  if (list === 'creatorCampaigns') {
    const rows = await db.all<{ id: string; doc: string }>("SELECT id, doc FROM kt_archive WHERE list = 'deliverables'")
    const mine = rows.map((r) => ({ id: r.id, item: JSON.parse(r.doc) as { campaignId: string } })).filter((r) => r.item.campaignId === id)
    if (mine.length) lists.deliverables = mine.map((r) => r.item)
    extra.push(...mine.map((r) => ({ list: 'deliverables' as const, id: r.id })))
  }
  await hub.apply(SYSTEM, [{ type: 'unarchive', lists }])
  for (const x of [{ list, id }, ...extra]) await db.run('DELETE FROM kt_archive WHERE list = ? AND id = ?', [x.list, x.id])
  return true
}

export async function archiveStats(db: Db) {
  const rows = await db.all<{ list: string; n: number | string; bytes: number | string | null }>('SELECT list, COUNT(*) AS n, SUM(LENGTH(doc)) AS bytes FROM kt_archive GROUP BY list')
  return Object.fromEntries(rows.map((r) => [r.list, { count: Number(r.n), bytes: Number(r.bytes ?? 0) }]))
}

/** Everything archived, for a full export. */
export async function* allArchived(db: Db) {
  let offset = 0
  for (;;) {
    const rows = await db.all<{ list: string; doc: string }>(`SELECT list, doc FROM kt_archive ORDER BY list, id LIMIT 500 OFFSET ${offset}`)
    if (!rows.length) return
    for (const r of rows) yield { list: r.list, item: JSON.parse(r.doc) as unknown }
    offset += rows.length
  }
}

/* ───────────── backups ───────────── */

export interface BackupInfo {
  id: string
  kind: 'daily' | 'manual' | 'before-restore'
  createdAt: string
  version: number
  size: number
}

export async function makeBackup(db: Db, hub: Hub, kind: BackupInfo['kind'], now: number): Promise<BackupInfo> {
  await hub.sync()
  if (!hub.ws) throw new Error('Nothing to back up yet')
  const packed = gzipSync(JSON.stringify({ kataru: 1, version: hub.version, at: new Date(now).toISOString(), workspace: hub.ws }), { level: 9 })
  const id = `b-${now.toString(36)}-${randomBytes(3).toString('hex')}`
  await db.run('INSERT INTO kt_backups (id, kind, created_at, version, size, data) VALUES (?, ?, ?, ?, ?, ?)', [id, kind, now, hub.version, packed.length, packed.toString('base64')])
  await prune(db)
  return { id, kind, createdAt: new Date(now).toISOString(), version: hub.version, size: packed.length }
}

/** Keeps the last 7 daily backups, 4 made on Sundays, and 10 of the others. */
async function prune(db: Db) {
  const rows = await db.all<{ id: string; kind: string; created_at: number | string }>('SELECT id, kind, created_at FROM kt_backups ORDER BY created_at DESC')
  const keep = new Set<string>()
  const daily = rows.filter((r) => r.kind === 'daily')
  daily.slice(0, 7).forEach((r) => keep.add(r.id))
  daily
    .filter((r) => new Date(Number(r.created_at)).getUTCDay() === 0)
    .slice(0, 4)
    .forEach((r) => keep.add(r.id))
  rows
    .filter((r) => r.kind !== 'daily')
    .slice(0, 10)
    .forEach((r) => keep.add(r.id))
  for (const r of rows) if (!keep.has(r.id)) await db.run('DELETE FROM kt_backups WHERE id = ?', [r.id])
}

export async function listBackups(db: Db): Promise<BackupInfo[]> {
  const rows = await db.all<{ id: string; kind: string; created_at: number | string; version: number | string; size: number | string }>('SELECT id, kind, created_at, version, size FROM kt_backups ORDER BY created_at DESC')
  return rows.map((r) => ({ id: r.id, kind: r.kind as BackupInfo['kind'], createdAt: new Date(Number(r.created_at)).toISOString(), version: Number(r.version), size: Number(r.size) }))
}

/** A backup as JSON text (what the download gives). */
export async function readBackup(db: Db, id: string) {
  const row = await db.get<{ data: string }>('SELECT data FROM kt_backups WHERE id = ?', [id])
  return row ? gunzipSync(Buffer.from(row.data, 'base64')).toString('utf8') : null
}

/** Reads a backup file's workspace (a download of ours, or the demo's "Download backup"). */
export function workspaceOf(json: unknown): Workspace | null {
  const o = json as { workspace?: Workspace } | Workspace
  const ws = (o && typeof o === 'object' && 'workspace' in o ? o.workspace : o) as Workspace | undefined
  return ws && Array.isArray(ws.posts) && Array.isArray(ws.brands) && Array.isArray(ws.team) && ws.settings ? ws : null
}

/**
 * Puts a backup's workspace back. The people and roles stay as they are now
 * (they go with the sign-in accounts); a backup of the current state is made
 * first, so a restore can itself be undone.
 */
export async function restoreWorkspace(db: Db, hub: Hub, ws: Workspace, now: number) {
  await makeBackup(db, hub, 'before-restore', now)
  const current = hub.ws!
  await hub.apply(SYSTEM, [{ type: 'load', ws: { ...ws, team: current.team, roles: current.roles, ideas: ws.ideas ?? [], keyDates: ws.keyDates ?? [] } }])
}

/** Once a day, whichever process gets there first: a backup, then the archive. */
export async function daily(db: Db, hub: Hub, now: number, log: (s: string) => void) {
  if (!hub.ready) return
  const day = new Date(now).toISOString().slice(0, 10)
  const first = await db.run(db.dialect === 'mysql' ? 'INSERT IGNORE INTO kt_meta (k, v) VALUES (?, ?)' : 'INSERT OR IGNORE INTO kt_meta (k, v) VALUES (?, ?)', [`daily:${day}`, String(now)])
  if (!first.changes) return
  await db.run("DELETE FROM kt_meta WHERE k LIKE 'daily:%' AND k < ?", [`daily:${new Date(now - 30 * DAY).toISOString().slice(0, 10)}`])
  const b = await makeBackup(db, hub, 'daily', now)
  const moved = await runArchive(db, hub, now)
  log(`[daily] backup ${b.id} (${Math.round(b.size / 1024)} KB)${moved ? `, ${moved} old items archived` : ''}`)
}
