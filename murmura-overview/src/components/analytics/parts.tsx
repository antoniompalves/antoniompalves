import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { useI18n } from '../../i18n'
import { IconButton, LegendDot, cn } from '../ui'
import type { ChartTone } from './PeriodChart'

/* Building blocks shared by the analytics cards (social and websites). */

/* ───────────────────────── card shell ───────────────────────── */

export interface AnCardProps {
  id: string
  area: string
  title: string
  tools?: ReactNode
  /** On phones the tools and the Expand button drop under the title (the ranking toggles). */
  wrapTools?: boolean
  expanded: boolean
  onToggle: () => void
  /** Placement in the page grid (align-self) while the card sits in it. */
  className?: string
  children: ReactNode
}

/**
 * A grid card with the reference's "Expand" button: the card lifts out over a
 * scrim, centred and up to 1165px wide, leaving a dashed outline in its place.
 */
export function AnCard({ id, area, title, tools, wrapTools, expanded, onToggle, className, children }: AnCardProps) {
  const { t } = useI18n()
  const ref = useRef<HTMLElement>(null)
  const [height, setHeight] = useState(0)
  const titleId = `an-${id}-t`

  const toggle = () => {
    if (!expanded) setHeight(ref.current?.offsetHeight ?? 0)
    onToggle()
  }

  return (
    <>
      {expanded && <div aria-hidden className="rounded-card border-2 border-dashed border-line-2" style={{ gridArea: area, height }} />}
      <section
        ref={ref}
        aria-labelledby={titleId}
        style={expanded ? undefined : { gridArea: area }}
        className={cn(
          'flex min-w-0 flex-col rounded-card border border-rim p-5 max-mobile:p-4',
          expanded
            ? 'fixed inset-x-0 top-[8vh] z-[60] mx-auto max-h-[84vh] w-[min(1165px,92%)] animate-rise overflow-y-auto overscroll-contain bg-solid shadow-pop max-mobile:inset-x-2.5 max-mobile:top-2.5 max-mobile:max-h-[calc(100dvh-20px)] max-mobile:w-auto'
            : cn('relative bg-glass shadow-card', className),
        )}
      >
        <header className={cn('mb-3.5 flex min-h-[42px] items-center justify-between gap-3', wrapTools && 'max-mobile:min-h-0 max-mobile:flex-wrap')}>
          <h2 id={titleId} className="text-base font-semibold tracking-[-0.005em]">
            {title}
          </h2>
          <div
            className={cn(
              'flex items-center gap-2',
              wrapTools && 'max-mobile:order-2 max-mobile:w-full max-mobile:[&>[role=group]]:flex max-mobile:[&>[role=group]]:min-w-0 max-mobile:[&>[role=group]]:flex-1 max-mobile:[&_[role=group]>button]:flex-1 max-mobile:[&_[role=group]>button]:px-1.5',
            )}
          >
            {tools}
            <IconButton label={expanded ? t.analytics.collapse : t.analytics.expand} icon={ArrowUpRight} aria-expanded={expanded} onClick={toggle} />
          </div>
        </header>
        {children}
      </section>
    </>
  )
}

/* ───────────────────────── small parts ───────────────────────── */

/** Big figure with its caption on the same baseline (".an-fig"). */
export function Figure({ value, children }: { value: string; children: ReactNode }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <b className="text-[clamp(28px,2.5vw,36px)] font-semibold leading-[1.05] tracking-[-0.03em] tabular-nums">{value}</b>
      {children}
    </p>
  )
}

export function Legend({ tone, label, previous }: { tone: ChartTone; label: string; previous: string }) {
  return (
    <div className="mb-1.5 mt-3 flex flex-wrap gap-x-4 gap-y-2 text-2xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <LegendDot tone={tone} />
        {label}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i aria-hidden className="h-0 w-4 border-t-2 border-dashed border-faint" />
        {previous}
      </span>
    </div>
  )
}

export function Empty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="grid justify-items-center gap-1.5 px-2 py-[26px] text-center">
      <span className="mb-1 grid size-12 place-items-center rounded-full bg-well text-muted">
        <Icon size={22} aria-hidden />
      </span>
      <b className="text-sm font-semibold">{title}</b>
      <p className="max-w-[320px] text-2xs text-muted">{text}</p>
    </div>
  )
}

/* ───────────────────────── sortable tables ───────────────────────── */

export type Sort<K extends string> = { key: K; dir: 1 | -1 }

/** Body cell: right-aligned figures on desktop, a labelled block in the phone card layout. */
export const TD = 'px-3 py-2.5 text-right tabular-nums max-mobile:p-0 max-mobile:text-left max-mobile:text-sm'
/** The label each cell shows above its value on phones (the header row is hidden there). */
export const CELL_LABEL = 'hidden max-mobile:mb-px max-mobile:block max-mobile:text-[12.5px] max-mobile:font-semibold max-mobile:text-muted'

/**
 * Column header that sorts (".an-table th button"): first click sorts names
 * A→Z and figures high→low, the next one flips; the chevron shows on hover.
 */
export function SortHeader<K extends string>({
  label,
  column,
  right,
  sort,
  onSort,
  textColumn = 'name' as K,
}: {
  label: string
  column: K
  right?: boolean
  sort: Sort<K>
  onSort: (s: Sort<K>) => void
  /** The column that sorts A→Z first. */
  textColumn?: K
}) {
  const active = sort.key === column
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
      className={cn('group whitespace-nowrap border-b border-line px-3 py-2.5 text-2xs font-semibold text-muted', right ? 'text-right' : 'text-left')}
    >
      <button
        type="button"
        onClick={() => onSort(active ? { key: column, dir: sort.dir === 1 ? -1 : 1 } : { key: column, dir: column === textColumn ? 1 : -1 })}
        className={cn('inline-flex cursor-pointer items-center gap-1.5 py-1 font-semibold', right && 'ml-auto flex-row-reverse', active && 'text-text')}
      >
        {label}
        <ChevronDown
          size={14}
          aria-hidden
          className={cn('transition-[opacity,transform] duration-300 ease-soft', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-45', active && sort.dir === 1 && 'rotate-180')}
        />
      </button>
    </th>
  )
}

/* ───────────────────────── filter chips ───────────────────────── */

/**
 * Pill filter (".an-chip"): 38px, a leading glyph, the label and a count.
 * Links mark the current one with aria-current, buttons with aria-pressed.
 */
export function FilterChip({ current, href, onClick, lead, label, count }: { current: boolean; href?: string; onClick?: () => void; lead: ReactNode; label: ReactNode; count?: number }) {
  const cls = cn(
    'inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border pl-1.5 pr-3 text-2xs font-semibold transition-colors duration-200 pointer-coarse:h-11',
    current ? 'border-transparent bg-pill text-on-pill' : 'border-rim bg-glass-2 text-text hover:bg-glass-3',
  )
  const inner = (
    <>
      {lead}
      {label}
      {count !== undefined && (
        <span className={cn('inline-grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[12.5px] font-bold', current ? 'bg-white/16 dark:bg-black/10' : 'bg-well')}>{count}</span>
      )}
    </>
  )
  return href ? (
    <a href={href} aria-current={current ? 'page' : undefined} className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" aria-pressed={current} onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}
