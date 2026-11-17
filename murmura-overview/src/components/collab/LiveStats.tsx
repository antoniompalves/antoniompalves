import { useEffect, useState } from 'react'
import { BarChart3, Check, ExternalLink, Link2, PenLine, RefreshCw } from 'lucide-react'
import { Modal } from '../Modal'
import { useToast } from '../Toast'
import { Button, cn } from '../ui'
import { can } from '../../data/access'
import { isPlanner } from '../../data/planner'
import { READABLE, parsePostLink } from '../../data/postLinks'
import { NETWORK_LABEL } from '../../data/selectors'
import { api } from '../../data/server'
import { useWorkspace } from '../../data/store'
import type { LiveStats, Post } from '../../data/types'
import { useI18n } from '../../i18n'
import type { Messages } from '../../i18n'

const METRICS = ['views', 'reach', 'likes', 'comments', 'shares', 'saves'] as const
type Metric = (typeof METRICS)[number]

const field = 'h-[46px] w-full min-w-0 rounded-[14px] border border-line-2 bg-glass-2 px-3 text-sm text-text outline-none focus-visible:border-text'

/** "Updated 2 h ago · from the brand's account", or why the last read failed. */
export function statsLine(t: Messages, s: LiveStats | undefined, link: string | undefined, now: Date): { text: string; bad: boolean } | null {
  const k = t.stats
  if (s?.error) {
    const e = k.error[s.error]
    return { text: typeof e === 'function' ? e(NETWORK_LABEL[parsePostLink(link ?? '')?.network ?? 'x']) : e, bad: true }
  }
  if (s) return { text: k.updated(t.dates.ago(s.at, now), k.source[s.source]), bad: false }
  return null
}

/** "Refresh now": asks the server to read the link again (the new numbers also arrive through the live sync). */
export function useRefreshStats() {
  const { t } = useI18n()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const run = async (kind: 'post' | 'deliverable', id: string) => {
    setBusy(true)
    try {
      const r = await api<{ stats: LiveStats }>('POST', `/stats/${kind}/${id}/refresh`)
      toast({ text: r.stats.error ? (statsLine(t, r.stats, undefined, new Date())?.text ?? t.stats.error.failed) : t.stats.refreshed, icon: RefreshCw })
    } catch (e) {
      toast({ text: (e as Error).message, icon: RefreshCw })
    } finally {
      setBusy(false)
    }
  }
  return { run, busy }
}

/**
 * The post drawer's numbers for a published post: the link to it (added or
 * changed here), what was read from it and when, "Refresh now" and the
 * curve of views per day on the server, and logging the numbers by hand.
 */
export function PostStatsPanel({ post, now }: { post: Post; now: Date }) {
  const { t } = useI18n()
  const k = t.stats
  const { all, dispatch, mode } = useWorkspace()
  const toast = useToast()
  const me = all.currentUserId
  const planner = isPlanner(all)
  const mayEdit = ['post.create', 'post.publish'].some((p) => can(all, me, p as 'post.create'))
  const mayLog = mayEdit || can(all, me, 'analytics.view')
  const [editing, setEditing] = useState(false)
  const [link, setLink] = useState(post.publishedUrl ?? '')
  const [error, setError] = useState('')
  const [manual, setManual] = useState(false)
  const [days, setDays] = useState<{ day: string; views?: number }[]>([])
  const { run, busy } = useRefreshStats()
  const ref = post.publishedUrl ? parsePostLink(post.publishedUrl) : null
  const server = mode === 'server'

  // The curve: one snapshot a day, kept on the server.
  useEffect(() => {
    if (!server || !post.publishedUrl) return
    let live = true
    api<{ days: { day: string; views?: number }[] }>('GET', `/stats/post/${post.id}`)
      .then((r) => live && setDays(r.days))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [server, post.id, post.publishedUrl, post.liveStats?.at])

  // Numbers read from the link, or (connected demo data) the post's metrics; planner mode has only real ones.
  const s = post.liveStats
  const m = post.metrics
  const values: Partial<Record<Metric, number>> = s ? s : !planner && m ? { views: m.views || m.impressions, reach: m.reach, likes: m.likes, comments: m.comments, shares: m.shares, saves: m.saves } : {}
  const shown = METRICS.filter((x) => values[x] !== undefined)
  const line = statsLine(t, s, post.publishedUrl, now)
  const series = days.filter((d): d is { day: string; views: number } => d.views !== undefined).map((d) => ({ ...d, label: t.dates.monthDay(new Date(`${d.day}T12:00:00Z`)), short: String(Number(d.day.slice(8))) }))
  const views = series.map((d) => d.views)
  const top = Math.max(1, ...views)

  const saveLink = () => {
    const raw = link.trim()
    if (raw && !parsePostLink(raw)) return setError(k.badLink)
    const url = raw ? parsePostLink(raw)!.url : undefined
    if (url !== post.publishedUrl) {
      // A new link starts its numbers afresh.
      const next: Post = { ...post, publishedUrl: url, liveStats: undefined }
      if (!url) delete next.publishedUrl
      delete next.liveStats
      dispatch({ type: 'savePost', post: next })
    }
    setEditing(false)
    if (url) {
      toast({ text: k.linkSaved, icon: Link2 })
      if (server && READABLE.includes(parsePostLink(url)!.network)) window.setTimeout(() => void run('post', post.id), 400)
    }
  }

  return (
    <section aria-label={k.title} className="grid gap-3 rounded-[22px] border border-line p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <BarChart3 size={17} aria-hidden />
        {k.title}
      </h3>

      {editing || (!post.publishedUrl && mayEdit) ? (
        <form
          noValidate
          onSubmit={(e) => (e.preventDefault(), saveLink())}
          className="flex flex-wrap items-start gap-2"
        >
          <label className="grid min-w-0 flex-[1_1_220px] gap-1">
            <span className="sr-only">{k.link}</span>
            <input type="url" inputMode="url" value={link} placeholder={k.link} onChange={(e) => (setLink(e.target.value), setError(''))} aria-invalid={!!error} className={field} />
            {error && <small className="px-0.5 text-2xs font-semibold text-bad">{error}</small>}
          </label>
          <Button type="submit" variant="ghost" icon={Check}>
            {post.publishedUrl || editing ? k.saveLink : k.addLink}
          </Button>
        </form>
      ) : post.publishedUrl ? (
        <div className="flex min-w-0 items-center gap-2">
          <a href={post.publishedUrl} target="_blank" rel="noreferrer noopener" className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-glass-2 px-3.5 py-2.5 text-xs font-semibold hover:bg-glass-3">
            <ExternalLink size={16} aria-hidden className="shrink-0" />
            <span className="truncate">{post.publishedUrl.replace(/^https?:\/\/(www\.)?/, '')}</span>
          </a>
          {mayEdit && (
            <Button size="sm" variant="ghost" icon={PenLine} onClick={() => (setLink(post.publishedUrl ?? ''), setEditing(true))} aria-label={k.editLink}>
              <span className="max-[480px]:sr-only">{k.editLink}</span>
            </Button>
          )}
        </div>
      ) : null}

      {shown.length > 0 ? (
        <dl className="grid grid-cols-3 gap-2 max-[480px]:grid-cols-2">
          {shown.map((x) => (
            <div key={x} className="rounded-2xl border border-line bg-glass-2 p-3">
              <dt className="text-2xs text-muted">{k.metric[x]}</dt>
              <dd className="text-xl font-bold tracking-[-0.01em] tabular-nums">{t.numbers.compact(values[x]!)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-muted">{k.none}</p>
      )}

      {views.length > 1 && (
        <figure className="grid gap-1.5">
          <figcaption className="text-2xs font-semibold text-muted">{k.trend}</figcaption>
          {/* One bar per day with a snapshot (the total so far), the day under it. */}
          <ol className="flex h-[76px] items-end gap-1" aria-label={k.trend}>
            {series.slice(-14).map((d) => (
              <li key={d.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${t.numbers.compact(d.views)}`}>
                <span className="w-full rounded-t-[6px] bg-pine/80" style={{ height: `${Math.max(4, (d.views / top) * 56)}px` }} />
                <small className="text-[10.5px] leading-none text-muted tabular-nums">{d.short}</small>
              </li>
            ))}
          </ol>
        </figure>
      )}

      {line && <p className={cn('text-2xs font-semibold', line.bad ? 'text-bad' : 'text-muted')}>{line.text}</p>}
      {post.publishedUrl && ref && READABLE.includes(ref.network) && !s?.error && <p className="text-2xs text-muted">{server ? k.schedule : k.needsServer}</p>}

      <div className="flex flex-wrap gap-2">
        {server && ref && READABLE.includes(ref.network) && (
          <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => void run('post', post.id)} disabled={busy} aria-busy={busy}>
            {k.refresh}
          </Button>
        )}
        {mayLog && (
          <Button size="sm" variant="ghost" icon={PenLine} onClick={() => setManual(true)}>
            {k.logByHand}
          </Button>
        )}
      </div>
      {manual && <ManualStatsDialog values={values} onClose={() => setManual(false)} onSave={(stats) => dispatch({ type: 'liveStats', kind: 'post', id: post.id, stats: { ...stats, at: new Date(now).toISOString() } })} />}
    </section>
  )
}

/** Numbers typed in from the network's insights; blanks stay unknown. */
function ManualStatsDialog({ values, onSave, onClose }: { values: Partial<Record<Metric, number>>; onSave: (s: Omit<LiveStats, 'at'>) => void; onClose: () => void }) {
  const { t } = useI18n()
  const k = t.stats
  const toast = useToast()
  const [form, setForm] = useState<Record<Metric, string>>(() => Object.fromEntries(METRICS.map((x) => [x, values[x] !== undefined ? String(values[x]) : ''])) as Record<Metric, string>)
  const submit = () => {
    const out: Partial<Record<Metric, number>> = {}
    for (const x of METRICS) {
      const v = form[x].replace(/[\s.,]/g, '')
      if (v && /^\d+$/.test(v)) out[x] = Number(v)
    }
    onSave({ source: 'manual', ...out })
    toast({ text: k.logged, icon: BarChart3 })
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={k.manualTitle}
      sub={k.manualSub}
      onSubmit={submit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {k.cancel}
          </Button>
          <Button type="submit" icon={Check}>
            {k.save}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3 max-mobile:grid-cols-2">
        {METRICS.map((x) => (
          <label key={x} className="grid gap-1.5">
            <span className="px-0.5 text-2xs font-semibold text-muted">{k.metric[x]}</span>
            <input inputMode="numeric" value={form[x]} onChange={(e) => setForm({ ...form, [x]: e.target.value })} className={cn(field, 'tabular-nums')} />
          </label>
        ))}
      </div>
    </Modal>
  )
}
