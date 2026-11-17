import { useState } from 'react'
import { Check, Copy, Link2, Lock, PenLine, Send } from 'lucide-react'
import { Modal } from '../Modal'
import { useToast } from '../Toast'
import { BrandMark, Button, Card, NetStack, Thumb, cn } from '../ui'
import { coverPhoto } from '../../data/assets'
import { can } from '../../data/access'
import { cleanPostUrl, isPlanner, overdue, toPostByHand } from '../../data/planner'
import { clip } from '../../data/selectors'
import { useWorkspace } from '../../data/store'
import type { Post } from '../../data/types'
import { mayGoOut } from '../../data/workflow'
import { useI18n } from '../../i18n'

/** The text to paste on the network: the caption, then Instagram's first comment. */
export const textToPost = (p: Post) => [p.text, p.firstComment].filter(Boolean).join('\n\n')

export function useCopyText() {
  const { t } = useI18n()
  const toast = useToast()
  return (p: Post) =>
    void navigator.clipboard?.writeText(textToPost(p)).then(
      () => toast({ text: t.planner.copied, icon: Copy }),
      () => undefined,
    )
}

/** "Mark as published": the post went out by hand; the link to it is optional. */
export function MarkPublishedDialog({ post, onClose, onDone }: { post: Post | null; onClose: () => void; onDone: (id: string, url?: string) => void }) {
  const { t } = useI18n()
  const p = t.planner
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const close = () => (setUrl(''), setError(''), onClose())
  const submit = () => {
    if (!post) return
    const clean = cleanPostUrl(url)
    if (url.trim() && !clean) return setError(p.badLink)
    onDone(post.id, clean ?? undefined)
    close()
  }
  return (
    <Modal
      open={!!post}
      onClose={close}
      title={p.markTitle}
      sub={p.markSub}
      onSubmit={submit}
      error={error}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {p.cancel}
          </Button>
          <Button type="submit" icon={Check}>
            {p.markPublished}
          </Button>
        </>
      }
    >
      <label className="grid gap-1.5">
        <span className="px-0.5 text-2xs font-semibold text-muted">{p.link}</span>
        <input
          type="url"
          inputMode="url"
          value={url}
          placeholder="https://"
          onChange={(e) => (setUrl(e.target.value), setError(''))}
          className="h-[46px] w-full rounded-[14px] border border-line-2 bg-glass-2 px-3 text-sm text-text outline-none focus-visible:border-text"
        />
      </label>
    </Modal>
  )
}

/** Overview card in planner mode: approved posts due within a day, and late ones, to post by hand. */
export function ToPostCard({ now, onOpen, onPublish, className }: { now: Date; onOpen: (id: string) => void; onPublish: (id: string, url?: string) => void; className?: string }) {
  const { t } = useI18n()
  const p = t.planner
  const { ws, all } = useWorkspace()
  const copy = useCopyText()
  const [marking, setMarking] = useState<Post | null>(null)
  const nowMs = now.getTime()
  const posts = toPostByHand(ws, nowMs)
  const mayMark = can(ws, ws.currentUserId, 'post.publish')
  return (
    <Card title={p.toPost} tools={posts.length ? <span className="text-2xs font-semibold text-muted">{posts.length}</span> : undefined} className={cn('flex flex-col', className)}>
      <p className="-mt-1 mb-3 text-2xs text-muted">{p.toPostSub}</p>
      {posts.length === 0 ? (
        <p className="grid flex-1 place-items-center rounded-[18px] border border-dashed border-line-2 p-6 text-center text-xs text-muted">{p.nothingToPost}</p>
      ) : (
        <ul className="grid content-start gap-2">
          {posts.slice(0, 6).map((x) => {
            const brand = ws.brands.find((b) => b.id === x.brandId)
            const late = overdue(x, nowMs)
            const when = new Date(x.scheduledAt)
            return (
              <li key={x.id} className="flex min-w-0 flex-wrap items-center gap-[11px] rounded-[18px] border border-line bg-glass-2 p-2">
                <button type="button" onClick={() => onOpen(x.id)} className="flex min-w-0 flex-[1_1_220px] cursor-pointer items-center gap-[11px] text-left">
                  <Thumb src={coverPhoto(x, 120)} className="size-[50px] shrink-0 rounded-[13px]" />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-xs font-semibold">{clip(x.text, 60)}</b>
                    <small className={cn('flex min-w-0 items-center gap-1.5 text-2xs', late ? 'font-semibold text-bad' : 'text-muted')}>
                      {brand && <BrandMark brand={brand} size="xs" />}
                      <span className="truncate">
                        {late ? `${p.late} · ` : ''}
                        {t.dates.relativeDay(when, now)} · {t.dates.time(when)}
                      </span>
                    </small>
                  </span>
                  <NetStack networks={x.networks} />
                </button>
                <span className="ml-auto flex shrink-0 gap-1.5 max-mobile:w-full max-mobile:[&>*:last-child]:flex-1">
                  <Button size="sm" variant="ghost" icon={Copy} onClick={() => copy(x)} aria-label={p.copyText}>
                    <span className="max-mobile:sr-only">{p.copyText}</span>
                  </Button>
                  {mayMark && (
                    <Button size="sm" variant="pine" icon={Send} onClick={() => setMarking(x)} disabled={!mayGoOut(all, { ...x, status: 'published' })}>
                      {p.markPublished}
                    </Button>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      <MarkPublishedDialog post={marking} onClose={() => setMarking(null)} onDone={onPublish} />
    </Card>
  )
}

/** Account menu → "Working mode": planner only, or connected to the networks. */
export function ModeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const p = t.planner
  const { all, dispatch } = useWorkspace()
  const toast = useToast()
  const [pick, setPick] = useState<'planner' | 'connected'>(isPlanner(all) ? 'planner' : 'connected')
  const locked = !!all.settings.modeLocked
  const submit = () => {
    if (!locked && pick !== (isPlanner(all) ? 'planner' : 'connected')) {
      dispatch({ type: 'settings', patch: { mode: pick } })
      toast({ text: p.switched(pick === 'planner'), icon: pick === 'planner' ? PenLine : Link2 })
    }
    onClose()
  }
  const option = (value: 'planner' | 'connected', name: string, sub: string, Icon: typeof PenLine) => (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-[18px] border p-3.5 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-text',
        pick === value ? 'border-text bg-glass-3' : 'border-line-2 bg-glass-2',
        locked && 'cursor-not-allowed opacity-70',
      )}
    >
      <input type="radio" name="kataru-mode" className="sr-only" checked={pick === value} disabled={locked} onChange={() => setPick(value)} />
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-[13px]', pick === value ? 'bg-pill text-on-pill' : 'bg-well')}>
        <Icon size={19} aria-hidden />
      </span>
      <span className="grid min-w-0 gap-1">
        <b className="text-sm font-semibold">{name}</b>
        <small className="text-2xs leading-[1.45] text-muted">{sub}</small>
      </span>
    </label>
  )
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={p.title}
      sub={p.sub}
      onSubmit={submit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {p.cancel}
          </Button>
          <Button type="submit" icon={Check} disabled={locked}>
            {p.save}
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label={p.title} className="grid gap-2">
        {option('planner', p.plannerName, p.plannerSub, PenLine)}
        {option('connected', p.connectedName, p.connectedSub, Link2)}
      </div>
      {locked && (
        <p className="flex items-center gap-2 text-2xs font-semibold text-muted">
          <Lock size={15} aria-hidden />
          {p.locked}
        </p>
      )}
    </Modal>
  )
}
