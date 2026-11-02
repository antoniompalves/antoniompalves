import { useEffect, useRef, useState } from 'react'
import { Clock, Copy, Leaf, MessageSquare, PenLine, Recycle, Repeat, Send, ShieldCheck, Trash2, TriangleAlert, X } from 'lucide-react'
import { PostNotes } from '../collab/Notes'
import { RecycleDialog } from '../collab/Recycle'
import { useToast } from '../Toast'
import { clientsOf, mayGoOut, needsClient, stageOf } from '../../data/workflow'
import type { Brand, NetworkId, Post, TeamMember } from '../../data/types'
import { NETWORK_LABEL, clip } from '../../data/selectors'
import { engagementRate, engagements } from '../../data/analytics'
import { FORMATS, viewOn } from '../../data/formats'
import { useWorkspace } from '../../data/store'
import { useI18n } from '../../i18n'
import { PostPreview } from '../PostPreview'
import { BrandMark, Button, IconButton, NetStack, PostStatusPill, Segmented } from '../ui'

interface PostDrawerProps {
  post: Post | null
  brand?: Brand
  author?: TeamMember
  now: Date
  onClose: () => void
  onPublish: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

/**
 * Right-hand post drawer (".drawer" + ".pd-*"): status, timing, a per-network
 * preview, metrics once published, and the publishing actions.
 */
export function PostDrawer({ post, brand, author, now, onClose, onPublish, onDuplicate, onDelete }: PostDrawerProps) {
  const { t } = useI18n()
  const { all, dispatch, undoable } = useWorkspace()
  const toast = useToast()
  const c = t.collab
  const ref = useRef<HTMLDialogElement>(null)
  const [network, setNetwork] = useState<NetworkId | null>(null)
  const [recycling, setRecycling] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (post && !d.open) d.showModal()
    if (!post && d.open) d.close()
    setNetwork(post?.networks[0] ?? null)
  }, [post])

  const when = post ? new Date(post.scheduledAt) : now
  const stamp = `${t.dates.relativeDay(when, now)} · ${t.dates.time(when)}`
  const m = post?.metrics

  return (
    <dialog
      ref={ref}
      aria-label={t.drawer.label}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="fixed inset-y-3 left-auto right-3 m-0 h-auto max-h-none w-[min(480px,calc(100vw-24px))] max-w-none overflow-auto overscroll-contain rounded-[28px] border border-rim bg-glass-3 p-0 text-text shadow-pop backdrop:bg-[rgb(16_18_20/0.26)] backdrop:backdrop-blur-[6px] open:animate-drawer dark:backdrop:bg-black/60"
    >
      {post && brand && (
        <div className="relative grid content-start gap-[18px] p-6">
          <span className="absolute right-[18px] top-[18px] z-[1]">
            <IconButton label={t.common.close} icon={X} onClick={onClose} />
          </span>

          <header className="flex flex-wrap items-center gap-2.5 pr-[52px]">
            <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-2xs font-semibold">
              <BrandMark brand={brand} size="xs" />
              {brand.name}
            </span>
            <PostStatusPill status={post.status} size="md" />
          </header>
          <h2 className="pr-[52px] text-[23px] font-bold tracking-[-0.02em]">{clip(post.text, 44)}</h2>
          <p className="-mt-2 flex items-center gap-2 text-xs text-muted">
            <Clock size={17} aria-hidden className="shrink-0" />
            {t.drawer.when(post.status, stamp)}
            {author && t.drawer.by(author.name)}
          </p>

          {post.failure && (
            <p className="flex items-start gap-2.5 rounded-2xl bg-[color-mix(in_srgb,var(--coral)_14%,transparent)] px-3.5 py-3 text-xs font-semibold text-bad">
              <TriangleAlert size={18} aria-hidden className="mt-px shrink-0" />
              {t.failure(NETWORK_LABEL[post.failure.network], brand.name)}
            </p>
          )}

          {post.networks.length > 1 && network && (
            <div className="overflow-x-auto [scrollbar-width:none]">
              <Segmented
                label={t.drawer.previewNetwork}
                value={network}
                onChange={setNetwork}
                options={post.networks.map((n) => {
                  // Formats picked on purpose show next to the network ("Instagram · Reel").
                  const f = post.formats?.[n]
                  return { value: n, label: f && f !== FORMATS[n][0] ? `${NETWORK_LABEL[n]} · ${t.compose.formats.label[f]}` : NETWORK_LABEL[n] }
                })}
              />
            </div>
          )}

          <div key={network} className="grid animate-rise justify-items-center rounded-[22px] bg-well p-[18px]">
            <PostPreview view={viewOn(post, network ?? post.networks[0], all.media)} brand={brand} network={network ?? post.networks[0]} stamp={stamp} />
          </div>

          {m && (
            <dl className="grid grid-cols-3 gap-2 max-[480px]:grid-cols-2">
              {[
                [t.drawer.impressions, t.numbers.compact(m.impressions)],
                [t.drawer.reach, t.numbers.compact(m.reach)],
                [t.drawer.engagements, t.numbers.compact(engagements(m))],
                [t.drawer.engRate, t.numbers.pct1(engagementRate(m))],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-line bg-glass-2 p-3">
                  <dt className="text-2xs text-muted">{k}</dt>
                  <dd className="text-xl font-bold tracking-[-0.01em] tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="flex items-center gap-2.5 text-2xs text-muted">
            <NetStack networks={post.networks} />
            <span>{post.networks.map((n) => `${NETWORK_LABEL[n]} @${brand.handle}`).join(' · ')}</span>
          </div>

          {post.status === 'awaiting_approval' && needsClient(all, post.brandId) && (
            <p className="flex items-center gap-2 rounded-2xl bg-glass-2 px-3.5 py-2.5 text-xs font-semibold">
              <ShieldCheck size={17} aria-hidden className="shrink-0" />
              {stageOf(all, post) === 'client' ? c.client.waiting(t.collab.list(clientsOf(all, post.brandId).map((m) => m.name.split(' ')[0]!))) : c.client.teamStage}
            </p>
          )}

          {post.seriesId &&
            (() => {
              const series = all.posts.filter((p) => p.seriesId === post.seriesId).sort((a, b) => (a.occurrence ?? 0) - (b.occurrence ?? 0))
              const later = series.filter((p) => (p.occurrence ?? 0) > (post.occurrence ?? 0) && p.status !== 'published')
              return (
                <div className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-glass-2 px-3.5 py-2.5 text-xs">
                  <Repeat size={17} aria-hidden className="shrink-0" />
                  <span className="flex-1 font-semibold">{c.repeat.series((post.occurrence ?? 0) + 1, series.length)}</span>
                  {later.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => toast({ text: c.repeat.stopped(later.length), icon: Repeat, undo: undoable(...later.map((p) => ({ type: 'delete' as const, id: p.id }))) })}>
                      {c.repeat.stop}
                    </Button>
                  )}
                </div>
              )
            })()}

          {post.status === 'published' && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={post.evergreen ? 'pine' : 'ghost'}
                icon={Leaf}
                aria-pressed={!!post.evergreen}
                onClick={() => {
                  const { evergreen, ...rest } = post
                  dispatch({ type: 'savePost', post: evergreen ? rest : { ...post, evergreen: { variations: [] } } })
                  toast({ text: evergreen ? c.evergreen.unmarked : c.evergreen.marked, icon: Leaf })
                }}
              >
                {c.evergreen.mark}
              </Button>
              <Button size="sm" variant="ghost" icon={Recycle} onClick={() => setRecycling(true)}>
                {c.evergreen.recycle}
              </Button>
            </div>
          )}

          <section aria-label={c.notes.title} className="grid gap-2.5 rounded-[22px] border border-line p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <MessageSquare size={17} aria-hidden />
              {c.notes.title}
              <small className="font-normal text-muted">{c.notes.sub}</small>
            </h3>
            <PostNotes post={post} now={now} />
          </section>

          <footer className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {post.status !== 'published' && (
              <>
                <Button icon={Send} onClick={() => onPublish(post.id)} disabled={!mayGoOut(all, { ...post, status: 'published' })} title={mayGoOut(all, post) ? undefined : c.client.mustWait}>
                  {t.drawer.publishNow}
                </Button>
                <Button variant="ghost" icon={PenLine} href={`#/compose/${post.id}`}>
                  {t.drawer.edit}
                </Button>
              </>
            )}
            <span className="flex-1" />
            <IconButton label={t.drawer.duplicate} icon={Copy} onClick={() => onDuplicate(post.id)} />
            <IconButton label={t.drawer.delete} icon={Trash2} onClick={() => onDelete(post.id)} />
          </footer>
        </div>
      )}
      {recycling && post && <RecycleDialog post={post} now={now} onClose={() => setRecycling(false)} />}
    </dialog>
  )
}
