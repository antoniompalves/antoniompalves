import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { monotonePath } from '../GrowthChart'
import { axisTop } from '../analytics/PeriodChart'
import { cn } from '../ui'
import { SENTIMENTS } from '../../data/listening'
import type { Sentiment } from '../../data/types'
import { useI18n } from '../../i18n'

/* Geometry measured on the reference SVG (viewBox 706×230 at a 1440px viewport):
   plot from x 44 to width − 12, y 12 (top tick) to 204 (zero), date labels at y 224. */
const HEIGHT = 230
const PAD = { left: 44, right: 12, top: 12, bottom: 26 }
/** Date labels sit at least 60px apart; the one before the last day goes when it's within 40px of it. */
const MIN_LABEL_GAP = 60
const MIN_END_GAP = 40

const STROKE: Record<Sentiment, string> = { positive: 'stroke-pine', neutral: 'stroke-muted', negative: 'stroke-coral' }
const DOT: Record<Sentiment, string> = { positive: 'bg-pine', neutral: 'bg-muted', negative: 'bg-coral' }
const FILL: Record<Sentiment, string> = { positive: 'fill-pine', neutral: 'fill-muted', negative: 'fill-coral' }

export const SentimentDot = ({ s }: { s: Sentiment }) => <i aria-hidden className={cn('inline-block size-[9px] rounded-full', DOT[s])} />

/**
 * Mentions per day by sentiment over 14 days (".ls-chart"): positive as a pine
 * line over a soft area, neutral and negative as plain lines; crosshair tooltip
 * on hover and with the arrow keys.
 */
export function SentimentChart({ days, series }: { days: Date[]; series: Record<Sentiment, number[]> }) {
  const { t } = useI18n()
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(706)
  const [active, setActive] = useState<number | null>(null)
  const gid = useId().replace(/:/g, '')
  const n = days.length

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const geo = useMemo(() => {
    const top = axisTop(Math.max(...SENTIMENTS.flatMap((s) => series[s])))
    const innerW = width - PAD.left - PAD.right
    const innerH = HEIGHT - PAD.top - PAD.bottom
    const x = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2)
    const y = (v: number) => PAD.top + innerH - (v / top) * innerH
    const pts = Object.fromEntries(SENTIMENTS.map((s) => [s, series[s].map((v, i) => [x(i), y(v)] as [number, number])])) as Record<Sentiment, [number, number][]>
    const lines = Object.fromEntries(SENTIMENTS.map((s) => [s, monotonePath(pts[s])])) as Record<Sentiment, string>
    const base = y(0)
    const area = n ? `${lines.positive} L${x(n - 1)},${base} L${x(0)},${base} Z` : ''
    const perPoint = innerW / Math.max(1, n - 1)
    const every = Math.ceil(MIN_LABEL_GAP / perPoint)
    const labels = days.map((_, i) => i).filter((i) => i === n - 1 || (i % every === 0 && (n - 1 - i) * perPoint >= MIN_END_GAP))
    return { x, y, pts, lines, area, base, ticks: [0, top / 2, top], labels }
  }, [series, days, n, width])

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - rect.left - PAD.left) / (width - PAD.left - PAD.right)) * (n - 1))
    setActive(Math.min(n - 1, Math.max(0, i)))
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    setActive((cur) => Math.min(n - 1, Math.max(0, (cur ?? n - 1) + (e.key === 'ArrowRight' ? 1 : -1))))
  }

  // Centred above the highest of the three points, kept inside the chart.
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    const el = tipRef.current
    if (active == null || !el) return setTip(null)
    const { offsetWidth: w, offsetHeight: h } = el
    const ys = SENTIMENTS.map((s) => geo.pts[s][active][1])
    const px = geo.x(active)
    setTip({
      x: Math.min(width - w, Math.max(0, px - w / 2)),
      y: Math.min(...ys) - h - 14 >= 0 ? Math.min(...ys) - h - 14 : Math.max(...ys) + 14,
    })
  }, [active, geo, width])

  return (
    <div
      ref={wrapRef}
      className="relative min-h-[230px] flex-1 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text max-mobile:min-h-[200px]"
      tabIndex={0}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
    >
      <svg
        role="img"
        aria-label={t.listening.sentiment.chart}
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="block overflow-visible"
        onPointerMove={pick}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={`g-${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--pine)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--pine)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className="fill-muted text-[12px] font-medium">
          {geo.ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(tick)} y2={geo.y(tick)} className="stroke-line [stroke-dasharray:3_4]" />
              <text x={PAD.left - 8} y={geo.y(tick) + 4} textAnchor="end">
                {t.numbers.compact(Math.round(tick))}
              </text>
            </g>
          ))}
          {geo.labels.map((i) => (
            <text key={i} x={geo.x(i)} y={HEIGHT - 6} textAnchor="middle">
              {t.dates.monthDay(days[i])}
            </text>
          ))}
        </g>

        <path d={geo.area} fill={`url(#g-${gid})`} />
        {[...SENTIMENTS].reverse().map((s) => (
          <path key={s} d={geo.lines[s]} className={cn('fill-none [stroke-linecap:round] [stroke-linejoin:round]', s === 'positive' ? '[stroke-width:2.5]' : '[stroke-width:2]', STROKE[s])} />
        ))}

        {active != null && (
          <g className="pointer-events-none">
            <line x1={geo.x(active)} x2={geo.x(active)} y1={PAD.top} y2={geo.base} className="stroke-line-2" />
            {SENTIMENTS.map((s) => (
              <circle key={s} cx={geo.pts[s][active][0]} cy={geo.pts[s][active][1]} r={4.5} className={cn('stroke-bg [stroke-width:2.5]', FILL[s])} />
            ))}
          </g>
        )}
      </svg>

      <div
        ref={tipRef}
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute left-0 top-0 z-[5] grid gap-[3px] whitespace-nowrap rounded-xl border border-line bg-float px-[11px] py-2 text-2xs shadow-pop transition-opacity duration-150"
        style={{ opacity: tip ? 1 : 0, transform: tip ? `translate(${tip.x}px, ${tip.y}px)` : undefined }}
      >
        {active != null && (
          <>
            <b className="font-bold">{t.dates.monthDay(days[active])}</b>
            {SENTIMENTS.map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-muted">
                <SentimentDot s={s} />
                {t.sentiment[s]}
                <strong className="ml-auto pl-2.5 text-text">{series[s][active]}</strong>
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
