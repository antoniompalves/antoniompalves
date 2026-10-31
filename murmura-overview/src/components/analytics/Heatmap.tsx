import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { CalendarPlus } from 'lucide-react'
import type { HeatSlot } from '../../data/analytics'
import type { NetworkId } from '../../data/types'
import { NETWORK_LABEL } from '../../data/selectors'
import { useI18n } from '../../i18n'
import { IconButton, NetworkGlyph, cn } from '../ui'
import { EDGE_FADE, useScrollEdges } from '../useScrollEdges'

interface HeatmapProps {
  /** 168 values, Monday 0:00 first, 0–1. */
  cells: number[]
  best: HeatSlot[]
  network: NetworkId | null
  networks: NetworkId[]
  onNetwork: (n: NetworkId | null) => void
  timeZone: string
  /** Where "Plan a post" goes for a slot: the composer at its next occurrence. */
  planHref: (day: number, hour: number) => string
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)

/**
 * "Best time to post" (".an-best"): a weekday × hour heatmap of engagement
 * with the three best slots ringed and listed, each one a shortcut to plan a
 * post. Hover a cell, or focus the grid and use the arrow keys, to read it.
 */
export function Heatmap({ cells, best, network, networks, onNetwork, timeZone, planHref }: HeatmapProps) {
  const { t } = useI18n()
  const a = t.analytics.best
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [active, setActive] = useState<number | null>(null)
  const [focused, setFocused] = useState(false)
  const scroller = useScrollEdges<HTMLDivElement>()
  const rank = (i: number) => best.findIndex((s) => s.day * 24 + s.hour === i)

  // Tooltip centred over the active cell, kept inside the card body.
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    const cell = active != null ? cellRefs.current[active] : null
    const wrap = wrapRef.current
    const el = tipRef.current
    if (!cell || !wrap || !el) return setTip(null)
    const w = wrap.getBoundingClientRect()
    const c = cell.getBoundingClientRect()
    setTip({
      x: Math.min(w.width - el.offsetWidth - 8, Math.max(8, c.left - w.left + c.width / 2 - el.offsetWidth / 2)),
      y: c.top - w.top - el.offsetHeight - 8,
    })
  }, [active, cells])

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -24, ArrowDown: 24 }[e.key]
    if (step === undefined) return
    e.preventDefault()
    setActive((cur) => {
      if (cur == null) return best[0] ? best[0].day * 24 + best[0].hour : 0
      const next = cur + step
      if (Math.abs(step) === 1 && Math.floor(next / 24) !== Math.floor(cur / 24)) return cur
      return next < 0 || next >= 168 ? cur : next
    })
  }

  const cellText = (i: number) => {
    const r = rank(i)
    return [a.cell(Math.floor(i / 24), i % 24), `${a.engagementIndex} ${Math.round(cells[i] * 100)}`, r >= 0 ? `${a.bestSlot} #${r + 1}` : ''].filter(Boolean).join(' · ')
  }

  const segBtn = (pressed: boolean) =>
    cn(
      'inline-grid cursor-pointer place-items-center whitespace-nowrap rounded-full px-[11px] py-1.5 text-2xs font-semibold transition-[background-color,color,box-shadow] duration-300 ease-soft pointer-coarse:min-h-11 pointer-coarse:min-w-11',
      pressed ? 'bg-glass-3 text-text shadow-[0_2px_8px_rgb(0_0_0/0.08)] dark:bg-white/14' : 'text-muted hover:text-text',
    )

  return (
    <div ref={wrapRef} className="relative flex flex-1 flex-col">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <div className="max-w-full overflow-x-auto rounded-full [scrollbar-width:none]">
          <div role="group" aria-label={a.networks} className="inline-flex w-max rounded-full bg-well p-[3px]">
            <button type="button" aria-pressed={network === null} onClick={() => onNetwork(null)} className={cn(segBtn(network === null), 'px-[15px] py-2')}>
              {a.all}
            </button>
            {networks.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={network === n}
                aria-label={NETWORK_LABEL[n]}
                title={NETWORK_LABEL[n]}
                onClick={() => onNetwork(n)}
                className={segBtn(network === n)}
              >
                <NetworkGlyph network={n} className="size-[18px] stroke-[1.9]" />
              </button>
            ))}
          </div>
        </div>
        <p className="max-w-[340px] text-2xs text-muted">{a.sub(timeZone)}</p>
      </div>

      <div ref={scroller.ref} style={scroller.style} className={cn('-mx-1 overflow-x-auto overscroll-x-contain p-1', EDGE_FADE)}>
        <div
          role="img"
          tabIndex={0}
          aria-label={a.heatmap(network ? NETWORK_LABEL[network] : null, best.map((s) => a.slot(s.day, s.hour)))}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            setActive(null)
          }}
          onPointerLeave={() => !focused && setActive(null)}
          className="grid min-w-[600px] grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-1 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text max-mobile:min-w-[560px] max-mobile:gap-[3px]"
        >
          {a.days.map((day, d) => (
            <Fragment key={day}>
              <span className="self-center text-[12.5px] font-semibold text-muted">{day}</span>
              {HOURS.map((h) => {
                const i = d * 24 + h
                const r = rank(i)
                return (
                  <span
                    key={h}
                    ref={(el) => {
                      cellRefs.current[i] = el
                    }}
                    onPointerEnter={() => setActive(i)}
                    className={cn(
                      'relative aspect-square rounded-[7px] bg-well',
                      active === i && focused && 'z-[1] shadow-[0_0_0_2px_var(--text)]',
                      r >= 0 && 'after:pointer-events-none after:absolute after:-inset-1 after:rounded-[10px] after:border-2 after:border-text',
                    )}
                  >
                    <i className="absolute inset-0 rounded-[inherit] bg-sea transition-opacity duration-500 dark:bg-[#3f8fd6]" style={{ opacity: cells[i] }} />
                    {r >= 0 && (
                      <b className="absolute -right-[9px] -top-[9px] z-[2] grid size-[19px] place-items-center rounded-full bg-pill text-[11px] font-bold text-on-pill shadow-[0_0_0_2px_var(--bg)] max-mobile:-right-2 max-mobile:-top-2 max-mobile:size-[17px] max-mobile:text-[10.5px]">
                        {r + 1}
                      </b>
                    )}
                  </span>
                )
              })}
            </Fragment>
          ))}
          <span />
          {HOURS.map((h) => (
            <span key={h} className="whitespace-nowrap pt-0.5 text-left text-[12px] text-muted">
              {h % 3 === 0 ? a.hourTick(h) : ''}
            </span>
          ))}
        </div>
      </div>

      {/* The grid is one image to assistive tech; announce the cell the arrow keys land on. */}
      <p className="sr-only" aria-live="polite">
        {focused && active != null ? cellText(active) : ''}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 max-mobile:mt-3">
        <div aria-hidden className="flex items-center gap-2 text-[12.5px] text-muted">
          <span>{a.quiet}</span>
          <i className="h-2.5 w-24 rounded-full bg-[linear-gradient(90deg,var(--well),var(--sea))] dark:bg-[linear-gradient(90deg,var(--well),#3f8fd6)]" />
          <span>{a.busy}</span>
        </div>
        <ol aria-label={a.bestSlots} className="flex flex-wrap gap-2 max-mobile:w-full">
          {best.map((s, i) => {
            const label = a.plan(a.slot(s.day, s.hour))
            return (
              <li
                key={`${s.day}-${s.hour}`}
                className="flex items-center gap-2.5 rounded-full border border-line bg-glass-2 py-[5px] pl-1.5 pr-[5px] max-mobile:flex-[100%]"
              >
                <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-pill text-[12.5px] font-bold text-on-pill">{i + 1}</span>
                <span className="leading-[1.15] max-mobile:flex max-mobile:flex-1 max-mobile:items-baseline max-mobile:gap-2">
                  <b className="block whitespace-nowrap text-xs font-bold">{a.slotShort(s.day, s.hour)}</b>
                  <small className="block text-[12.5px] text-muted">{a.index(Math.round(s.value * 100))}</small>
                </span>
                <IconButton label={label} icon={CalendarPlus} size="sm" href={planHref(s.day, s.hour)} />
              </li>
            )
          })}
        </ol>
      </div>

      <div
        ref={tipRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-[5] grid gap-[3px] whitespace-nowrap rounded-xl border border-line bg-float px-[11px] py-2 text-2xs shadow-pop transition-opacity duration-150"
        style={{ opacity: tip ? 1 : 0, transform: tip ? `translate(${tip.x}px, ${tip.y}px)` : undefined }}
      >
        {active != null && (
          <>
            <b className="font-bold">{a.cell(Math.floor(active / 24), active % 24)}</b>
            <span className="text-muted">
              {a.engagementIndex} <strong className="text-text">{Math.round(cells[active] * 100)}</strong>
            </span>
            {rank(active) >= 0 && (
              <span className="text-muted">
                {a.bestSlot} <strong className="text-text">#{rank(active) + 1}</strong>
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
