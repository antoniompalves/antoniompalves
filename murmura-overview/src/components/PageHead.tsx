import type { LucideIcon } from 'lucide-react'
import { Badge } from './ui'
import type { Tone } from '../data/types'

/** One inline-block per character so a page title can rise in letter by letter. */
function SplitWords({ lines }: { lines: string[] }) {
  let i = 0
  return lines.map((line, l) => (
    <span key={l}>
      {l > 0 && <br />}
      <span aria-hidden className="-mb-[0.08em] inline-block overflow-hidden pb-[0.08em] align-top">
        {[...line].map((ch, c) => (
          <span key={c} className="inline-block animate-rise" style={{ animationDelay: `${i++ * 22}ms` }}>
            {/* An inline-block holding only a space collapses to nothing, so keep it as a no-break space. */}
            {ch === ' ' ? '\u00a0' : ch}
          </span>
        ))}
      </span>
    </span>
  ))
}

/** The large two-line view title shared by every page (".head__title"). */
export function PageTitle({ lines, label }: { lines: string[]; label: string }) {
  return (
    <h1
      aria-label={label}
      tabIndex={-1}
      className="text-[clamp(30px,2.7vw,40px)] font-semibold leading-[1.04] tracking-[-0.025em] focus:outline-none max-mobile:text-[28px]"
    >
      <SplitWords lines={lines} />
    </h1>
  )
}

/** Header stat: glass disc icon, big value (+ optional growth badge), muted label. Phones drop the icon. */
export function Stat({ icon: Icon, value, badge, badgeTone = 'pine', label }: { icon: LucideIcon; value: string; badge?: string; badgeTone?: Tone; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-12 shrink-0 place-items-center rounded-full border border-rim bg-glass-2 max-mobile:hidden">
        <Icon size={20} aria-hidden />
      </span>
      <div className="flex flex-col-reverse">
        <dt className="max-w-[170px] text-2xs leading-[1.3] text-muted max-mobile:text-[12.5px]">{label}</dt>
        <dd className="flex items-center gap-2.5 text-[23px] font-semibold tracking-[-0.01em] max-mobile:flex-wrap max-mobile:gap-x-2 max-mobile:gap-y-1 max-mobile:text-lg max-mobile:font-bold">
          <b className="num">{value}</b>
          {badge && <Badge tone={badgeTone}>{badge}</Badge>}
        </dd>
      </div>
    </div>
  )
}
