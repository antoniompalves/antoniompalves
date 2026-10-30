import type { LucideIcon } from 'lucide-react'
import { Badge } from './ui'

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
      className="text-[clamp(30px,2.7vw,40px)] font-semibold leading-[1.04] tracking-[-0.025em] focus:outline-none"
    >
      <SplitWords lines={lines} />
    </h1>
  )
}

/** Header stat: glass disc icon, big value (+ optional growth badge), muted label. */
export function Stat({ icon: Icon, value, badge, label }: { icon: LucideIcon; value: string; badge?: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-12 shrink-0 place-items-center rounded-full border border-rim bg-glass-2">
        <Icon size={20} aria-hidden />
      </span>
      <div className="flex flex-col-reverse">
        <dt className="max-w-[170px] text-2xs leading-[1.3] text-muted">{label}</dt>
        <dd className="flex items-center gap-2.5 text-[23px] font-semibold tracking-[-0.01em]">
          <b className="num">{value}</b>
          {badge && <Badge tone="pine">{badge}</Badge>}
        </dd>
      </div>
    </div>
  )
}
