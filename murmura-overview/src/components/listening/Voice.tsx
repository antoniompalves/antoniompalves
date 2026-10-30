import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, PieChart, Users } from 'lucide-react'
import { Empty, Figure } from '../analytics/parts'
import { MenuItem, Popover } from '../Popover'
import { BrandMark, cn } from '../ui'
import type { ListeningModel } from '../../data/listening'
import type { Brand } from '../../data/types'
import { useI18n } from '../../i18n'
import { StreamChip } from './Stream'

/** Figure cell: right-aligned, a labelled block on phones (the table keeps its 14px there). */
const TD = 'px-3 py-2.5 text-right tabular-nums max-mobile:p-0 max-mobile:text-left'
/** The label each figure shows above it on phones, where the header row is hidden. */
const CELL_LABEL = 'hidden max-mobile:block max-mobile:text-[12.5px] max-mobile:font-semibold max-mobile:text-muted'

/** Initial of a competitor in a grey tile (".ls-cmark"): 30px, or 38px in the table. */
const CompetitorMark = ({ name, large }: { name: string; large?: boolean }) => (
  <span
    aria-hidden
    className={cn(
      'inline-grid shrink-0 place-items-center border border-line bg-well font-bold text-muted',
      large ? 'size-[38px] rounded-[11px] text-[15px]' : 'size-[30px] rounded-[9px] text-[13px]',
    )}
  >
    {name.charAt(0)}
  </span>
)

/** Brand picker shared by "Share of voice" and "Competitors". */
export function BrandPicker({ brands, brand, onPick }: { brands: Brand[]; brand: Brand | undefined; onPick: (id: string) => void }) {
  const { t } = useI18n()
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <>
      <StreamChip ref={ref} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="-mt-1 mb-3.5 self-start">
        {brand && <BrandMark brand={brand} size="xs" />}
        {brand?.name}
        <ChevronDown aria-hidden />
      </StreamChip>
      <Popover open={open} onClose={() => setOpen(false)} anchor={ref} label={t.listening.voice.brand}>
        <div role="menu" aria-label={t.listening.voice.brand}>
          {brands.map((b) => (
            <MenuItem
              key={b.id}
              lead={<BrandMark brand={b} size="xs" />}
              checked={b.id === brand?.id}
              onClick={() => {
                setOpen(false)
                onPick(b.id)
              }}
            >
              {b.name}
            </MenuItem>
          ))}
        </div>
      </Popover>
    </>
  )
}

/** "Share of voice": how much of this week's conversation is about the brand, next to its competitors. */
export function ShareOfVoice({ model, brand }: { model: ListeningModel; brand: Brand | undefined }) {
  const { t } = useI18n()
  const v = t.listening.voice
  const { voice } = model
  if (!voice.hasCompetitors) return <Empty icon={PieChart} title={v.noneTitle} text={v.noneText(brand?.name ?? '')} />
  return (
    <>
      <Figure value={t.numbers.pct0(voice.ours)}>
        <span className="text-2xs text-muted">{v.of}</span>
      </Figure>
      <ul className="mt-3 grid gap-1">
        {voice.rows.map((row) => {
          const us = !row.competitor
          return (
            <li key={row.key} title={v.count(row.name, row.count)} className="grid grid-cols-[auto_minmax(0,1fr)_3.2em] grid-rows-[auto_auto] items-center gap-x-2.5 gap-y-1 py-[7px]">
              <span className="row-span-2">{us && brand ? <BrandMark brand={brand} /> : <CompetitorMark name={row.name} />}</span>
              <span className="flex items-center gap-2 truncate text-xs font-semibold">
                {row.name}
                {us && <small className="rounded-full bg-pill px-2 py-px text-[11.5px] font-bold text-on-pill">{v.you}</small>}
              </span>
              <b className="num text-right text-sm">{t.numbers.pct0(row.share)}</b>
              <span aria-hidden className="col-span-2 col-start-2 h-2.5 overflow-hidden rounded-full bg-well">
                <span
                  className={cn('block h-full w-full origin-left rounded-full transition-transform duration-700 ease-soft', us ? 'bg-ink' : 'bg-faint')}
                  style={{ transform: `scaleX(${row.fill})` }}
                />
              </span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** "Competitors": the brand ("You") above its competitors, biggest audience first. */
export function Competitors({ model }: { model: ListeningModel }) {
  const { t } = useI18n()
  const c = t.listening.competitors
  const { benchmark } = model
  const growth = (g: number) => <span className={cn('font-bold', g >= 0 ? 'text-good' : 'text-bad')}>{t.numbers.signedPct1(g)}</span>
  const rows = [
    ...(benchmark.brand
      ? [{ key: 'us', mark: <BrandMark brand={benchmark.brand} size="md" />, name: benchmark.brand.name, sub: c.you, us: true, ...benchmark }]
      : []),
    ...benchmark.competitors.map((x) => ({ ...x, key: x.id, mark: <CompetitorMark name={x.name} large />, sub: `@${x.handle}`, us: false })),
  ]
  const head = 'whitespace-nowrap border-b border-line px-3 py-2.5 text-2xs font-semibold text-muted'
  // Names are never cut short: when the card is too narrow the table scrolls sideways.
  return (
    <div className="-mx-1.5 overflow-x-auto overscroll-x-contain">
      <table className="w-full border-separate border-spacing-0 text-xs max-mobile:block">
        <caption className="sr-only">{c.caption}</caption>
        <thead className="max-mobile:hidden">
          <tr>
            <th scope="col" className={cn(head, 'text-left')}>
              {c.account}
            </th>
            {[c.followers, c.growth, c.engagement, c.perWeek].map((h) => (
              <th key={h} scope="col" className={cn(head, 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-mobile:block">
          {rows.map((r) => {
            const cells: [string, ReactNode][] = [
              [c.followers, <b className="font-bold">{t.numbers.compact(r.followers)}</b>],
              [c.growth, growth(r.growth)],
              [c.engagement, t.numbers.pct1(r.engagementRate)],
              [c.perWeek, t.numbers.decimal(r.postsPerWeek)],
            ]
            return (
              <tr
                key={r.key}
                className={cn(
                  'group max-mobile:grid max-mobile:grid-cols-2 max-mobile:gap-x-2.5 max-mobile:gap-y-2 max-mobile:rounded-[14px] max-mobile:border-b max-mobile:border-line max-mobile:px-2 max-mobile:py-3 max-mobile:last:border-b-0',
                  r.us && 'bg-well',
                )}
              >
                <th
                  scope="row"
                  className={cn('border-b border-line px-3 py-2.5 text-left font-medium group-last:border-b-0 max-mobile:col-span-full max-mobile:border-0 max-mobile:p-0', r.us && 'rounded-l-[14px] max-mobile:rounded-none')}
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    {r.mark}
                    <span className="grid">
                      <b className="font-semibold">{r.name}</b>
                      <small className="text-2xs text-muted">{r.sub}</small>
                    </span>
                  </span>
                </th>
                {cells.map(([label, value], i) => (
                  <td key={label} className={cn(TD, 'border-b border-line group-last:border-b-0 max-mobile:border-0', r.us && i === 3 && 'rounded-r-[14px] max-mobile:rounded-none')}>
                    <span className={CELL_LABEL}>{label}</span>
                    {value}
                  </td>
                ))}
              </tr>
            )
          })}
          {!benchmark.competitors.length && (
            <tr className="max-mobile:block">
              <td colSpan={5} className="max-mobile:block">
                <Empty icon={Users} title={c.noneTitle} text={c.noneText} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
