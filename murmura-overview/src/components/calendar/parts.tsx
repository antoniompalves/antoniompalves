import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { StatusFilter } from '../../data/calendar'
import { cn } from '../ui'

const DOT: Record<StatusFilter, string> = {
  scheduled: 'bg-sea',
  pending: 'bg-butter shadow-[0_0_0_1px_rgb(0_0_0/0.14)]',
  published: 'bg-pine dark:bg-[#6cc59a]',
  draft: 'bg-transparent shadow-[inset_0_0_0_1.5px_var(--faint)]',
  failed: 'bg-coral',
}

/** 8px status dot (".cl-dot"); gets an on-pill ring inside a pressed chip. */
export const StatusDot = ({ status, className }: { status: StatusFilter; className?: string }) => (
  <i className={cn('inline-block size-2 shrink-0 rounded-full', DOT[status], className)} />
)

/** Filter chips and legend, in the reference's order; labels come from `t.calendar.statusFilters`. */
export const STATUS_FILTERS: StatusFilter[] = ['scheduled', 'pending', 'published', 'draft', 'failed']

interface ChipProps extends ComponentPropsWithoutRef<'button'> {
  pressed: boolean
  /** Icon-only chip (network filters): 6px side padding instead of 13px. */
  compact?: boolean
  /** Colours when pressed; defaults to the ink pill. */
  pressedClassName?: string
  children: ReactNode
}

/** Toggle chip used by the calendar filters (".chip"). */
export function Chip({ pressed, compact, pressedClassName = 'border-transparent bg-pill text-on-pill', className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'inline-flex h-[34px] shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-full border text-2xs font-semibold transition-colors duration-150',
        compact ? 'px-1.5' : 'px-[13px]',
        pressed ? pressedClassName : 'border-line bg-glass-2 hover:bg-glass-3',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
