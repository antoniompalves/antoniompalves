import { Ear, X } from 'lucide-react'
import { monotonePath } from '../GrowthChart'
import { Empty } from '../analytics/parts'
import { Badge, BrandMark, Button, IconButton, cn } from '../ui'
import { KIND_TONE } from '../../data/listening'
import type { KeywordRow } from '../../data/listening'
import type { Keyword } from '../../data/types'
import { useI18n } from '../../i18n'

/** Phones list this many keywords until "Show all keywords". */
const PHONE_ROWS = 6

/** 14 days of volume (".ls-k__spark", 92×30, scaled down whole on phones): a sea line ending in a dot. */
function KeywordSpark({ values }: { values: number[] }) {
  const min = Math.min(...values)
  const range = Math.max(1, Math.max(...values) - min)
  const pts = values.map((v, i) => [(i * 92) / Math.max(1, values.length - 1), 27 - ((v - min) / range) * 24] as [number, number])
  const [x, y] = pts[pts.length - 1]
  return (
    <svg viewBox="0 0 92 30" aria-hidden className="block h-[30px] w-[92px] overflow-visible max-mobile:w-[72px]">
      <path d={monotonePath(pts)} className="fill-none stroke-sea [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]" />
      <circle cx={x} cy={y} r={3.2} className="fill-sea stroke-bg [stroke-width:1.5] dark:fill-[#7ab8e8]" />
    </svg>
  )
}

interface KeywordsProps {
  rows: KeywordRow[]
  selected: string | null
  onSelect: (id: string) => void
  onStop: (keyword: Keyword) => void
  /** Phones: every keyword instead of the first six. */
  showAll: boolean
  onShowAll: (all: boolean) => void
}

/** "Tracked keywords": kind, term, brand and weekly count, a 14-day line and the sentiment split of each keyword. */
export function Keywords({ rows, selected, onSelect, onStop, showAll, onShowAll }: KeywordsProps) {
  const { t } = useI18n()
  const k = t.listening.keywords
  const pct = t.numbers.pct0

  if (!rows.length) return <Empty icon={Ear} title={k.noneTitle} text={k.noneText} />

  return (
    <>
      <p className="-mt-1.5 mb-2.5 text-2xs text-muted">{k.hint}</p>
      <ul className="grid gap-1">
        {rows.map(({ keyword, brand, count, split, spark }, i) => {
          const on = selected === keyword.id
          const shares = [pct(split.positive), pct(split.neutral), pct(split.negative)] as const
          return (
            <li
              key={keyword.id}
              className={cn(
                'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 rounded-[18px] border px-2 pb-2.5 pt-2',
                on ? 'border-line-2 bg-glass-2' : 'border-transparent',
                !showAll && !on && i >= PHONE_ROWS && 'max-mobile:hidden',
              )}
            >
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(keyword.id)}
                className="group grid min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl p-0.5 text-left pointer-coarse:min-h-11 max-mobile:grid-cols-[minmax(0,1fr)_auto] max-mobile:gap-x-2.5 max-mobile:gap-y-1.5"
              >
                <Badge tone={KIND_TONE[keyword.kind]} className="min-w-[84px] justify-center max-mobile:col-span-full max-mobile:min-w-0 max-mobile:justify-self-start">
                  {t.listening.kinds[keyword.kind]}
                </Badge>
                <span className="min-w-0 leading-[1.2]">
                  <b className="block truncate text-sm font-bold group-hover:underline group-hover:underline-offset-[3px]">{keyword.term}</b>
                  <small className="flex h-[17.8px] items-center gap-[5px] overflow-hidden whitespace-nowrap text-[12.5px] text-muted">
                    {brand && <BrandMark brand={brand} size="3xs" />}
                    <span className="num">{count}</span> {k.thisWeek}
                  </small>
                </span>
                <KeywordSpark values={spark} />
              </button>
              <span
                role="img"
                aria-label={k.split(...shares)}
                title={k.splitTitle(...shares)}
                className="col-start-1 ml-24 flex h-1.5 gap-0.5 overflow-hidden rounded-full max-mobile:ml-0"
              >
                <i className="block h-full min-w-0 bg-good" style={{ flexGrow: split.positive }} />
                <i className="block h-full min-w-0 bg-line-2" style={{ flexGrow: split.neutral }} />
                <i className="block h-full min-w-0 bg-coral" style={{ flexGrow: split.negative }} />
              </span>
              <IconButton label={k.stop(keyword.term)} icon={X} size="sm" onClick={() => onStop(keyword)} className="col-start-2 row-span-2 row-start-1 self-center" />
            </li>
          )
        })}
      </ul>
      {rows.length > PHONE_ROWS && (
        <div className="mt-2.5 hidden justify-items-center max-mobile:grid">
          <Button variant="ghost" aria-expanded={showAll} onClick={() => onShowAll(!showAll)}>
            {showAll ? (
              k.showFewer
            ) : (
              <>
                {k.showAll}
                <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-well px-1.5 text-[12.5px] font-bold">{rows.length}</span>
              </>
            )}
          </Button>
        </div>
      )}
    </>
  )
}
