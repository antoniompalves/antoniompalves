import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { monotonePath } from '../GrowthChart'
import { useI18n } from '../../i18n'
import { cn } from '../ui'

/* Geometry measured on the reference SVGs (viewBox 706×240 at a 1440px viewport):
   plot from x 44 to width − 12, y 12 (top tick) to 214 (zero), labels at y 234. */
const HEIGHT = 240
const PAD = { left: 44, right: 12, top: 12, bottom: 26 }
/** One date label per ~60px of plot; the last day is always labelled. */
const LABEL_SPACE = 60

export type ChartTone = 'pine' | 'sea' | 'coral' | 'lilac'

const STROKE: Record<ChartTone, string> = { pine: 'stroke-pine', sea: 'stroke-sea', coral: 'stroke-coral', lilac: 'stroke-lilac' }
const FILL: Record<ChartTone, string> = { pine: 'fill-pine', sea: 'fill-sea', coral: 'fill-coral', lilac: 'fill-lilac' }
const BG: Record<ChartTone, string> = { pine: 'bg-pine', sea: 'bg-sea', coral: 'bg-coral', lilac: 'bg-lilac' }

/** Axis top: the smallest 1, 2, 2.5 or 5 × 10ⁿ that clears the data with 8% headroom, halved for the middle tick. */
export function axisTop(max: number) {
  const target = Math.max(max, 1) * 1.08
  const pow = 10 ** Math.floor(Math.log10(target))
  return ([1, 2, 2.5, 5, 10].map((m) => m * pow).find((v) => v >= target) ?? 10 * pow)
}

interface PeriodChartProps {
  /** This period, one value per day, oldest first. */
  current: number[]
  /** The period before, aligned day by day; drawn dashed. */
  previous: number[]
  days: Date[]
  tone: ChartTone
  label: string
  className?: string
}

/**
 * "This period vs the previous one" line chart (".chart" in the reference):
 * a filled line for the current range over a dashed one for the range before,
 * with a crosshair tooltip on hover and the arrow keys.
 */
export function PeriodChart({ current, previous, days, tone, label, className }: PeriodChartProps) {
  const { t } = useI18n()
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(706)
  const [active, setActive] = useState<number | null>(null)
  const gid = useId().replace(/:/g, '')

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const geo = useMemo(() => {
    const top = axisTop(Math.max(...current, ...previous))
    const innerW = width - PAD.left - PAD.right
    const innerH = HEIGHT - PAD.top - PAD.bottom
    const n = current.length
    const x = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2)
    const y = (v: number) => PAD.top + innerH - (v / top) * innerH
    const pts = (vs: number[]) => vs.map((v, i) => [x(i), y(v)] as [number, number])
    const cur = pts(current)
    const line = monotonePath(cur)
    const base = y(0)
    const area = cur.length ? `${line} L${cur[cur.length - 1][0]},${base} L${cur[0][0]},${base} Z` : ''
    const every = Math.ceil(n / Math.max(1, Math.floor(innerW / LABEL_SPACE)))
    const labels = days.map((_, i) => i).filter((i) => i % every === 0 || i === n - 1)
    return { x, y, cur, prev: pts(previous), line, prevLine: monotonePath(pts(previous)), area, base, ticks: [0, top / 2, top], labels }
  }, [current, previous, days, width])

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const innerW = width - PAD.left - PAD.right
    const i = Math.round(((e.clientX - rect.left - PAD.left) / innerW) * (current.length - 1))
    setActive(Math.min(current.length - 1, Math.max(0, i)))
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    setActive((cur) => Math.min(current.length - 1, Math.max(0, (cur ?? current.length - 1) + (e.key === 'ArrowRight' ? 1 : -1))))
  }

  const point = active != null ? geo.cur[active] : null
  const prevPoint = active != null ? geo.prev[active] : null

  // Centred above the higher of the two points, kept inside the chart.
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    const el = tipRef.current
    if (!point || !el) return setTip(null)
    const { offsetWidth: w, offsetHeight: h } = el
    const top = Math.min(point[1], prevPoint?.[1] ?? point[1])
    setTip({
      x: Math.min(width - w, Math.max(0, point[0] - w / 2)),
      y: top - h - 14 >= 0 ? top - h - 14 : Math.max(point[1], prevPoint?.[1] ?? 0) + 14,
    })
  }, [point?.[0], point?.[1], prevPoint?.[1], width])

  return (
    <div
      ref={wrapRef}
      className={cn('relative min-h-[240px] flex-1 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text max-mobile:min-h-[210px]', className)}
      tabIndex={0}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
    >
      <svg
        role="img"
        aria-label={label}
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="block overflow-visible"
        onPointerMove={pick}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={`g-${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={`var(--${tone})`} stopOpacity="0.22" />
            <stop offset="1" stopColor={`var(--${tone})`} stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className="fill-muted text-[12px] font-medium">
          {geo.ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(tick)} y2={geo.y(tick)} className="stroke-line [stroke-dasharray:3_4]" />
              <text x={PAD.left - 8} y={geo.y(tick) + 4} textAnchor="end">
                {t.numbers.compact(tick)}
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
        <path d={geo.line} className={cn('fill-none [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.5]', STROKE[tone])} />
        <path d={geo.prevLine} className="fill-none stroke-faint [stroke-dasharray:5_6] [stroke-linecap:round] [stroke-width:2]" />

        {point && prevPoint && (
          <g className="pointer-events-none">
            <line x1={point[0]} x2={point[0]} y1={PAD.top} y2={geo.base} className="stroke-line-2" />
            <circle cx={prevPoint[0]} cy={prevPoint[1]} r={4.5} className="fill-faint stroke-bg [stroke-width:2.5]" />
            <circle cx={point[0]} cy={point[1]} r={4.5} className={cn('stroke-bg [stroke-width:2.5]', FILL[tone])} />
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
            <span className="flex items-center gap-1.5 text-muted">
              <i className={cn('size-2 rounded-full', BG[tone])} />
              {t.analytics.thisPeriod}
              <strong className="ml-auto pl-2.5 text-text">{t.numbers.compact(current[active])}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-muted">
              <i className="size-2 rounded-full bg-faint" />
              {t.analytics.previousPeriod}
              <strong className="ml-auto pl-2.5 text-text">{t.numbers.compact(previous[active])}</strong>
            </span>
          </>
        )}
      </div>
    </div>
  )
}
