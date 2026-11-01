import { reduce } from '../../src/data/reducer.ts'
import type { WorkspaceAction } from '../../src/data/reducer.ts'
import { diff, viewFor } from '../../src/data/sync.ts'
import type { Patch } from '../../src/data/sync.ts'
import type { Workspace } from '../../src/data/types.ts'
import type { Db } from '../db.ts'
import { vet } from './policy.ts'

/**
 * The company's one shared workspace. Changes arrive as actions (the same
 * ones the browser makes), are checked, written to the database as numbered
 * events, applied with the shared reducer and pushed to everyone connected,
 * each seeing only their brands. A snapshot of the whole workspace is saved
 * every few seconds so a restart replays only the last few events.
 *
 * Shared hosting may run the app as several processes: the database is the
 * source of truth (two processes can't write the same event number), and each
 * process catches up with what the others wrote before changing anything and,
 * while someone is connected, every couple of seconds.
 */

/** What a browser receives: the change from version `from` to `to`, as that person sees it. */
export interface Change {
  from: number
  to: number
  patch: Patch | null
}

export interface Subscriber {
  memberId: string
  send(change: Change): void
  close(): void
}

export interface Actor {
  userId: string | null
  /** Null for changes the server makes itself (accounts, sign-ins). */
  memberId: string | null
}

const duplicate = (e: unknown) => /UNIQUE|PRIMARY|Duplicate entry|ER_DUP_ENTRY/i.test(`${(e as { code?: string })?.code ?? ''} ${(e as Error)?.message ?? ''}`)

export class Hub {
  ws: Workspace | null = null
  version = 0
  private subs = new Set<Subscriber>()
  private line: Promise<unknown> = Promise.resolve()
  private snapshotTimer: ReturnType<typeof setTimeout> | null = null
  private savedVersion = 0
  private watch: ReturnType<typeof setInterval> | null = null
  private db: Db
  private now: () => number
  private log: (s: string) => void

  constructor(db: Db, opts: { now?: () => number; log?: (s: string) => void } = {}) {
    this.db = db
    this.now = opts.now ?? Date.now
    this.log = opts.log ?? ((s) => console.log(s))
  }

  /** One change at a time in this process. */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.line.then(fn, fn)
    this.line = next.catch(() => undefined)
    return next
  }

  get ready() {
    return this.ws !== null
  }

  /** Loads the snapshot and replays what came after it; false when the workspace hasn't been set up. */
  async load() {
    await this.exclusive(() => this.catchUp())
    return this.ready
  }

  private async reloadSnapshot() {
    const row = await this.db.get<{ version: number | string; doc: string }>('SELECT version, doc FROM kt_workspace WHERE id = 1')
    if (!row) return false
    this.ws = JSON.parse(row.doc) as Workspace
    this.version = Number(row.version)
    this.savedVersion = this.version
    return true
  }

  /** Applies events other processes wrote; true when anything changed. */
  private async catchUp(): Promise<boolean> {
    const snap = await this.db.get<{ version: number | string }>('SELECT version FROM kt_workspace WHERE id = 1')
    if (!snap) return false
    const top = await this.db.get<{ m: number | string | null }>('SELECT MAX(version) AS m FROM kt_events')
    const latest = Math.max(Number(snap.version), Number(top?.m ?? 0))
    if (this.ws && latest <= this.version) return false
    let rows = await this.db.all<{ version: number | string; actions: string }>('SELECT version, actions FROM kt_events WHERE version > ? ORDER BY version ASC', [this.ws ? this.version : Number(snap.version)])
    // Too far behind (or just starting): begin from the snapshot.
    if (!this.ws || (Number(snap.version) > this.version && (!rows.length || Number(rows[0]!.version) !== this.version + 1))) {
      await this.reloadSnapshot()
      rows = rows.filter((r) => Number(r.version) > this.version)
    }
    let ws = this.ws!
    for (const r of rows) {
      if (Number(r.version) !== this.version + 1) break
      ws = (JSON.parse(r.actions) as WorkspaceAction[]).reduce(reduce, ws)
      this.version = Number(r.version)
    }
    const changed = ws !== this.ws
    this.ws = ws
    return changed || rows.length > 0
  }

  /** Catches up and tells everyone connected here. */
  private async refresh() {
    const before = this.ws
    const from = this.version
    if ((await this.catchUp()) && before) this.broadcast(before, this.ws!, from, this.version)
  }

  /** Makes sure this process has everything (call before decisions that read the workspace). */
  sync() {
    return this.exclusive(() => this.refresh())
  }

  /** The first save: the company's workspace, inside the setup transaction. */
  async insertInitial(db: Db, ws: Workspace) {
    await db.run('INSERT INTO kt_workspace (id, version, doc, updated_at) VALUES (1, 0, ?, ?)', [JSON.stringify(ws), this.now()])
  }

  adopt(ws: Workspace) {
    this.ws = ws
    this.version = 0
    this.savedVersion = 0
  }

  /**
   * Checks and applies `actions`. People's changes are vetted (policy.ts);
   * the server's own (memberId null) are trusted. Returns the change as the
   * actor sees it.
   */
  apply(actor: Actor, actions: WorkspaceAction[]): Promise<Change> {
    return this.exclusive(async () => {
      for (let attempt = 0; attempt < 8; attempt++) {
        await this.refresh()
        const before = this.ws
        if (!before) throw new Error('The workspace has not been set up')
        const checked = actor.memberId ? vet(before, actor.memberId, actions) : { actions, next: actions.reduce(reduce, before) }
        const from = this.version
        const to = from + 1
        try {
          await this.db.run('INSERT INTO kt_events (version, user_id, at, actions) VALUES (?, ?, ?, ?)', [to, actor.userId, this.now(), JSON.stringify(checked.actions)])
        } catch (e) {
          // Another process got there first: catch up and try again.
          if (duplicate(e)) continue
          throw e
        }
        this.ws = checked.next
        this.version = to
        this.broadcast(before, checked.next, from, to)
        this.scheduleSnapshot()
        return { from, to, patch: actor.memberId ? diff(viewFor(before, actor.memberId), viewFor(checked.next, actor.memberId)) : null }
      }
      throw new Error('The workspace is too busy, try again')
    })
  }

  /** The workspace as `memberId` sees it, right now. */
  view(memberId: string) {
    const ws = this.ws!
    return { version: this.version, ws: { ...viewFor(ws, memberId), now: new Date(this.now()).toISOString() } }
  }

  private broadcast(before: Workspace, after: Workspace, from: number, to: number) {
    const cache = new Map<string, Patch | null>()
    for (const s of this.subs) {
      const m = after.team.find((x) => x.id === s.memberId)
      if (!m || m.status !== 'active') {
        s.close()
        this.subs.delete(s)
        continue
      }
      if (!cache.has(s.memberId)) cache.set(s.memberId, diff(viewFor(before, s.memberId), viewFor(after, s.memberId)))
      try {
        s.send({ from, to, patch: cache.get(s.memberId)! })
      } catch {
        this.subs.delete(s)
      }
    }
  }

  subscribe(s: Subscriber) {
    this.subs.add(s)
    if (!this.watch) {
      // While anyone is connected, pick up what other processes wrote.
      this.watch = setInterval(() => void this.sync().catch((e) => this.log(`[workspace] ${(e as Error).message}`)), 2000)
      this.watch.unref?.()
    }
    return () => {
      this.subs.delete(s)
      if (!this.subs.size && this.watch) {
        clearInterval(this.watch)
        this.watch = null
      }
    }
  }

  /** Disconnects someone everywhere (suspended, or signed out of every device). */
  disconnect(memberId: string) {
    for (const s of this.subs) {
      if (s.memberId !== memberId) continue
      s.close()
      this.subs.delete(s)
    }
  }

  get connected() {
    return this.subs.size
  }

  private scheduleSnapshot() {
    if (this.version - this.savedVersion >= 50) return void this.saveSnapshot()
    if (this.snapshotTimer) return
    this.snapshotTimer = setTimeout(() => void this.saveSnapshot(), 3000)
    this.snapshotTimer.unref?.()
  }

  /** Saves the whole workspace and drops events everyone has had for a while. */
  async saveSnapshot() {
    if (this.snapshotTimer) clearTimeout(this.snapshotTimer)
    this.snapshotTimer = null
    if (!this.ws || this.version <= this.savedVersion) return
    const version = this.version
    try {
      const r = await this.db.run('UPDATE kt_workspace SET version = ?, doc = ?, updated_at = ? WHERE id = 1 AND version < ?', [version, JSON.stringify(this.ws), this.now(), version])
      this.savedVersion = version
      if (r.changes) await this.db.run('DELETE FROM kt_events WHERE version <= ? AND at < ?', [version, this.now() - 3_600_000])
    } catch (e) {
      this.log(`[workspace] Couldn't save a snapshot: ${(e as Error).message}`)
    }
  }

  async close() {
    for (const s of this.subs) s.close()
    this.subs.clear()
    if (this.watch) clearInterval(this.watch)
    await this.saveSnapshot()
  }
}
