import { cn } from './ui'

/**
 * Kataru's mark: 言, the "speech" half of 語る (kataru, to narrate) — a dot,
 * two lines of a story and an open mouth — drawn on the 24px grid with the
 * same round strokes as the Lucide icons around it.
 */
export function KataruMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className={cn('fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.1]', className)}
    >
      <circle cx="12" cy="4" r="1.15" className="fill-current stroke-none" />
      <path d="M5 8.2h14M7.5 12h9" />
      <rect x="7.5" y="15.5" width="9" height="5.5" rx="2.75" />
    </svg>
  )
}
