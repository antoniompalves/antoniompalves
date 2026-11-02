import { useState } from 'react'
import { Recycle as RecycleIcon, Send, Shield } from 'lucide-react'
import { Modal } from '../Modal'
import { useToast } from '../Toast'
import { Button, cn } from '../ui'
import { nextFreeSlot } from '../../data/compose'
import { clientNotices, excerpt, submittedNotices } from '../../data/notices'
import { needsApproval } from '../../data/permissions'
import { useWorkspace } from '../../data/store'
import type { Post } from '../../data/types'
import { firstStage, needsClient } from '../../data/workflow'
import { useI18n } from '../../i18n'

const WEEK = 7 * 86_400_000

/** When a recycled post goes out by default: the brand's next free slot, at least a week away. */
const defaultAt = (ws: Parameters<typeof nextFreeSlot>[0], p: Post, now: number) => nextFreeSlot(ws, p.brandId, Math.max(now, now + WEEK), null)

const toLocal = (ms: number) => new Date(ms).toISOString().slice(0, 16)

/**
 * "Post again" for an evergreen post: pick the original text or a variation
 * (or write a new one, kept as a variation), pick when, and it becomes a new
 * post, sent for approval when the person or the brand needs it.
 */
export function RecycleDialog({ post, now, onClose }: { post: Post; now: Date; onClose: () => void }) {
  const { t } = useI18n()
  const e = t.collab.evergreen
  const { all, dispatch } = useWorkspace()
  const toast = useToast()
  const me = all.currentUserId
  const nowMs = Math.floor(now.getTime() / 60_000) * 60_000
  const variations = post.evergreen?.variations ?? []
  const options = [post.text, ...variations]
  const [pick, setPick] = useState(variations.length ? 1 : 0)
  const [text, setText] = useState(options[variations.length ? 1 : 0]!)
  const [keep, setKeep] = useState(false)
  const [at, setAt] = useState(() => toLocal(defaultAt(all, post, nowMs)))
  const [error, setError] = useState('')
  const approval = needsApproval(all, me) || needsClient(all, post.brandId)

  const submit = () => {
    const when = Date.parse(`${at}:00Z`)
    if (!text.trim()) return setError(t.compose.toast.writeBeforeDraft)
    if (!Number.isFinite(when) || when <= nowMs) return setError(t.compose.when.passed)
    const iso = new Date(nowMs).toISOString()
    const copy: Post = {
      id: `p-${nowMs.toString(36)}r`,
      brandId: post.brandId,
      authorId: me,
      text: text.trim(),
      media: [...post.media],
      networks: [...post.networks],
      status: approval ? 'awaiting_approval' : 'scheduled',
      scheduledAt: new Date(when).toISOString(),
      createdAt: iso,
      reviews: approval ? [{ by: me, at: iso, decision: 'submitted' }] : [],
      recycledFrom: post.id,
      ...(approval && { stage: firstStage(all, me, post.brandId) }),
      ...(post.formats && { formats: post.formats }),
      ...(post.alt && { alt: post.alt }),
      ...(post.link && { link: post.link }),
    }
    const isNew = !options.includes(text.trim())
    dispatch({ type: 'savePost', post: copy })
    dispatch({ type: 'savePost', post: { ...post, evergreen: { variations: keep && isNew ? [...variations, text.trim()] : variations, lastAt: copy.scheduledAt } } })
    dispatch({ type: 'audit', event: { id: `au-${nowMs.toString(36)}r`, actorId: me, kind: 'schedule', action: { type: 'recycledPost', excerpt: excerpt(copy.text) }, at: iso } })
    if (approval) dispatch({ type: 'notify', notices: copy.stage === 'client' ? clientNotices(all, me, copy, nowMs) : submittedNotices(all, me, copy, nowMs) })
    toast({ text: approval ? e.sentDone : e.done(t.dates.dayStamp(new Date(when), now)), icon: RecycleIcon })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={e.title}
      sub={e.sub}
      onSubmit={submit}
      error={error}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {e.cancel}
          </Button>
          <Button type="submit" icon={approval ? Shield : Send}>
            {approval ? e.send : e.schedule}
          </Button>
        </>
      }
    >
      {options.length > 1 && (
        <div role="radiogroup" aria-label={e.text} className="flex flex-wrap gap-1.5">
          {options.map((o, i) => (
            <label
              key={i}
              className={cn('cursor-pointer rounded-full border px-3 py-1.5 text-2xs font-semibold has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-text', pick === i ? 'border-transparent bg-pill text-on-pill' : 'border-rim bg-glass-2')}
            >
              <input type="radio" name="variation" className="sr-only" checked={pick === i} onChange={() => (setPick(i), setText(o))} />
              {i === 0 ? e.original : e.variation(i)}
            </label>
          ))}
        </div>
      )}
      <label className="grid gap-1.5">
        <span className="px-0.5 text-2xs font-semibold text-muted">{e.text}</span>
        <textarea
          aria-label={e.text}
          value={text}
          onChange={(x) => (setText(x.target.value), setError(''))}
          rows={5}
          className="w-full resize-y rounded-[14px] border border-line-2 bg-glass-2 px-3 py-2.5 text-sm text-text outline-none focus-visible:border-text"
        />
      </label>
      <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold">
        <input type="checkbox" checked={keep} onChange={(x) => setKeep(x.target.checked)} className="size-4 accent-[var(--text)]" />
        {e.keep}
      </label>
      <label className="grid gap-1.5">
        <span className="px-0.5 text-2xs font-semibold text-muted">{e.when}</span>
        <input type="datetime-local" value={at} onChange={(x) => (setAt(x.target.value), setError(''))} className="h-[46px] w-full rounded-[14px] border border-line-2 bg-glass-2 px-3 text-sm text-text outline-none focus-visible:border-text" />
      </label>
    </Modal>
  )
}
