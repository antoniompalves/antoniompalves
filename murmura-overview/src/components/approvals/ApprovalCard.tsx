import { useState } from 'react'
import { ArrowUpRight, Check, FileText, History, PenLine, TriangleAlert, Undo2 } from 'lucide-react'
import { Avatar, BrandMark, Button, IconButton, NetStack, PostStatusPill, cn, toneFill } from '../ui'
import { dueState, lastOf, reviewersOf } from '../../data/approvals'
import { photo } from '../../data/assets'
import { postTitle } from '../../data/compose'
import { member } from '../../data/permissions'
import type { Post, Tone, Workspace } from '../../data/types'
import { useI18n } from '../../i18n'

interface CardProps {
  post: Post
  ws: Workspace
  me: string
  now: Date
  reviewable: boolean
  selected: boolean
  onSelect: (on: boolean) => void
  onApprove: () => void
  onRequestChanges: () => void
  onWithdraw: () => void
  onOpen: () => void
  /** Shown over the card for a moment after approving ("APPROVED" stamp). */
  stamped: boolean
}

/** One post in a queue (".ap-card"): photos, when it goes out, who wrote it and who can sign it off, its review steps and actions. */
export function ApprovalCard({ post: p, ws, me, now, reviewable, selected, onSelect, onApprove, onRequestChanges, onWithdraw, onOpen, stamped }: CardProps) {
  const { t } = useI18n()
  const a = t.approvals
  const [shown, setShown] = useState(0)
  const brand = ws.brands.find((b) => b.id === p.brandId)!
  const author = member(ws, p.authorId)
  const title = postTitle(p.text) || t.compose.untitled
  const nowMs = now.getTime()
  const at = new Date(p.scheduledAt)

  const when = (() => {
    if (p.status === 'scheduled' || p.status === 'published')
      return { tone: (p.status === 'published' ? 'pine' : 'sea') as Tone, label: p.status === 'published' ? a.when.wentOut : a.when.goesOut }
    const due = dueState(p, nowMs)
    return {
      tone: (p.status === 'changes_requested' || due !== 'later' ? 'coral' : 'butter') as Tone,
      label: due === 'late' ? a.when.wasDue : due === 'soon' ? a.when.dueSoon : a.when.goesOut,
    }
  })()

  const sent = lastOf(p, 'submitted')
  const reviewers = reviewersOf(ws, me, p)
  const names = reviewers.slice(0, 2).map((m) => (m.id === me ? a.you : m.name.split(' ')[0]))
  const steps = p.reviews.slice(-3)
  const earlier = p.reviews.length - steps.length
  const mine = p.authorId === me
  const canEdit = mine || reviewable

  const overlay = 'absolute z-[1]'
  return (
    <article
      aria-label={`${brand.name}: ${title}`}
      className={cn(
        'relative flex min-w-0 flex-col rounded-card border border-rim bg-glass p-2.5 shadow-card [container-type:inline-size] max-mobile:p-2',
        selected && 'shadow-[var(--shadow),0_0_0_2px_var(--text)]',
      )}
    >
      <div
        className={cn(
          'relative isolate flex-none overflow-hidden rounded-[18px] bg-well after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:top-[45%] after:z-0 after:bg-[linear-gradient(transparent,rgb(12_14_16/0.42))]',
          p.media.length ? 'aspect-[16/10]' : 'grid aspect-[16/7] place-content-center justify-items-center gap-1.5 text-2xs font-semibold text-muted',
        )}
      >
        {p.media.length ? (
          p.media.map((seed, i) => (
            <img key={seed} src={photo(seed, 900)} alt="" loading="lazy" decoding="async" className={cn('absolute inset-0 size-full object-cover transition-opacity duration-300', i === shown ? 'opacity-100' : 'opacity-0')} />
          ))
        ) : (
          <>
            <FileText size={28} aria-hidden />
            <span>{a.textOnly}</span>
          </>
        )}
        {p.media.length > 1 && (
          <div role="group" aria-label={a.posts} className={cn(overlay, 'inset-x-0 bottom-2 mx-auto flex w-fit rounded-full bg-[#16191d]/38 px-1')}>
            {p.media.map((seed, i) => (
              <button key={seed} type="button" aria-label={a.photo(i + 1)} aria-pressed={i === shown} onClick={() => setShown(i)} className="grid size-[22px] cursor-pointer place-items-center pointer-coarse:size-8">
                <i className={cn('size-[7px] rounded-full', i === shown ? 'bg-[#f6f7f5]' : 'bg-white/55')} />
              </button>
            ))}
          </div>
        )}
        <span className={cn(overlay, 'bottom-2.5 left-2.5 grid gap-px rounded-[15px] px-[13px] pb-[9px] pt-2 leading-[1.15] shadow-[0_10px_24px_-12px_rgb(0_0_0/0.45)]', toneFill[when.tone])}>
          <small className="text-[12.5px] font-semibold opacity-82">{when.label}</small>
          <b className="text-base font-bold tracking-[-0.01em] tabular-nums">{a.slot(at, now)}</b>
        </span>
        <span className={cn(overlay, 'right-2.5 top-2.5 rounded-full bg-solid p-[3px]')}>
          <NetStack networks={p.networks} size="sm" />
        </span>
        {reviewable && (
          <label title={a.select(title)} className={cn(overlay, 'left-2.5 top-2.5 grid size-10 cursor-pointer place-items-center rounded-full bg-solid shadow-[0_6px_16px_-8px_rgb(0_0_0/0.4)] pointer-coarse:size-[46px]')}>
            <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)} aria-label={a.select(title)} className="size-[18px] cursor-pointer accent-[var(--text)]" />
          </label>
        )}
        {stamped && (
          <span aria-hidden className="absolute inset-0 z-[3] m-auto grid h-fit w-fit animate-stamp justify-items-center gap-0.5 rounded-[14px] border-4 border-double border-pine bg-[color-mix(in_srgb,var(--pine)_10%,var(--float))] px-[22px] pb-[9px] pt-2.5 text-pine dark:border-good dark:text-good">
            <span className="text-[clamp(34px,3.4vw,46px)] font-bold uppercase leading-none tracking-[0.1em]">{a.stamp}</span>
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 px-2 pb-1 pt-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 overflow-hidden text-2xs font-semibold">
            <BrandMark brand={brand} size="2xs" />
            <span className="truncate">{brand.name}</span>
          </span>
          <PostStatusPill status={p.status} size="md" className="flex-none" />
          <span className="ml-auto flex-none whitespace-nowrap text-2xs text-muted @max-[400px]:hidden">{sent ? a.sent(t.dates.ago(sent.at, now)) : t.dates.ago(p.createdAt, now)}</span>
        </div>
        <p className="line-clamp-4 text-sm leading-[1.5] [overflow-wrap:anywhere] max-mobile:line-clamp-5">{p.text}</p>
        <dl className="grid grid-cols-2 gap-2.5 rounded-2xl bg-well px-3 py-2.5 max-mobile:grid-cols-1">
          <div className="min-w-0">
            <dt className="mb-1 text-[12.5px] font-semibold text-muted">{a.writtenBy}</dt>
            <dd className="flex min-w-0 items-center gap-[7px] text-2xs font-semibold">
              {author && <Avatar src={author.avatar} name={author.name} size="menu" />}
              <span className="truncate">{author?.name}</span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="mb-1 text-[12.5px] font-semibold text-muted">{p.status === 'awaiting_approval' ? a.canApprove : a.approvers}</dt>
            <dd className="flex min-w-0 items-center gap-[7px] text-2xs font-semibold">
              {reviewers.length ? (
                <>
                  <span className="inline-flex flex-none">
                    {reviewers.slice(0, 4).map((m, i) => (
                      <Avatar key={m.id} src={m.avatar} name={m.name} size="menu" className={cn('shadow-[0_0_0_2px_var(--solid)]', i > 0 && '-ml-1.5')} />
                    ))}
                  </span>
                  <span className="truncate">{a.reviewers(names, reviewers.length)}</span>
                </>
              ) : (
                <span className="inline-flex items-center gap-[5px] text-bad">
                  <TriangleAlert size={16} aria-hidden />
                  {a.noOne}
                </span>
              )}
            </dd>
          </div>
        </dl>
        {steps.length > 0 && (
          <ol aria-label={a.history} className="relative grid gap-2.5 pl-0.5 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-[1.5px] before:bg-line-2">
            {earlier > 0 && <li className="pl-[34px] text-[12.5px] text-muted">{a.earlier(earlier)}</li>}
            {steps.map((r, i) => {
              const by = member(ws, r.by)
              return (
                <li key={i} className="relative flex items-start gap-2.5 text-2xs">
                  <Avatar src={by?.avatar} name={by?.name ?? ''} size="menu" className="shadow-[0_0_0_3px_var(--solid)]" />
                  <div className="min-w-0 flex-1">
                    <p>
                      <b className="font-bold">{by?.name.split(' ')[0]}</b> {a.did[r.decision]} <small className="ml-0.5 text-[12.5px] text-muted">{t.dates.ago(r.at, now)}</small>
                    </p>
                    {r.note && (
                      <q
                        className={cn(
                          'mt-1.5 block rounded-[4px_14px_14px] px-3 py-[9px] text-xs font-semibold text-text [quotes:none]',
                          r.decision === 'approved' ? 'bg-[color-mix(in_srgb,var(--pine)_14%,var(--glass-2))]' : r.decision === 'comment' ? 'bg-well font-medium' : 'bg-[color-mix(in_srgb,var(--coral)_14%,var(--glass-2))]',
                        )}
                      >
                        {r.note}
                      </q>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
        <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3 @max-[400px]:flex-nowrap @max-[400px]:gap-1.5">
          {p.status === 'awaiting_approval' &&
            (reviewable ? (
              <>
                <Button variant="pine" size="sm" icon={Check} onClick={onApprove} className="@max-[400px]:flex-1">
                  {a.approve}
                </Button>
                <Button variant="ghost" size="sm" icon={Undo2} onClick={onRequestChanges} aria-label={a.requestChanges} className="bg-glass-2 @max-[400px]:w-11 @max-[400px]:px-0 @max-[400px]:[&>span]:hidden">
                  <span>{a.requestChanges}</span>
                </Button>
              </>
            ) : (
              mine && (
                <Button variant="pine" size="sm" icon={Check} disabled title={a.ownPost}>
                  {a.approve}
                </Button>
              )
            ))}
          {p.status === 'changes_requested' && canEdit && (
            <Button size="sm" icon={PenLine} href={`#/compose/${p.id}`}>
              {a.fix}
            </Button>
          )}
          <span className="flex-1" />
          {mine && (p.status === 'awaiting_approval' || p.status === 'changes_requested') && <IconButton label={a.withdraw} icon={History} size="sm" onClick={onWithdraw} />}
          {canEdit && p.status !== 'changes_requested' && p.status !== 'published' && <IconButton label={a.edit} icon={PenLine} size="sm" href={`#/compose/${p.id}`} />}
          <IconButton label={a.open} icon={ArrowUpRight} size="sm" onClick={onOpen} />
        </footer>
      </div>
    </article>
  )
}
