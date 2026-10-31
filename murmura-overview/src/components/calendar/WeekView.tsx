import { useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Flag, Plus, TriangleAlert } from 'lucide-react'
import type { Brand, Campaign, Post } from '../../data/types'
import {
  DAY_HOURS,
  DAY_START,
  HOUR_PX,
  SNAP_MIN,
  atMinutes,
  dayKey,
  fromKey,
  isLive,
  isMovable,
  layoutLanes,
  postsByDay,
  ribbons,
  rowOf,
  startOfDay,
  statusGroup,
} from '../../data/calendar'
import { STATUS_TONE } from '../../data/selectors'
import { useI18n } from '../../i18n'
import { coverPhoto } from '../../data/assets'
import { BrandMark, NetStack, cn, toneFill } from '../ui'
import type { DropTarget } from './useCalendarDrag'

export interface DragApi {
  dragId: string | null
  target: DropTarget | null
  onPointerDown: (e: ReactPointerEvent<HTMLElement>, id: string) => void
  wasDragged: () => boolean
}

interface WeekViewProps {
  days: Date[]
  posts: Post[]
  allPosts: Post[]
  brands: Map<string, Brand>
  campaigns: Campaign[]
  selectedCampaign: string | null
  onToggleCampaign: (id: string) => void
  now: Date
  heat: boolean
  bestTimes: number[][]
  drag: DragApi
  landedId: string | null
  onOpen: (id: string) => void
  onKeyMove: (id: string, deltaMinutes: number) => void
  onCreateAt: (when: Date) => void
}

const KEY_STEP: Record<string, number> = { ArrowUp: -SNAP_MIN, ArrowDown: SNAP_MIN, ArrowLeft: -1440, ArrowRight: 1440 }

/**
 * Week grid (".cl-wk"): sticky day header with campaign ribbons, sticky hour
 * gutter, one column per day with 18 hour slots, posts as absolutely placed
 * tiles. Scrolls inside itself, opening on the current time.
 */
export function WeekView(props: WeekViewProps) {
  const { days, posts, allPosts, brands, campaigns, selectedCampaign, now } = props
  const { t } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ day: string; minutes: number } | null>(null)
  const byDay = postsByDay(posts)
  const today = dayKey(now)
  const ribs = ribbons(campaigns, days[0], 7)
  const weekKey = dayKey(days[0])
  const nowRow = rowOf(now)

  // Open on "now" (three hours of context above it), or on the first post of other weeks.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const inWeek = days.some((d) => dayKey(d) === today)
    const first = posts.map((p) => rowOf(new Date(p.scheduledAt))).sort((a, b) => a - b)[0]
    const row = inWeek ? nowRow - 3 : (first ?? 2) - 0.5
    el.scrollTop = Math.max(0, row * HOUR_PX)
    // Only when the visible week changes; posts moving must not yank the scroll.
  }, [weekKey])

  const gridCols = '[grid-template-columns:var(--gut)_repeat(7,minmax(var(--colw),1fr))] min-w-[calc(var(--gut)+7*var(--colw)+50px)]'

  return (
    <div
      ref={scrollRef}
      data-drag-scroll
      tabIndex={-1}
      className="relative max-h-[clamp(480px,calc(100dvh-200px),1040px)] overflow-auto overscroll-contain rounded-[20px] border border-line bg-solid outline-none [--colw:100px] [--gut:56px] [scrollbar-width:thin] max-[1100px]:[--colw:86px] max-[1100px]:[--gut:50px] max-[900px]:[--colw:74px] max-[900px]:[--gut:48px]"
    >
      {/* Day header + campaign ribbons */}
      <div data-week-head className={cn('sticky top-0 z-[6] grid gap-x-1.5 border-b border-line bg-solid py-2 pr-2', gridCols)}>
        <span aria-hidden className="sticky left-0 z-[2] row-start-1 bg-solid" />
        {days.map((d) => {
          const k = dayKey(d)
          const count = byDay.get(k)?.length ?? 0
          const past = k < today
          const gap = !past && !allPosts.some((p) => p.scheduledAt.startsWith(k) && isLive(p.status))
          return (
            <div key={k} className="row-start-1 grid min-w-0 justify-items-center gap-px py-0.5 text-center">
              <small className={cn('text-[12.5px] font-bold uppercase tracking-[0.05em]', past ? 'text-faint' : 'text-muted')}>{t.dates.weekdayHead(d)}</small>
              <b
                className={cn(
                  'grid size-[34px] place-items-center rounded-full text-base font-bold tabular-nums',
                  k === today ? 'bg-pill text-on-pill' : past && 'text-faint',
                )}
              >
                {d.getUTCDate()}
              </b>
              <span
                className="inline-flex items-center gap-[5px] whitespace-nowrap text-[12.5px] font-semibold text-muted"
                title={gap ? t.calendar.nothingScheduled : undefined}
              >
                {gap && <i aria-hidden className="size-1.5 rounded-full bg-coral" />}
                {count === 0 ? t.calendar.free : t.common.post(count)}
              </span>
            </div>
          )
        })}

        {ribs.length > 0 && (
          <div className="col-span-full mt-2 grid auto-rows-[24px] grid-cols-subgrid gap-y-1">
            <span
              title={t.calendar.campaigns}
              className="sticky left-0 z-[1] col-start-1 flex items-center justify-end bg-solid pr-2 text-faint"
              style={{ gridRow: `1 / span ${ribs.length}` }}
            >
              <Flag size={17} aria-hidden />
              <span className="sr-only">{t.calendar.campaigns}</span>
            </span>
            {ribs.map((r) => {
              const brand = brands.get(r.campaign.brandId)!
              const pressed = selectedCampaign === r.campaign.id
              return (
                <button
                  key={r.campaign.id}
                  type="button"
                  aria-pressed={pressed}
                  title={`${r.campaign.name} · ${t.dates.monthDay(fromKey(r.campaign.start))} – ${t.dates.monthDay(fromKey(r.campaign.end))}`}
                  onClick={() => props.onToggleCampaign(r.campaign.id)}
                  className={cn(
                    '@container mx-[3px] flex h-6 min-w-0 cursor-pointer items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full pl-[3px] pr-[9px] text-left text-[12.5px] font-bold transition-opacity',
                    toneFill[brand.tone],
                    r.openLeft && 'ml-0 rounded-l-[5px]',
                    r.openRight && 'mr-0 rounded-r-[5px]',
                    selectedCampaign && !pressed && 'opacity-35',
                    pressed && 'shadow-[inset_0_0_0_2px_color-mix(in_srgb,currentColor_60%,transparent)]',
                  )}
                  style={{ gridRow: r.row + 1, gridColumn: `${r.from + 2} / ${r.to + 2}` }}
                >
                  <span aria-hidden className="grid size-[18px] shrink-0 place-items-center rounded-md bg-[color-mix(in_srgb,currentColor_22%,transparent)] text-[9px]">
                    {brand.initials}
                  </span>
                  <span className="min-w-0 truncate">{r.campaign.name}</span>
                  <small className="ml-auto shrink-0 pl-2 text-[12.5px] font-semibold opacity-78 @max-[210px]:hidden">
                    {t.calendar.until(t.dates.monthDay(fromKey(r.campaign.end)))}
                  </small>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Hours + day columns */}
      <div className={cn('relative grid gap-x-1.5 pb-2.5 pr-2 pt-3', gridCols)}>
        <div aria-hidden className="sticky left-0 z-[4] grid auto-rows-[72px] bg-solid">
          {Array.from({ length: DAY_HOURS }, (_, h) => (
            <span key={h} className="-mt-[9px] whitespace-nowrap pr-2 text-right text-[12.5px] font-semibold text-muted">
              {t.dates.hour(DAY_START + h)}
            </span>
          ))}
          {days.some((d) => dayKey(d) === today) && nowRow >= 0 && nowRow < DAY_HOURS && (
            <b
              className="absolute right-[3px] rounded-full bg-coral px-1.5 py-px text-[12.5px] font-bold leading-[18px] text-on-coral tabular-nums"
              style={{ top: nowRow * HOUR_PX - 10 }}
            >
              {t.dates.compactTime(now, true)}
            </b>
          )}
        </div>

        {days.map((d, ci) => (
          <DayColumn key={dayKey(d)} {...props} day={d} ci={ci} dayPosts={byDay.get(dayKey(d)) ?? []} hover={hover} setHover={setHover} />
        ))}
      </div>
    </div>
  )
}

interface DayColumnProps extends WeekViewProps {
  day: Date
  ci: number
  dayPosts: Post[]
  hover: { day: string; minutes: number } | null
  setHover: (h: { day: string; minutes: number } | null) => void
}

function DayColumn({ day, ci, dayPosts, hover, setHover, now, heat, bestTimes, drag, brands, landedId, onOpen, onKeyMove, onCreateAt }: DayColumnProps) {
  const { t } = useI18n()
  const k = dayKey(day)
  const today = dayKey(now)
  const past = k < today
  const isToday = k === today
  const lanes = layoutLanes(dayPosts)
  const weekday = (day.getUTCDay() + 6) % 7
  const nowRow = rowOf(now)
  const ghost = hover?.day === k && !drag.dragId ? hover : null
  const drop = drag.target?.kind === 'week' && drag.target.day === k ? drag.target : null

  const slotAt = (e: ReactPointerEvent<HTMLElement>) => {
    const top = e.currentTarget.getBoundingClientRect().top
    const minutes = DAY_START * 60 + Math.floor(((e.clientY - top) / HOUR_PX) * (60 / SNAP_MIN)) * SNAP_MIN
    return Math.min(minutes, (DAY_START + DAY_HOURS) * 60 - SNAP_MIN)
  }

  return (
    <div
      data-drop-day={k}
      data-drop-kind="week"
      className={cn(
        'relative grid min-w-0 auto-rows-[72px] rounded-2xl border transition-colors duration-500',
        isToday
          ? 'border-[color-mix(in_srgb,var(--sea)_34%,transparent)] bg-[color-mix(in_srgb,var(--sea)_8%,var(--glass-2))]'
          : past
            ? 'border-transparent bg-well'
            : 'cursor-copy border-line bg-glass-2 dark:bg-white/4',
      )}
      onPointerMove={(e) => {
        if (past || drag.dragId || (e.target as HTMLElement).closest('[data-tile]')) return setHover(null)
        const minutes = slotAt(e)
        setHover(atMinutes(day, minutes) > now ? { day: k, minutes } : null)
      }}
      onPointerLeave={() => setHover(null)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-tile]') || !ghost) return
        onCreateAt(atMinutes(day, ghost.minutes))
      }}
    >
      {bestTimes[weekday].map((v, hi) => (
        <span
          key={hi}
          className="relative border-t border-dashed border-line first:rounded-t-[15px] first:border-t-0 last:rounded-b-[15px]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-lilac transition-opacity duration-500"
            style={{ opacity: heat ? `calc(${v} * var(--heat-k))` : 0, transitionDelay: `${ci * 40 + hi * 10}ms` }}
          />
          {v >= 0.9 && (
            <i
              className="pointer-events-none absolute right-[5px] top-[5px] rounded-full bg-lilac px-[7px] text-[12.5px] font-bold not-italic leading-[19px] text-on-lilac transition-opacity delay-300 duration-400"
              style={{ opacity: heat ? 1 : 0 }}
            >
              {t.calendar.peak}
            </i>
          )}
        </span>
      ))}

      {dayPosts.map((p) => (
        <Tile
          key={p.id}
          post={p}
          brand={brands.get(p.brandId)!}
          lane={lanes.get(p.id) ?? { lane: 0, lanes: 1 }}
          lifted={drag.dragId === p.id}
          landed={landedId === p.id}
          onPointerDown={(e) => isMovable(p) && drag.onPointerDown(e, p.id)}
          onClick={() => !drag.wasDragged() && onOpen(p.id)}
          onKeyDown={(e) => {
            if (!e.altKey || !(e.key in KEY_STEP) || !isMovable(p)) return
            e.preventDefault()
            onKeyMove(p.id, KEY_STEP[e.key])
          }}
        />
      ))}

      {isToday && nowRow >= 0 && nowRow < DAY_HOURS && (
        <div aria-hidden className="pointer-events-none absolute -left-[5px] -right-px z-[3] -mt-px h-0.5 rounded-sm bg-coral" style={{ top: nowRow * HOUR_PX }}>
          <i className="absolute -left-0.5 -top-[5px] size-3 rounded-full bg-coral shadow-[0_0_0_3px_var(--solid)] after:absolute after:inset-0 after:animate-pulse-ring after:rounded-full after:bg-coral" />
        </div>
      )}

      {ghost && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-[3px] z-[1] flex items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-[11px] border-[1.5px] border-dashed border-line-2 bg-glass-3 px-[9px] text-[12.5px] font-bold text-muted dark:bg-[#24272b]"
          style={{ top: ((ghost.minutes - DAY_START * 60) / 60) * HOUR_PX + 2, height: HOUR_PX / 2 - 4 }}
        >
          <Plus size={15} className="shrink-0 text-text" />
          {t.dates.time(atMinutes(day, ghost.minutes))}
        </span>
      )}

      {drop && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-0.5 z-[4] rounded-[14px] border-2 border-dashed',
            drop.ok ? 'border-text bg-[color-mix(in_srgb,var(--butter)_42%,transparent)]' : 'border-bad bg-[color-mix(in_srgb,var(--coral)_16%,transparent)]',
          )}
          style={{ top: ((drop.minutes - DAY_START * 60) / 60) * HOUR_PX + 2, height: HOUR_PX - 4 }}
        >
          <span
            className={cn(
              'absolute -bottom-[13px] left-1 whitespace-nowrap rounded-full px-[9px] py-0.5 text-[12.5px] font-bold shadow-pop',
              drop.ok ? 'bg-pill text-on-pill' : 'bg-coral text-on-coral',
            )}
          >
            {t.dates.weekday(day)} · {t.dates.time(atMinutes(startOfDay(day), drop.minutes))}
          </span>
        </div>
      )}
    </div>
  )
}

interface TileProps {
  post: Post
  brand: Brand
  lane: { lane: number; lanes: number }
  lifted: boolean
  landed: boolean
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  onClick: () => void
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
}

/** A post on the week grid (".cl-tile"); its contents shed detail as the lane narrows. */
function Tile({ post, brand, lane, lifted, landed, onPointerDown, onClick, onKeyDown }: TileProps) {
  const { t } = useI18n()
  const when = new Date(post.scheduledAt)
  const draft = post.status === 'draft'
  const failed = statusGroup(post.status) === 'failed'
  const extra = post.networks.length - 3
  const movable = isMovable(post)
  const thumbPad = post.media.length ? 'pr-7 @max-[92px]:pr-0' : ''
  return (
    <button
      type="button"
      data-tile
      data-drag-id={post.id}
      aria-label={t.calendar.tile(brand.name, t.status[post.status], `${t.dates.dayLong(when)} ${t.dates.time(when)}`, post.text, movable)}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        '@container absolute z-[1] flex touch-none select-none gap-1.5 overflow-hidden rounded-[14px] py-1.5 pl-2 pr-1.5 text-left hover:z-[2] focus-visible:z-[3] focus-visible:outline-offset-1',
        draft
          ? 'bg-glass-3 text-text outline-[1.5px] -outline-offset-[1.5px] outline-dashed outline-line-2 dark:bg-[#24272b]'
          : cn(toneFill[STATUS_TONE[post.status]], 'shadow-[0_10px_18px_-14px_rgb(0_0_0/0.6)] hover:shadow-[0_14px_24px_-14px_rgb(0_0_0/0.7)]'),
        movable ? 'cursor-grab' : 'cursor-pointer',
        lifted && 'opacity-28',
        landed && 'animate-land',
      )}
      style={{
        top: rowOf(when) * HOUR_PX + 2,
        height: HOUR_PX - 4,
        left: `calc(3px + (100% - 6px) * ${lane.lane} / ${lane.lanes})`,
        width: `calc((100% - 6px) / ${lane.lanes} - 3px)`,
      }}
    >
      <span className="grid min-w-0 flex-1 content-start gap-0.5">
        <span className={cn('flex min-w-0 items-center gap-[5px] whitespace-nowrap text-[12.5px] font-bold leading-[1.25] tabular-nums', thumbPad)}>
          <span data-time className="truncate">
            {t.dates.time(when)}
          </span>
          {failed && <TriangleAlert size={15} className="shrink-0" aria-hidden />}
        </span>
        <span className={cn('truncate text-2xs font-semibold leading-[1.25] opacity-92 @max-[58px]:hidden', thumbPad)}>{post.text}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-[5px]">
          <BrandMark brand={brand} size="2xs" className="shadow-[0_0_0_1.5px_color-mix(in_srgb,currentColor_34%,transparent)]" />
          <span className="flex @max-[84px]:hidden">
            <NetStack networks={post.networks.slice(0, 3)} size="2xs" />
          </span>
          {extra > 0 && <small className="text-[12.5px] font-bold opacity-80 @max-[84px]:hidden">+{extra}</small>}
        </span>
      </span>
      {post.media.length > 0 && (
        <span className="absolute right-1.5 top-1.5 size-[26px] overflow-hidden rounded-lg shadow-[0_0_0_1.5px_color-mix(in_srgb,currentColor_30%,transparent)] @max-[92px]:hidden">
          <img src={coverPhoto(post, 96)} alt="" loading="lazy" decoding="async" draggable={false} className="size-full object-cover" />
        </span>
      )}
    </button>
  )
}
