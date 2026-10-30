import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Plus } from 'lucide-react'
import type { Brand, Campaign, Post } from '../../data/types'
import {
  dayKey,
  fmtAriaDay,
  fmtDayLong,
  fmtShortDate,
  fmtTimeShort,
  fromKey,
  isMovable,
  postsByDay,
  ribbons,
} from '../../data/calendar'
import { STATUS_META } from '../../data/selectors'
import { BrandMark, cn, toneFill } from '../ui'
import type { DragApi } from './WeekView'

interface MonthViewProps {
  days: Date[]
  anchor: Date
  posts: Post[]
  brands: Map<string, Brand>
  campaigns: Campaign[]
  selectedCampaign: string | null
  onToggleCampaign: (id: string) => void
  now: Date
  drag: DragApi
  landedId: string | null
  onOpen: (id: string) => void
  onGoWeek: (day: Date) => void
  onCreateAt: (day: Date) => void
}

const MAX_CHIPS = 3
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Six-week month grid (".cl-month") with campaign hairlines and up to three post chips a day. */
export function MonthView(props: MonthViewProps) {
  const { days, anchor, posts, brands, campaigns, selectedCampaign, onToggleCampaign } = props
  const byDay = postsByDay(posts)
  const weeks = Array.from({ length: days.length / 7 }, (_, w) => days.slice(w * 7, w * 7 + 7))
  const first = dayKey(days[0])
  const last = dayKey(days[days.length - 1])
  const legend = campaigns.filter((c) => c.start <= last && c.end >= first)

  return (
    <div>
      {legend.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {legend.map((c) => {
            const brand = brands.get(c.brandId)!
            const pressed = selectedCampaign === c.id
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={pressed}
                onClick={() => onToggleCampaign(c.id)}
                className={cn(
                  'inline-flex h-[34px] cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-full border px-[13px] text-2xs font-semibold transition-[background-color,opacity]',
                  pressed ? 'border-transparent bg-pill text-on-pill' : 'border-line bg-glass-2 hover:bg-glass-3',
                  selectedCampaign && !pressed && 'opacity-50',
                )}
              >
                <i className={cn('size-2 rounded-full', toneFill[brand.tone])} />
                {c.name}
                <small className={cn('text-[12.5px]', pressed ? 'text-inherit opacity-72' : 'text-muted')}>
                  {fmtShortDate(fromKey(c.start))} – {fmtShortDate(fromKey(c.end))}
                </small>
              </button>
            )
          })}
        </div>
      )}

      <div className="relative grid gap-1.5">
        <div aria-hidden className="grid grid-cols-7 gap-1.5 px-2.5 text-[12.5px] font-bold uppercase tracking-[0.05em] text-muted">
          {DOW.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        {weeks.map((week) => (
          <MonthRow key={dayKey(week[0])} {...props} week={week} byDay={byDay} month={anchor.getUTCMonth()} />
        ))}
      </div>
    </div>
  )
}

interface MonthRowProps extends MonthViewProps {
  week: Date[]
  byDay: Map<string, Post[]>
  month: number
}

function MonthRow({ week, byDay, month, campaigns, brands, selectedCampaign, now, drag, landedId, onOpen, onGoWeek, onCreateAt }: MonthRowProps) {
  const ribs = ribbons(campaigns, week[0], 7)
  const today = dayKey(now)
  return (
    <div className="relative grid grid-cols-7 gap-1.5">
      {week.map((d) => {
        const k = dayKey(d)
        const dayPosts = byDay.get(k) ?? []
        const out = d.getUTCMonth() !== month
        const past = k < today
        const isDrop = drag.target?.kind === 'month' && drag.target.day === k
        return (
          <div
            key={k}
            data-drop-day={k}
            data-drop-kind="month"
            className={cn(
              'group relative flex min-h-[134px] min-w-0 flex-col gap-1 rounded-2xl border px-1.5 pb-[7px] pt-1.5 transition-colors duration-500 max-[900px]:min-h-[112px]',
              isDrop
                ? drag.target!.ok
                  ? 'border-[1.5px] border-dashed border-text bg-[color-mix(in_srgb,var(--butter)_45%,var(--glass-2))]'
                  : 'border-[1.5px] border-dashed border-bad bg-[color-mix(in_srgb,var(--coral)_14%,var(--glass-2))]'
                : out
                  ? 'border-line bg-transparent'
                  : past
                    ? 'border-transparent bg-well'
                    : 'border-rim bg-glass-2',
            )}
          >
            <div className="flex h-7 shrink-0 items-center gap-1.5" style={{ marginBottom: ribs.length * 8 }}>
              <button
                type="button"
                aria-label={`Open the week of ${fmtAriaDay(d)}`}
                onClick={() => onGoWeek(d)}
                className={cn(
                  'grid h-7 min-w-7 cursor-pointer place-items-center rounded-full px-1 text-2xs font-bold tabular-nums',
                  k === today ? 'bg-pill text-on-pill' : cn('hover:bg-well', out && 'text-faint'),
                )}
              >
                {d.getUTCDate()}
              </button>
              {dayPosts.length > 0 && <small className="text-[12.5px] font-semibold text-muted">{dayPosts.length}</small>}
              {!past && (
                <button
                  type="button"
                  aria-label={`New post on ${fmtAriaDay(d)}`}
                  onClick={() => onCreateAt(d)}
                  className="ml-auto grid size-[26px] shrink-0 cursor-pointer place-items-center rounded-full bg-pill text-on-pill opacity-0 transition-opacity duration-200 ease-soft group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:hidden"
                >
                  <Plus size={14} aria-hidden />
                </button>
              )}
            </div>
            <div className="grid min-w-0 gap-[3px]">
              {dayPosts.slice(0, MAX_CHIPS).map((p) => (
                <MonthChip
                  key={p.id}
                  post={p}
                  brand={brands.get(p.brandId)!}
                  lifted={drag.dragId === p.id}
                  landed={landedId === p.id}
                  onPointerDown={(e) => isMovable(p) && drag.onPointerDown(e, p.id)}
                  onClick={() => !drag.wasDragged() && onOpen(p.id)}
                />
              ))}
              {dayPosts.length > MAX_CHIPS && <MoreButton day={d} posts={dayPosts} brands={brands} onOpen={onOpen} />}
            </div>
          </div>
        )
      })}

      {ribs.length > 0 && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[39px] z-[1] grid auto-rows-[5px] grid-cols-7 gap-x-1.5 gap-y-[3px]">
          {ribs.map((r) => (
            <span
              key={r.campaign.id}
              title={r.campaign.name}
              className={cn(
                'mx-2 rounded-[3px] transition-opacity',
                toneFill[brands.get(r.campaign.brandId)!.tone],
                r.openLeft && 'ml-0 rounded-l-none',
                r.openRight && 'mr-0 rounded-r-none',
                selectedCampaign && selectedCampaign !== r.campaign.id && 'opacity-28',
              )}
              style={{ gridRow: r.row + 1, gridColumn: `${r.from + 1} / ${r.to + 1}` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface MonthChipProps {
  post: Post
  brand: Brand
  lifted: boolean
  landed: boolean
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  onClick: () => void
}

function MonthChip({ post, brand, lifted, landed, onPointerDown, onClick }: MonthChipProps) {
  const when = new Date(post.scheduledAt)
  const draft = post.status === 'draft'
  return (
    <button
      type="button"
      data-drag-id={post.id}
      aria-label={`${brand.name}, ${STATUS_META[post.status].label}, ${fmtDayLong(when)}: ${post.text}`}
      onPointerDown={onPointerDown}
      onClick={onClick}
      className={cn(
        'relative flex h-6 min-w-0 touch-none select-none items-center gap-[5px] whitespace-nowrap rounded-lg px-[7px] text-left text-[12.5px] font-semibold hover:brightness-106',
        draft ? 'bg-glass-3 text-text shadow-[inset_0_0_0_1.5px_var(--line-2)] dark:bg-[#24272b]' : toneFill[STATUS_META[post.status].tone],
        isMovable(post) ? 'cursor-grab' : 'cursor-pointer',
        lifted && 'opacity-28',
        landed && 'animate-land',
      )}
    >
      <b data-time className="shrink-0 font-bold tabular-nums max-[900px]:hidden">
        {fmtTimeShort(when)}
      </b>
      <span className="min-w-0 truncate opacity-92">{post.text}</span>
    </button>
  )
}

/** "+N more" opens a small list of the whole day (".cl-morelist"). */
function MoreButton({ day, posts, brands, onOpen }: { day: Date; posts: Post[]; brands: Map<string, Brand>; onOpen: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="block h-[22px] w-full cursor-pointer rounded-[7px] px-[7px] text-left text-[12.5px] font-bold text-muted hover:bg-well hover:text-text"
      >
        +{posts.length - MAX_CHIPS} more
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 grid w-[270px] animate-rise gap-0.5 rounded-[18px] border border-line bg-float p-2 shadow-pop">
          <b className="px-2 pb-1 pt-0.5 text-2xs font-bold text-muted">{fmtAriaDay(day)}</b>
          {posts.map((p) => {
            const brand = brands.get(p.brandId)!
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setOpen(false)
                  onOpen(p.id)
                }}
                className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl px-2 text-left hover:bg-well"
              >
                <BrandMark brand={brand} size="xs" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-xs font-semibold">{p.text}</b>
                  <small className="block text-[12.5px] text-muted">
                    {fmtTimeShort(new Date(p.scheduledAt))} · {STATUS_META[p.status].label}
                  </small>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
