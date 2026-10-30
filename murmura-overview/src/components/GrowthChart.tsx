import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import type { DailyPoint } from '../data/types'
import { useI18n } from '../i18n'

/* Geometry measured on the reference SVG (viewBox 706×230 at a 1440px viewport). */
const HEIGHT = 230
const PAD = { left: 44, right: 12, top: 12, bottom: 26 }
const MIN_LABEL_GAP = 52
const MIN_END_GAP = 40

interface GrowthChartProps {
  data: DailyPoint[]
  label: string
  /** Formats a point's date for the axis and tooltip, e.g. "Oct 23". */
  formatDate: (d: Date) => string
}

/** Every Nth label plus the last point, like the reference axis (30D → 3, 90D → 9). */
const labelStep = (n: number) => (n <= 31 ? 3 : n <= 92 ? 9 : Math.ceil(n / 10))

function niceMax(max: number, ticks = 2) {
  const raw = max / ticks
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  return { top: Math.ceil(max / step) * step, step }
}

/** Monotone cubic interpolation in x (Fritsch–Carlson, as in d3.curveMonotoneX). */
export function monotonePath(pts: [number, number][]) {
  const n = pts.length
  if (n < 2) return ''
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0])
  const slope = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / dx[i])
  const tangent = pts.map((_, i) => {
    if (i === 0) return slope[0]
    if (i === n - 1) return slope[n - 2]
    const s0 = slope[i - 1]
    const s1 = slope[i]
    if (s0 * s1 <= 0) return 0
    const h0 = dx[i - 1]
    const h1 = dx[i]
    const p = (s0 * h1 + s1 * h0) / (h0 + h1)
    return (Math.sign(s0) + Math.sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p))
  })
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    const h = (x1 - x0) / 3
    d += ` C${x0 + h},${y0 + h * tangent[i]} ${x1 - h},${y1 - h * tangent[i + 1]} ${x1},${y1}`
  }
  return d
}

export function GrowthChart({ data, label, formatDate }: GrowthChartProps) {
  const { t } = useI18n()
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(706)
  const [active, setActive] = useState<number | null>(null)
  const gid = useId().replace(/:/g, '')

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const geo = useMemo(() => {
    const { top, step } = niceMax(Math.max(...data.map((p) => p.value)))
    const innerW = width - PAD.left - PAD.right
    const innerH = HEIGHT - PAD.top - PAD.bottom
    const x = (i: number) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : 0)
    const y = (v: number) => PAD.top + innerH - (v / top) * innerH
    const pts = data.map((p, i) => [x(i), y(p.value)] as [number, number])
    const line = monotonePath(pts)
    const base = y(0)
    const area = `${line} L${pts[pts.length - 1][0]},${base} L${pts[0][0]},${base} Z`
    const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
    // Thin labels out on narrow cards so dates never collide.
    const last = data.length - 1
    const perPoint = innerW / Math.max(1, last)
    const every = Math.max(labelStep(data.length), Math.ceil(MIN_LABEL_GAP / perPoint))
    const xLabels = data
      .map((p, i) => ({ i, text: formatDate(new Date(p.date)) }))
      .filter(({ i }) => i === last || (i % every === 0 && (last - i) * perPoint >= MIN_END_GAP))
    return { x, y, pts, line, area, ticks, xLabels, base }
  }, [data, width, formatDate])

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const innerW = width - PAD.left - PAD.right
    const i = Math.round(((px - PAD.left) / innerW) * (data.length - 1))
    setActive(Math.min(data.length - 1, Math.max(0, i)))
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    setActive((cur) => {
      const start = cur ?? data.length - 1
      return Math.min(data.length - 1, Math.max(0, start + (e.key === 'ArrowRight' ? 1 : -1)))
    })
  }

  const point = active != null ? geo.pts[active] : null

  // Centred above the active point (as in the reference), kept inside the plot.
  // Measured after render so the box reflects the tooltip's current content.
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    const el = tipRef.current
    if (!point || !el) return setTip(null)
    const { offsetWidth: w, offsetHeight: h } = el
    setTip({
      x: Math.min(width - w, Math.max(0, point[0] - w / 2)),
      y: point[1] - h - 14 >= 0 ? point[1] - h - 14 : point[1] + 14,
    })
  }, [point?.[0], point?.[1], width])

  return (
    <div
      ref={wrapRef}
      className="relative min-h-[230px] rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text"
      tabIndex={0}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
      style={{ ['--area' as string]: 'var(--sea)' }}
    >
      <svg
        role="img"
        aria-label={label}
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="block overflow-visible"
        onPointerMove={onMove}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={`g-${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--area)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--area)" stopOpacity="0" />
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
          {geo.xLabels.map(({ i, text }) => (
            <text key={i} x={geo.x(i)} y={HEIGHT - 6} textAnchor="middle">
              {text}
            </text>
          ))}
        </g>

        <path d={geo.area} fill={`url(#g-${gid})`} />
        <path d={geo.line} className="fill-none stroke-sea [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.5]" />

        {point && (
          <g className="pointer-events-none">
            <line x1={point[0]} x2={point[0]} y1={PAD.top} y2={geo.base} className="stroke-line-2" />
            <circle cx={point[0]} cy={point[1]} r={5} className="fill-sea stroke-bg [stroke-width:2.5]" />
          </g>
        )}
      </svg>

      <div
        ref={tipRef}
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute left-0 top-0 grid gap-[3px] whitespace-nowrap rounded-xl border border-line bg-float px-[11px] py-2 text-2xs shadow-pop transition-opacity duration-150"
        style={{
          opacity: tip ? 1 : 0,
          transform: tip ? `translate(${tip.x}px, ${tip.y}px)` : undefined,
        }}
      >
        {active != null && (
          <>
            <b className="font-bold">{formatDate(new Date(data[active].date))}</b>
            <span className="flex items-center gap-1.5 text-muted">
              <i className="size-2 rounded-full bg-sea" />
              {t.overview.newFollowers}
              <strong className="ml-auto pl-2.5 text-text">{t.numbers.compact(data[active].value)}</strong>
            </span>
          </>
        )}
      </div>
    </div>
  )
}
