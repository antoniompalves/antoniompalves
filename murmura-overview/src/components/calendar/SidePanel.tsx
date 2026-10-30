import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import type { Brand, Post, TeamMember } from '../../data/types'
import {
  addMonths,
  dayKey,
  fmtAriaDay,
  fmtDayLong,
  fmtMonthYear,
  fmtTime,
  monthGrid,
  networkCounts,
  startOfMonth,
} from '../../data/calendar'
import { NETWORK_LABEL } from '../../data/selectors'
import { Badge, BrandMark, Card, IconButton, NetIcon, cn } from '../ui'
import type { DragApi } from './WeekView'

/* ───────────────────────── mini calendar ───────────────────────── */

interface MiniCalendarProps {
  anchor: Date
  now: Date
  /** Inclusive YYYY-MM-DD range currently shown by the main view. */
  range: [string, string] | null
  counts: Map<string, number>
  onPick: (day: Date) => void
}

/** "Jump to a date" (".cl-mini"): month grid with post-density dots and the visible range shaded. */
export function MiniCalendar({ anchor, now, range, counts, onPick }: MiniCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(anchor))
  useEffect(() => setMonth(startOfMonth(anchor)), [anchor])
  const today = dayKey(now)

  return (
    <section aria-labelledby="cl-mini-t" className="relative min-w-0 rounded-card border border-rim bg-glass p-[18px] shadow-card max-desk:hidden">
      <h2 id="cl-mini-t" className="sr-only">
        Jump to a date
      </h2>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <b className="text-base font-bold tracking-[-0.01em]">{fmtMonthYear(month)}</b>
        <span className="flex gap-1.5">
          <IconButton size="sm" label="Previous month" icon={ChevronLeft} onClick={() => setMonth(addMonths(month, -1))} />
          <IconButton size="sm" label="Next month" icon={ChevronRight} onClick={() => setMonth(addMonths(month, 1))} />
        </span>
      </div>
      <div aria-hidden className="grid grid-cols-7">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="pb-1 text-center text-[12.5px] font-bold text-faint">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-[3px]">
        {monthGrid(month).map((d) => {
          const k = dayKey(d)
          const n = counts.get(k) ?? 0
          const inRange = range && k >= range[0] && k <= range[1]
          return (
            <button
              key={k}
              type="button"
              aria-label={`${fmtAriaDay(d)}, ${n} posts`}
              onClick={() => onPick(d)}
              className={cn(
                'group relative grid h-9 cursor-pointer place-items-center text-2xs font-semibold tabular-nums',
                d.getUTCMonth() !== month.getUTCMonth() && 'text-faint',
                inRange && 'bg-[color-mix(in_srgb,var(--sea)_13%,transparent)]',
                // Each shaded week reads as its own pill: round at range ends and at Mon/Sun.
                inRange && (k === range[0] || d.getUTCDay() === 1) && 'rounded-l-full',
                inRange && (k === range[1] || d.getUTCDay() === 0) && 'rounded-r-full',
              )}
            >
              <span className={cn('grid size-[30px] place-items-center rounded-full', k === today ? 'bg-pill text-on-pill' : 'group-hover:bg-well')}>
                {d.getUTCDate()}
              </span>
              {n > 0 && (
                <i
                  className="absolute inset-x-0 bottom-px mx-auto size-1 rounded-full bg-sea dark:bg-[#7ab8e8]"
                  style={{ opacity: 0.3 + Math.min(3, n) * 0.23 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

/* ───────────────────────── unscheduled drafts ───────────────────────── */

interface DraftsCardProps {
  drafts: Post[]
  brands: Map<string, Brand>
  team: Map<string, TeamMember>
  drag: DragApi
  onOpen: (id: string) => void
}

export function DraftsCard({ drafts, brands, team, drag, onOpen }: DraftsCardProps) {
  return (
    <Card
      title="Unscheduled drafts"
      sub="Drag one onto the calendar to give it a time"
      tools={<Badge tone="plain">{drafts.length}</Badge>}
      pad="p-[18px]"
    >
      {drafts.length === 0 ? (
        <p className="px-2 py-[18px] text-center text-xs text-muted">No drafts waiting for a slot.</p>
      ) : (
        <ul className="grid gap-1.5">
          {drafts.map((p) => {
            const when = new Date(p.scheduledAt)
            return (
              <li key={p.id}>
                <button
                  type="button"
                  data-drag-id={p.id}
                  aria-label={`Draft: ${p.text}. Drag onto the calendar`}
                  onPointerDown={(e) => drag.onPointerDown(e, p.id)}
                  onClick={() => !drag.wasDragged() && onOpen(p.id)}
                  className={cn(
                    'grid w-full cursor-grab touch-none select-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-line-2 bg-glass-2 py-[9px] pl-2.5 pr-2 text-left transition-colors hover:bg-glass-3 dark:hover:bg-white/11',
                    drag.dragId === p.id && 'opacity-28',
                  )}
                >
                  <BrandMark brand={brands.get(p.brandId)!} size="sm" />
                  <span className="min-w-0">
                    <b className="block truncate text-xs font-semibold max-mobile:text-sm">{p.text}</b>
                    <small className="mt-0.5 block truncate text-[12.5px] text-muted">
                      {team.get(p.authorId)?.name.split(' ')[0]} · pencilled {fmtDayLong(when)}, <span data-time>{fmtTime(when)}</span>
                    </small>
                  </span>
                  <span aria-hidden className="grid w-7 place-items-center text-faint">
                    <GripVertical size={18} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/* ───────────────────────── this week by network ───────────────────────── */

export function NetworkCard({ posts, period }: { posts: Post[]; period: string }) {
  const rows = networkCounts(posts)
  const max = rows[0]?.count ?? 1
  return (
    <Card title="This week by network" sub={`${period} · ${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`} pad="p-[18px]">
      {rows.length === 0 ? (
        <p className="px-1.5 py-3.5 text-center text-xs text-muted">Nothing goes out this week.</p>
      ) : (
        <ul className="grid gap-2.5">
          {rows.map(({ network, count }) => (
            <li key={network} className="grid grid-cols-[auto_84px_minmax(0,1fr)_26px] items-center gap-2.5 text-xs font-semibold max-mobile:text-sm">
              <NetIcon network={network} size="sm" />
              <span className="truncate">{NETWORK_LABEL[network]}</span>
              <span className="block h-2 overflow-hidden rounded-full bg-well">
                <span
                  className="block h-full origin-left rounded-full transition-transform duration-700 ease-soft"
                  style={{ background: `var(--n-${network})`, transform: `scaleX(${count / max})` }}
                />
              </span>
              <b className="text-right font-bold tabular-nums">{count}</b>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
