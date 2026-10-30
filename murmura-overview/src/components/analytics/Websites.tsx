import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  CircleDollarSign,
  Ellipsis,
  Globe,
  Link2,
  LoaderCircle,
  Mail,
  Megaphone,
  Monitor,
  MousePointerClick,
  Play,
  Plug,
  RefreshCw,
  Search,
  Settings2,
  Share2,
} from 'lucide-react'
import type { Range } from '../../data/analyticsData'
import { useGa4 } from '../../data/ga4Store'
import { NETWORK_LABEL } from '../../data/selectors'
import { useWorkspace } from '../../data/store'
import type { NetworkId } from '../../data/types'
import { selectWebsites } from '../../data/webAnalytics'
import type { ChannelGroup, PageRow, WebMetric, WebsitesModel } from '../../data/webAnalytics'
import { useI18n } from '../../i18n'
import { useToast } from '../Toast'
import { Badge, BrandMark, Button, NetIcon, Segmented, StatusPill, cn } from '../ui'
import { Ga4Dialog } from './Ga4Dialog'
import { PeriodChart } from './PeriodChart'
import type { ChartTone } from './PeriodChart'
import { Sparkline } from './Sparkline'
import { AnCard, CELL_LABEL, Empty, FilterChip, Figure, Legend, SortHeader, TD } from './parts'
import type { Sort } from './parts'

type WebCard = 'web' | 'src' | 'pages'

const METRIC_TONE: Record<WebMetric, ChartTone> = { sessions: 'sea', views: 'lilac', keyEvents: 'pine' }

const CHANNEL_ICON: Record<ChannelGroup, LucideIcon> = {
  organicSearch: Search,
  direct: MousePointerClick,
  organicSocial: Share2,
  paidSocial: Megaphone,
  referral: Link2,
  email: Mail,
  paidSearch: CircleDollarSign,
  organicVideo: Play,
  display: Monitor,
  other: Ellipsis,
}

/** Landing pages listed before "Show all". */
const PAGE_LIMIT = 8

interface WebsitesProps {
  range: Range
  /** The page's network filter: highlights that network among social sources. */
  network: NetworkId | null
  card: (id: WebCard) => { id: WebCard; expanded: boolean; onToggle: () => void }
}

/**
 * Websites (Google Analytics 4) under the social analytics: sessions against
 * the previous period, where visits come from (social networks first), and
 * landing pages, for every site or one. Not part of the reference; built from
 * its parts (cards, chips, charts, tables) so it reads as the same product.
 */
export function Websites({ range, network, card }: WebsitesProps) {
  const { ws } = useWorkspace()
  const { t } = useI18n()
  const toast = useToast()
  const ga = useGa4()
  const w = t.analytics.web
  const [picked, setPicked] = useState<string | null>(null)
  const [metric, setMetric] = useState<WebMetric>('sessions')
  const [breakdown, setBreakdown] = useState<'social' | 'channels'>('social')
  const [dialog, setDialog] = useState(false)

  // A picked site can drop out (settings edited, demo ↔ live): fall back to every site.
  const siteId = ga.entries.some((e) => e.site.id === picked) ? picked : null
  const model = useMemo(() => (ga.entries.length ? selectWebsites(ga.entries, ws.brands, range, siteId) : null), [ga.entries, ws.brands, range, siteId])

  const brandName = (id: string) => ws.brands.find((b) => b.id === id)?.name ?? ''
  const without = ws.brands.filter((b) => !ws.websites.some((s) => s.brandId === b.id)).map((b) => b.name)
  const missing = ga.missing.map((s) => s.domain)
  const notes = [without.length ? w.noSite(without) : '', missing.length ? (ga.status === 'live' ? w.noProperty(missing) : w.waiting(missing)) : ''].filter(Boolean)
  const errors = [
    ga.error && `${w.errors[ga.error.kind]}${ga.error.detail ? ` (${ga.error.detail})` : ''}`,
    ...Object.entries(ga.errors).map(([id, e]) => w.siteError(ws.websites.find((s) => s.id === id)?.domain ?? id, `${w.errors[e.kind]}${e.detail ? ` (${e.detail})` : ''}`)),
  ].filter(Boolean) as string[]

  const status =
    ga.status === 'live' && ga.updatedAt ? w.source.live(t.dates.time(ga.updatedAt)) : ga.status === 'connecting' ? w.source.connecting : w.source.demo

  return (
    <section aria-labelledby="an-web-h" className="mt-8 max-mobile:mt-6">
      <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="an-web-h" className="text-[22px] font-bold tracking-[-0.02em]">
          {w.title}
        </h2>
        <StatusPill tone={ga.status === 'live' ? 'pine' : ga.status === 'connecting' ? 'butter' : 'plain'} size="md">
          {ga.status === 'connecting' && <LoaderCircle size={14} aria-hidden className="-ml-1 animate-spin" />}
          {status}
        </StatusPill>
        <div className="ml-auto flex flex-wrap gap-2 max-mobile:ml-0 max-mobile:w-full">
          {ga.status === 'live' && (
            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={async () => {
                await ga.refresh()
                toast({ text: w.toast.refreshed, icon: RefreshCw })
              }}
            >
              {w.refresh}
            </Button>
          )}
          <Button variant="ghost" size="sm" icon={ga.status === 'live' ? Settings2 : Plug} disabled={ga.status === 'connecting'} onClick={() => setDialog(true)} className="max-mobile:flex-1">
            {ga.status === 'live' ? w.settings : w.connect}
          </Button>
        </div>
      </header>

      {errors.length > 0 && (
        <div role="alert" className="mb-3 grid gap-1 rounded-2xl bg-[color-mix(in_srgb,var(--coral)_12%,transparent)] px-3.5 py-2.5 text-2xs font-semibold text-bad">
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}

      {model ? (
        <>
          <nav aria-label={w.filter} className="mb-[18px] flex flex-wrap items-center gap-2 max-mobile:-mx-3.5 max-mobile:flex-nowrap max-mobile:overflow-x-auto max-mobile:px-3.5 max-mobile:py-0.5 max-mobile:[scrollbar-width:none]">
            <FilterChip current={siteId === null} onClick={() => setPicked(null)} lead={<Globe size={18} aria-hidden className="ml-1" />} label={w.allSites} count={ga.entries.length} />
            {ga.entries.map(({ site }) => {
              const brand = ws.brands.find((b) => b.id === site.brandId)
              return (
                <FilterChip
                  key={site.id}
                  current={siteId === site.id}
                  onClick={() => setPicked(site.id)}
                  lead={brand ? <BrandMark brand={brand} size="xs" className="rounded-full" /> : <Globe size={18} aria-hidden />}
                  label={<span title={brandName(site.brandId)}>{site.domain}</span>}
                />
              )
            })}
            {notes.length > 0 && <span className="ml-auto text-right text-2xs font-semibold text-muted max-mobile:hidden">{notes.join(' · ')}</span>}
          </nav>
          {notes.length > 0 && <p className="-mt-2.5 mb-4 text-2xs font-semibold text-muted mobile:hidden">{notes.join(' · ')}</p>}

          <div className="an-web-grid">
            <AnCard {...card('web')} area="web" title={w.traffic.title}>
              <Traffic model={model} metric={metric} onMetric={setMetric} />
            </AnCard>
            <AnCard
              {...card('src')}
              area="src"
              title={w.sources.title}
              wrapTools
              tools={
                <Segmented
                  label={w.sources.label}
                  value={breakdown}
                  onChange={setBreakdown}
                  options={(['social', 'channels'] as const).map((v) => ({ value: v, label: w.sources.options[v] }))}
                />
              }
            >
              <Sources model={model} breakdown={breakdown} network={network} />
            </AnCard>
            <AnCard {...card('pages')} area="pages" title={w.pages.title}>
              <Pages rows={model.pages} range={range} expanded={card('pages').expanded} />
            </AnCard>
          </div>
        </>
      ) : (
        <div className="rounded-card border border-rim bg-glass p-5 shadow-card">
          <Empty icon={Globe} title={w.emptyTitle} text={w.emptyText} />
          {notes.length > 0 && <p className="text-center text-2xs text-muted">{notes.join(' · ')}</p>}
          <div className="mt-4 flex justify-center">
            <Button icon={Plug} onClick={() => setDialog(true)}>
              {w.connect}
            </Button>
          </div>
        </div>
      )}

      {dialog && <Ga4Dialog onClose={() => setDialog(false)} />}
    </section>
  )
}

/* ───────────────────────── traffic ───────────────────────── */

function Traffic({ model, metric, onMetric }: { model: WebsitesModel; metric: WebMetric; onMetric: (m: WebMetric) => void }) {
  const { t } = useI18n()
  const w = t.analytics.web
  const m = model.metrics[metric]
  const s = model.stats
  const points = (s.engagementRate - s.engagementRateBefore) * 100
  const tiles: [string, string, string | null][] = [
    [w.traffic.engagementRate, t.numbers.pct1(s.engagementRate), s.engagementRateBefore ? w.traffic.points(`${points >= 0 ? '+' : '−'}${Math.abs(points).toFixed(1)}`) : null],
    [w.traffic.avgTime, w.duration(s.avgSeconds), null],
    [w.traffic.keyEventRate, t.numbers.pct1(s.keyEventRate), null],
  ]
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Figure value={t.numbers.compact(m.total)}>
          <span className="inline-flex items-center gap-2">
            {m.change !== null && <Badge tone={m.change >= 0 ? 'pine' : 'coral'}>{t.numbers.signedPct1(m.change)}</Badge>}
            <span className="text-2xs text-muted">{w.traffic.sub(metric, model.range)}</span>
          </span>
        </Figure>
        <div className="max-mobile:w-full max-mobile:[&>div]:flex max-mobile:[&>div]:w-full max-mobile:[&_button]:flex-1 max-mobile:[&_button]:px-1.5">
          <Segmented label={w.traffic.label} value={metric} onChange={onMetric} options={(['sessions', 'views', 'keyEvents'] as const).map((v) => ({ value: v, label: w.traffic.options[v] }))} />
        </div>
      </div>
      <dl className="mt-3.5 grid grid-cols-3 gap-2 max-[480px]:grid-cols-1">
        {tiles.map(([label, value, note]) => (
          <div key={label} className="rounded-2xl border border-line bg-glass-2 px-3 py-2.5">
            <dt className="truncate text-[12.5px] text-muted">{label}</dt>
            <dd className="flex items-baseline gap-2 text-lg font-bold tracking-[-0.01em] tabular-nums">
              {value}
              {note && <small className={cn('text-[12.5px] font-semibold', Math.abs(points) < 0.05 ? 'text-muted' : points > 0 ? 'text-good' : 'text-bad')}>{note}</small>}
            </dd>
          </div>
        ))}
      </dl>
      <Legend tone={METRIC_TONE[metric]} label={w.traffic.legend(metric)} previous={t.analytics.previousPeriod} />
      <PeriodChart key={metric} current={m.current} previous={m.previous} days={model.days} tone={METRIC_TONE[metric]} label={w.traffic.chart(metric)} />
    </>
  )
}

/* ───────────────────────── sources ───────────────────────── */

function Sources({ model, breakdown, network }: { model: WebsitesModel; breakdown: 'social' | 'channels'; network: NetworkId | null }) {
  const { t } = useI18n()
  const w = t.analytics.web.sources
  const row = 'grid grid-cols-[auto_minmax(0,9em)_minmax(40px,1fr)_auto_3.2em] items-center gap-2.5 border-b border-line py-[7px] text-xs last:border-b-0 max-mobile:grid-cols-[auto_minmax(0,1fr)_minmax(40px,1fr)_auto_3em]'
  const meter = (fill: number) => (
    <span aria-hidden className="block h-2.5 overflow-hidden rounded-full bg-well">
      <span className="block h-full w-full origin-left rounded-full bg-ink opacity-82 transition-transform duration-700 ease-soft" style={{ transform: `scaleX(${fill})` }} />
    </span>
  )
  return (
    <>
      <Figure value={t.numbers.compact(model.social.total)}>
        <span className="text-2xs text-muted">{w.sub(t.numbers.pct0(model.social.share))}</span>
      </Figure>
      {breakdown === 'social' ? (
        model.social.rows.length ? (
          <ul className="mt-3.5 grid gap-1">
            {model.social.rows.map((r) => (
              <li
                key={r.network}
                title={w.row(NETWORK_LABEL[r.network], t.numbers.int(r.sessions), t.numbers.pct0(r.share))}
                aria-current={r.network === network ? 'true' : undefined}
                className={cn(row, r.network === network && '-mx-2 rounded-xl border-transparent bg-well px-2')}
              >
                <NetIcon network={r.network} size="sm" />
                <span className="truncate font-semibold">{NETWORK_LABEL[r.network]}</span>
                {meter(r.fill)}
                <b className="font-bold tabular-nums">{t.numbers.compact(r.sessions)}</b>
                <span className="text-right text-muted tabular-nums">{t.numbers.pct0(r.share)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-center text-2xs text-muted">{w.emptySocial}</p>
        )
      ) : (
        <ul className="mt-3.5 grid gap-1">
          {model.channels.map((r) => {
            const Icon = CHANNEL_ICON[r.group]
            return (
              <li key={r.group} title={w.row(w.channels[r.group], t.numbers.int(r.sessions), t.numbers.pct0(r.share))} className={row}>
                <span className="grid size-7 place-items-center rounded-full border border-line bg-glass-2">
                  <Icon size={15} aria-hidden />
                </span>
                <span className="truncate font-semibold">{w.channels[r.group]}</span>
                {meter(r.fill)}
                <b className="font-bold tabular-nums">{t.numbers.compact(r.sessions)}</b>
                <span className="text-right text-muted tabular-nums">{t.numbers.pct0(r.share)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

/* ───────────────────────── landing pages ───────────────────────── */

type PageKey = 'page' | 'sessions' | 'growth' | 'eng' | 'time' | 'keyEvents' | 'keyRate'

function Pages({ rows, range, expanded }: { rows: PageRow[]; range: Range; expanded: boolean }) {
  const { t } = useI18n()
  const p = t.analytics.web.pages
  const [sort, setSort] = useState<Sort<PageKey>>({ key: 'sessions', dir: -1 })
  const [all, setAll] = useState(false)

  const value = (r: PageRow, key: PageKey): string | number =>
    key === 'page'
      ? `${r.site.domain}${r.path}`
      : key === 'growth'
        ? r.growth ?? Number.POSITIVE_INFINITY
        : key === 'eng'
          ? r.engagementRate
          : key === 'time'
            ? r.avgSeconds
            : key === 'keyRate'
              ? r.keyEventRate
              : r[key]
  const sorted = [...rows].sort((x, y) => {
    const a = value(x, sort.key)
    const b = value(y, sort.key)
    return (typeof a === 'string' ? a.localeCompare(b as string) : a - (b as number)) * sort.dir
  })
  const shown = all || expanded ? sorted : sorted.slice(0, PAGE_LIMIT)

  const columns: { key: PageKey; label: string; right?: boolean }[] = [
    { key: 'page', label: p.page },
    { key: 'sessions', label: p.sessions, right: true },
    { key: 'growth', label: p.change, right: true },
    { key: 'eng', label: p.engRate, right: true },
    { key: 'time', label: p.avgTime, right: true },
    { key: 'keyEvents', label: p.keyEvents, right: true },
    { key: 'keyRate', label: p.keyRate, right: true },
  ]

  if (!rows.length) return <p className="py-6 text-center text-2xs text-muted">{p.empty}</p>
  return (
    <>
      <div className="-mx-1.5 overflow-x-auto">
        <table className="w-full border-collapse text-xs max-mobile:block">
          <caption className="sr-only">{p.caption(range)}</caption>
          <thead className="max-mobile:hidden">
            <tr>
              {columns.map((c) => (
                <SortHeader key={c.key} label={c.label} right={c.right} column={c.key} sort={sort} onSort={setSort} textColumn="page" />
              ))}
              <th scope="col" className="w-[120px] whitespace-nowrap border-b border-line px-3 py-2.5 text-left text-2xs font-semibold text-muted">
                {p.trend}
              </th>
            </tr>
          </thead>
          <tbody className="max-mobile:block">
            {shown.map((r) => (
              <tr key={r.key} className="border-b border-line last:border-b-0 max-mobile:grid max-mobile:grid-cols-3 max-mobile:items-center max-mobile:gap-x-3 max-mobile:gap-y-2.5 max-mobile:px-1 max-mobile:py-3.5">
                <th scope="row" className="px-3 py-2.5 text-left font-medium max-mobile:col-span-2 max-mobile:p-0">
                  <span className="flex items-center gap-2.5 pointer-coarse:min-h-11">
                    {r.brand && <BrandMark brand={r.brand} size="sm" />}
                    <span className="min-w-0">
                      <b className="block truncate font-semibold">{r.path}</b>
                      <small className="block truncate text-2xs text-muted">{r.site.domain}</small>
                    </span>
                  </span>
                </th>
                <td className={cn(TD, 'font-semibold')}>
                  <span className={CELL_LABEL}>{p.sessions}</span>
                  {t.numbers.compact(r.sessions)}
                </td>
                <td className={TD}>
                  <span className={CELL_LABEL}>{p.change}</span>
                  {r.growth === null ? '—' : <span className={cn('font-bold', r.growth >= 0 ? 'text-good' : 'text-bad')}>{t.numbers.signedPct1(r.growth)}</span>}
                </td>
                <td className={TD}>
                  <span className={CELL_LABEL}>{p.engRate}</span>
                  {t.numbers.pct1(r.engagementRate)}
                </td>
                <td className={TD}>
                  <span className={CELL_LABEL}>{p.avgTime}</span>
                  {t.analytics.web.duration(r.avgSeconds)}
                </td>
                <td className={TD}>
                  <span className={CELL_LABEL}>{p.keyEvents}</span>
                  {t.numbers.int(r.keyEvents)}
                </td>
                <td className={TD}>
                  <span className={CELL_LABEL}>{p.keyRate}</span>
                  {t.numbers.pct1(r.keyEventRate)}
                </td>
                <td className="px-3 py-2.5 max-mobile:col-start-3 max-mobile:row-start-1 max-mobile:justify-self-end max-mobile:p-0">
                  <Sparkline values={r.trend} tone={r.growth === null || r.growth >= 0 ? 'pine' : 'coral'} className="ml-auto max-mobile:w-[84px]" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!expanded && rows.length > PAGE_LIMIT && (
        <div className="mt-3 flex justify-center">
          <Button variant="ghost" size="sm" aria-expanded={all} onClick={() => setAll((v) => !v)}>
            {all ? p.showFewer : p.showAll(rows.length)}
          </Button>
        </div>
      )}
    </>
  )
}
