import { LOCAL_ACTIONS, reduce } from './reducer'
import type { WorkspaceAction } from './reducer'
import { ApiError, api, apiUrl } from './server'
import type { Snapshot } from './server'
import { applyPatch } from './sync'
import type { Patch } from './sync'
import type { Workspace } from './types'

/**
 * Keeps this browser's copy of the shared workspace in step with the server.
 *
 * - What the server confirmed (`confirmed`, at `version`) plus this person's
 *   changes still on their way (`pending`) make what the pages show, so a
 *   change appears at once and is corrected if the server refuses it.
 * - Changes go out one batch at a time, in order; a batch lost to a dropped
 *   connection is sent again with the same id (the server applies it once).
 * - Everyone's changes come back as patches over a live stream (SSE); when
 *   the stream can't stay open (some proxies) it polls instead. A missed
 *   patch means fetching the whole workspace again.
 */

interface Change {
  from: number
  to: number
  patch: Patch | null
}

interface Batch {
  id: string
  actions: WorkspaceAction[]
}

export type SyncStatus = 'live' | 'polling' | 'offline'

export interface SyncEvents {
  /** The server refused a change (role, brand, invalid). */
  refused(message: string, code: string): void
  /** The session ended or was suspended. */
  signedOut(code: string): void
  /** The workspace now requires two-step verification for this person. */
  mfaRequired(): void
}

export class SyncEngine {
  confirmed: Workspace
  version: number
  status: SyncStatus = 'live'
  private pending: Batch[] = []
  private outbox: WorkspaceAction[] = []
  private inflight: Batch | null = null
  private buffer: Change[] = []
  private seq = 0
  /** Batch ids are unique per connection, so a new session never repeats an old one's. */
  private prefix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  private listeners = new Set<() => void>()
  private cached: { key: unknown[]; ws: Workspace } | null = null
  private source: EventSource | null = null
  private poll: number | undefined
  private retry: number | undefined
  private backoff = 1000
  private refetching: Promise<void> | null = null
  private deferred: Snapshot | null = null
  private closed = false
  private events: SyncEvents

  constructor(first: Snapshot, events: SyncEvents) {
    this.confirmed = first.ws
    this.version = first.version
    this.events = events
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  private emit() {
    this.listeners.forEach((fn) => fn())
  }

  /** The workspace as the pages should show it: confirmed, plus changes on their way. */
  view = (): Workspace => {
    const key = [this.confirmed, this.pending.length, this.outbox.length, ...this.pending, this.outbox[this.outbox.length - 1]]
    if (this.cached && this.cached.key.length === key.length && this.cached.key.every((k, i) => k === key[i])) return this.cached.ws
    const actions = [...this.pending.flatMap((b) => b.actions), ...this.outbox]
    const ws = actions.reduce(reduce, this.confirmed)
    this.cached = { key, ws }
    return ws
  }

  /** Nothing waiting to be saved. */
  get settled() {
    return !this.pending.length && !this.outbox.length
  }

  dispatch(action: WorkspaceAction) {
    if (this.closed || LOCAL_ACTIONS.has(action.type)) return
    this.outbox.push(action)
    this.emit()
    // Changes made together (a post, its notice, its activity line) travel together.
    if (this.outbox.length === 1) queueMicrotask(() => this.flush())
  }

  private async flush() {
    if (this.inflight || this.closed) return
    if (!this.pending.length && !this.outbox.length) return
    // A batch that failed to send goes again first, with the same id.
    const batch = this.pending[0] ?? { id: `${this.prefix}-${++this.seq}`, actions: this.outbox.splice(0) }
    if (!this.pending.length) this.pending.push(batch)
    this.inflight = batch
    try {
      const change = await api<Change>('POST', '/workspace/actions', { id: batch.id, actions: batch.actions })
      this.inflight = null
      this.pending = this.pending.filter((b) => b !== batch)
      this.backoff = 1000
      if (this.status === 'offline') this.setStatus(this.source ? 'live' : 'polling')
      // Our change, with whatever arrived from others meanwhile, in the server's order.
      this.buffer.push(change)
    } catch (e) {
      this.inflight = null
      const err = e as ApiError
      if (err.status === 0 || err.status >= 500 || err.status === 429) {
        // Offline or the server is struggling: try again shortly, keeping the change.
        this.setStatus('offline')
        window.clearTimeout(this.retry)
        this.retry = window.setTimeout(() => void this.flush(), this.backoff)
        this.backoff = Math.min(this.backoff * 2, 30_000)
        this.drain()
        return
      }
      this.pending = this.pending.filter((b) => b !== batch)
      if (err.status === 401 || err.code === 'suspended') return this.events.signedOut(err.code)
      if (err.code === 'mfa_required') return this.events.mfaRequired()
      this.events.refused(err.message, err.code)
      // Maybe the refusal came from seeing an older workspace: catch up.
      if (Number(err.data.version) > this.version) void this.refetch()
      this.emit()
    }
    this.drain()
    void this.flush()
  }

  /** A change from the server (the reply to a batch, or the live stream). */
  private receive(change: Change) {
    // While a batch is out, others' changes wait, so a change of ours is never applied twice.
    if (this.inflight) return void this.buffer.push(change)
    if (change.to <= this.version) return this.emit()
    if (change.from !== this.version) return void this.refetch()
    if (change.patch) this.confirmed = applyPatch(this.confirmed, change.patch)
    this.version = change.to
    this.emit()
  }

  private drain() {
    if (this.deferred) {
      this.adopt(this.deferred)
      this.deferred = null
    }
    const waiting = this.buffer.splice(0).sort((a, b) => a.from - b.from)
    for (const c of waiting) this.receive(c)
    this.emit()
  }

  private adopt(s: Snapshot) {
    if (s.version < this.version) return
    this.confirmed = s.ws
    this.version = s.version
    this.emit()
  }

  /** Fetches the whole workspace again (a gap, a reconnect, a refusal). */
  refetch() {
    this.refetching ??= api<Snapshot>('GET', '/workspace')
      .then((s) => {
        // With a batch out, the snapshot may or may not hold it: wait for its reply.
        if (this.inflight) this.deferred = s
        else this.adopt(s)
      })
      .catch((e: ApiError) => {
        if (e.status === 401 || e.code === 'suspended') this.events.signedOut(e.code)
        else if (e.code === 'mfa_required') this.events.mfaRequired()
      })
      .finally(() => (this.refetching = null))
    return this.refetching
  }

  private setStatus(s: SyncStatus) {
    if (this.status === s) return
    this.status = s
    this.emit()
  }

  /** Opens the live stream; falls back to polling if it can't stay open. */
  connect() {
    if (this.closed) return
    if (typeof EventSource === 'undefined') return this.startPolling()
    let opened = false
    let failures = 0
    const source = new EventSource(apiUrl('/workspace/stream'), { withCredentials: true })
    this.source = source
    // Buffering proxies hold the stream back: no greeting within a few seconds means polling.
    const watchdog = window.setTimeout(() => {
      if (!opened) {
        source.close()
        this.source = null
        this.startPolling()
      }
    }, 8000)
    source.addEventListener('hello', (e) => {
      opened = true
      failures = 0
      window.clearTimeout(watchdog)
      this.stopPolling()
      this.setStatus('live')
      const { version } = JSON.parse((e as MessageEvent<string>).data) as { version: number }
      if (version > this.version) void this.refetch()
    })
    source.onmessage = (e) => this.receive(JSON.parse(e.data) as Change)
    source.onerror = () => {
      failures++
      // The stream closed for good (signed out, suspended): check why.
      if (source.readyState === EventSource.CLOSED || failures > 3) {
        source.close()
        this.source = null
        window.clearTimeout(watchdog)
        void this.refetch()
        this.startPolling()
        // Try the stream again later.
        window.setTimeout(() => !this.closed && !this.source && (this.stopPolling(), this.connect()), 60_000)
      }
    }
  }

  private startPolling() {
    if (this.poll || this.closed) return
    this.setStatus(this.status === 'offline' ? 'offline' : 'polling')
    const tick = async () => {
      try {
        const r = await api<{ version: number; ws?: Workspace }>('GET', `/workspace/changes?since=${this.version}`)
        if (r.ws && r.version > this.version && !this.inflight) {
          this.confirmed = r.ws
          this.version = r.version
          this.emit()
        }
        if (this.status === 'offline') this.setStatus('polling')
      } catch (e) {
        const err = e as ApiError
        if (err.status === 401 || err.code === 'suspended') return this.events.signedOut(err.code)
        if (err.code === 'mfa_required') return this.events.mfaRequired()
        if (err.status === 0) this.setStatus('offline')
      }
    }
    this.poll = window.setInterval(() => void tick(), 5000)
  }

  private stopPolling() {
    window.clearInterval(this.poll)
    this.poll = undefined
  }

  close() {
    this.closed = true
    this.source?.close()
    this.stopPolling()
    window.clearTimeout(this.retry)
    this.listeners.clear()
  }
}
