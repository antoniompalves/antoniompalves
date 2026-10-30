import { Hash } from 'lucide-react'
import { Empty } from '../analytics/parts'
import { cn } from '../ui'
import type { TrendingTerm } from '../../data/listening'
import { useI18n } from '../../i18n'

/* Type scale of the cloud (".ls-term--1…5"). */
const SIZE = [
  '',
  'text-[13px] text-muted',
  'text-[15px]',
  'text-lg',
  'text-[22px] tracking-[-0.01em]',
  'text-[27px] font-bold tracking-[-0.02em]',
]

/** "Trending terms": a cloud of this week's keywords, hashtags and words; picking one filters the stream. */
export function Trending({ terms, isOn, onPick }: { terms: TrendingTerm[]; isOn: (t: TrendingTerm) => boolean; onPick: (t: TrendingTerm) => void }) {
  const { t } = useI18n()
  const tr = t.listening.trending
  return (
    <>
      <p className="text-2xs text-muted">{tr.sub}</p>
      {terms.length ? (
        <div className="mt-3.5 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1.5 py-1">
          {terms.map((term) => {
            const on = isOn(term)
            return (
              <button
                key={term.key}
                type="button"
                aria-pressed={on}
                title={tr.count(term.count)}
                onClick={() => onPick(term)}
                className={cn(
                  'inline-flex cursor-pointer items-baseline gap-[5px] rounded-full border px-[11px] py-1 font-semibold leading-[1.25] transition-colors duration-150 pointer-coarse:min-h-11 pointer-coarse:items-center',
                  SIZE[term.size],
                  on
                    ? 'border-transparent bg-pill text-on-pill'
                    : cn(term.kind === 'keyword' ? 'border-line bg-glass-2' : 'border-transparent', term.size > 1 && 'text-text', 'hover:bg-well'),
                )}
              >
                {term.label}
                <span className={cn('text-[12px] font-semibold tracking-normal', on ? 'opacity-70' : 'text-muted')}>{term.count}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <Empty icon={Hash} title={tr.noneTitle} text={tr.noneText} />
      )}
    </>
  )
}
