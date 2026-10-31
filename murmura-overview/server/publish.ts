import type { PublishErrorCode, PublishProvider } from '../src/data/publishing.ts'
import { ProviderError } from './providers/types.ts'
import type { Connection, MediaSource, Provider } from './providers/types.ts'
import { issues } from './rules.ts'
import type { Job, Store } from './store.ts'

const MINUTE = 60_000
/** Retries after transient failures: 1, 5 and 15 minutes. */
const BACKOFF = [MINUTE, 5 * MINUTE, 15 * MINUTE]
/** Refresh tokens that lapse within this window before using them. */
const MARGIN = 5 * MINUTE
/** Connections whose sign-in lapses within this window are flagged so people re-connect in time. */
const WARN = 7 * 24 * 60 * MINUTE

export interface Deps {
  store: Store
  providers: Record<PublishProvider, Provider>
  media: MediaSource
  now?: () => number
}

/** A usable access token, refreshed first when it's about to lapse. */
export async function ensureFresh(deps: Deps, connection: Connection, force = false) {
  const now = deps.now?.() ?? Date.now()
  const provider = deps.providers[connection.provider]
  const t = connection.tokens
  const lapsing = t.expiresAt !== undefined && t.expiresAt - now < (force ? WARN : MARGIN)
  if (lapsing && provider.refresh) {
    try {
      connection.tokens = await provider.refresh(t)
      connection.status = 'ok'
      connection.lastError = undefined
    } catch (e) {
      connection.status = t.expiresAt! < now ? 'expired' : 'expiring'
      connection.lastError = (e as Error).message
      if (connection.status === 'expired') throw e
    }
  } else if (lapsing) {
    // Meta has no refresh: flag it; Page tokens keep working until the person loses access.
    connection.status = t.expiresAt! < now && connection.provider !== 'meta' ? 'expired' : 'expiring'
  }
  connection.updatedAt = now
  await deps.store.save()
  if (connection.status === 'expired') throw new ProviderError('auth', `${connection.provider}: the sign-in expired; connect it again`, { provider: connection.provider })
}

/** Publishes (or follows up on) one job and records what happened. */
export async function runJob(deps: Deps, job: Job) {
  const now = deps.now?.() ?? Date.now()
  const found = deps.store.account(job.accountId)
  const fail = (code: PublishErrorCode, message: string) => deps.store.patchJob(job.id, { status: 'failed', error: { code, message } })
  if (!found) return fail('auth', 'This account is no longer connected.'), deps.store.save()
  const { connection, account } = found
  const provider = deps.providers[connection.provider]
  const ctx = { connection, account, post: job.post, media: deps.media }
  const following = job.status === 'processing' && job.result

  const problems = issues(job.network, job.post)
  if (!following && problems.length) return fail('invalid', problems.join(' ')), deps.store.save()

  deps.store.patchJob(job.id, { status: following ? 'processing' : 'publishing', attempts: job.attempts + (following ? 0 : 1) })
  await deps.store.save()
  try {
    await ensureFresh(deps, connection)
    const result = following ? await provider.check!(ctx, job.result!.remoteId) : await provider.publish(ctx)
    deps.store.patchJob(job.id, {
      status: result.status === 'processing' ? 'processing' : 'published',
      result,
      error: undefined,
      nextAttemptAt: result.status === 'processing' ? now + MINUTE : undefined,
    })
  } catch (e) {
    const err = e instanceof ProviderError ? e : new ProviderError('unknown', (e as Error).message)
    if (err.code === 'auth') {
      connection.status = 'expired'
      connection.lastError = err.message
    }
    const again = err.retryable && job.attempts < BACKOFF.length
    deps.store.patchJob(job.id, {
      status: again ? 'scheduled' : 'failed',
      error: { code: err.code, message: err.message },
      nextAttemptAt: again ? now + (err.code === 'rate_limit' ? 60 * MINUTE : BACKOFF[job.attempts - 1] ?? BACKOFF[0]) : undefined,
    })
  }
  await deps.store.save()
  return deps.store.job(job.id)
}

/** Jobs that should run now: due scheduled ones and processing ones waiting for a check. */
export const dueJobs = (store: Store, now: number) =>
  store.data.jobs
    .filter((j) => (j.status === 'scheduled' && j.publishAt <= now && (j.nextAttemptAt ?? 0) <= now) || (j.status === 'processing' && (j.nextAttemptAt ?? 0) <= now))
    .sort((a, b) => a.publishAt - b.publishAt)

/**
 * Every `intervalMs`: run due jobs one at a time (posts to one account stay in
 * order), and once an hour refresh sign-ins that lapse within a week.
 */
export function startScheduler(deps: Deps, intervalMs = 15_000) {
  let busy = false
  let lastSweep = 0
  const tick = async () => {
    if (busy) return
    busy = true
    try {
      const now = deps.now?.() ?? Date.now()
      // Jobs left "publishing" by a crash are retried as scheduled.
      for (const j of deps.store.data.jobs) if (j.status === 'publishing' && j.updatedAt < now - 30 * MINUTE) deps.store.patchJob(j.id, { status: 'scheduled' })
      for (const job of dueJobs(deps.store, now)) await runJob(deps, job)
      if (now - lastSweep > 60 * MINUTE) {
        lastSweep = now
        for (const c of deps.store.data.connections) await ensureFresh(deps, c, true).catch(() => {})
      }
    } finally {
      busy = false
    }
  }
  const timer = setInterval(() => void tick(), intervalMs)
  return { tick, stop: () => clearInterval(timer) }
}
