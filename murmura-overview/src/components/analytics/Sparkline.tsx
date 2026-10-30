import { monotonePath } from '../GrowthChart'
import { cn } from '../ui'

/** Follower trend in a table cell (".spark", 96×28): values 0–1 drawn between y 25 and 3. */
export function Sparkline({ values, tone, className }: { values: number[]; tone: 'pine' | 'coral'; className?: string }) {
  const step = 96 / Math.max(1, values.length - 1)
  const d = monotonePath(values.map((v, i) => [i * step, 25 - v * 22]))
  return (
    <svg viewBox="0 0 96 28" width="96" height="28" aria-hidden className={cn('block overflow-visible', className)}>
      <path d={d} className={cn('fill-none [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]', tone === 'pine' ? 'stroke-pine' : 'stroke-coral')} />
    </svg>
  )
}
