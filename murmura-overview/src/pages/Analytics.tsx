import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Download, Eye, Heart, ImageOff, Layers, Link, PieChart, TrendingUp, Users } from 'lucide-react'
import { PageTitle, Stat } from '../components/PageHead'
import { useToast } from '../components/Toast'
import { usePostActions } from '../components/usePostActions'
import { EDGE_FADE, useScrollEdges } from '../components/useScrollEdges'
import { PostDrawer } from '../components/calendar/PostDrawer'
import { Heatmap } from '../components/analytics/Heatmap'
import { PeriodChart } from '../components/analytics/PeriodChart'
import type { ChartTone } from '../components/analytics/PeriodChart'
import { ReportControls } from '../components/analytics/ReportControls'
import { Websites } from '../components/analytics/Websites'
import { Sparkline } from '../components/analytics/Sparkline'
import { AnCard, CELL_LABEL, Empty, FilterChip, Figure, Legend, SortHeader, TD } from '../components/analytics/parts'
import type { Sort } from '../components/analytics/parts'
import { analyticsCsv, download } from '../components/analytics/exportCsv'
import { Badge, BrandMark, Button, NetIcon, NetStack, Segmented, StatusPill, cn } from '../components/ui'
import {
  RANGES,
  activeNetworks,
  brandValue,
  engagements,
  heatFor,
  selectAnalytics,
  topValue,
} from '../data/analytics'
import type { AnalyticsModel, BrandBy, Range, TableRow, TopBy } from '../data/analytics'
import { coverPhoto } from '../data/assets'
import { NETWORK_LABEL, clip } from '../data/selectors'
import { useWorkspace } from '../data/store'
import type { ChannelStatus, NetworkId, Tone } from '../data/types'
import { useI18n } from '../i18n'

type Metric = 'impressions' | 'engagements' | 'clicks'
type SortKey = 'name' | 'accounts' | 'followers' | 'growth' | 'impressions' | 'eng' | 'posts'
type CardId = 'grow' | 'imp' | 'best' | 'mix' | 'net' | 'top' | 'brands' | 'web' | 'src' | 'pages'

const METRIC_TONE: Record<Metric, ChartTone> = { impressions: 'sea', engagements: 'coral', clicks: 'lilac' }
const CHANNEL_TONE: Record<ChannelStatus, Tone> = { connected: 'pine', expiring: 'butter', disconnected: 'coral' }

/**
 * Analytics (#/analytics, #/analytics/:network): audience, reach and
 * engagement for 7, 30 or 90 days, for every network or one of them. Laid out
 * like the reference: a 12-column grid of cards (6 from 1340px, 1 from 1000px),
 * each of which can be expanded over the page.
 */
export function Analytics({ now, hash }: { now: Date; hash: string }) {
  const { ws } = useWorkspace()
  const { t } = useI18n()
  const toast = useToast()
  const a = t.analytics

  const segment = hash.split('/')[2] as NetworkId | undefined
  const network = segment && activeNetworks(ws).includes(segment) ? segment : null
  const [range, setRange] = useState<Range>(30)
  const [metric, setMetric] = useState<Metric>('impressions')
  const [topBy, setTopBy] = useState<TopBy>('reach')
  const [brandBy, setBrandBy] = useState<BrandBy>('followers')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'followers', dir: -1 })
  const [expanded, setExpanded] = useState<CardId | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  // The heatmap has its own network switch; it follows the page filter whenever that changes.
  const [heatNet, setHeatNet] = useState<NetworkId | null>(network)
  const [lastNetwork, setLastNetwork] = useState(network)
  if (lastNetwork !== network) {
    setLastNetwork(network)
    setHeatNet(network)
  }

  // Ranges end "now": recompute once a minute, not on every tick of the mock clock.
  const minute = Math.floor(now.getTime() / 60_000)
  const model = useMemo(() => selectAnalytics(ws, new Date(minute * 60_000), range, network), [ws, minute, range, network])
  const heat = useMemo(() => heatFor(ws, heatNet), [ws, heatNet])
  const { publish, duplicate, remove } = usePostActions(now, () => setOpenId(null))
  const chipsScroll = useScrollEdges<HTMLElement>()

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(null)
    const root = document.documentElement
    root.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      root.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [expanded])

  const netLabel = network ? NETWORK_LABEL[network] : null
  const scope = a.scope(netLabel)
  const s = model.stats
  const open = openId ? ws.posts.find((p) => p.id === openId) ?? null : null

  const exportCsv = () => {
    download(a.csv.file(range, network), analyticsCsv(model, ws, t, new Date()))
    toast({ text: a.exported(range), icon: Download })
  }

  const card = <T extends CardId>(id: T) => ({
    id,
    expanded: expanded === id,
    onToggle: () => setExpanded((cur) => (cur === id ? null : id)),
  })

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center gap-x-[clamp(28px,4vw,72px)] gap-y-[18px] max-mobile:mb-[18px] max-mobile:gap-y-3">
        <PageTitle lines={[a.title]} label={a.title} />
        <dl className="flex flex-wrap gap-x-[clamp(24px,3.2vw,56px)] gap-y-3.5 max-mobile:grid max-mobile:w-full max-mobile:grid-cols-2 max-mobile:gap-x-3.5 max-mobile:gap-y-2.5">
          <Stat icon={Users} value={t.numbers.compact(s.audience)} label={a.audience(s.accounts)} />
          <Stat icon={TrendingUp} value={t.numbers.compact(s.gained)} badge={t.numbers.signedPct1(s.growth)} label={a.newFollowers(range)} />
          <Stat icon={Eye} value={t.numbers.compact(s.impressions)} label={a.impressions(range)} />
          <Stat icon={Heart} value={t.numbers.pct1(s.engagementRate)} label={a.engagement(s.posts)} />
        </dl>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 max-mobile:ml-0 max-mobile:w-full">
          <Segmented label={a.dateRange} value={range} onChange={setRange} options={RANGES.map((r) => ({ value: r, label: a.rangeOption(r) }))} />
          <Button icon={Download} onClick={exportCsv} className="max-mobile:flex-1">
            {a.exportCsv}
          </Button>
          <ReportControls scope={scope} now={now} />
        </div>
      </header>

      <nav
        ref={chipsScroll.ref}
        aria-label={a.filterByNetwork}
        style={chipsScroll.style}
        className={cn(
          '-mt-1.5 mb-[18px] flex flex-wrap items-center gap-2 max-mobile:-mx-3.5 max-mobile:-mt-1 max-mobile:mb-4 max-mobile:flex-nowrap max-mobile:overflow-x-auto max-mobile:overscroll-x-contain max-mobile:px-3.5 max-mobile:py-0.5 max-mobile:[scrollbar-width:none]',
          EDGE_FADE,
        )}
      >
        {model.chips.map((chip) => (
          <FilterChip
            key={chip.network ?? 'all'}
            href={chip.network ? `#/analytics/${chip.network}` : '#/analytics'}
            current={chip.network === network}
            lead={
              chip.network ? (
                <NetIcon network={chip.network} surface={chip.network === network ? 'on-pill' : 'chip'} />
              ) : (
                <Layers size={18} aria-hidden className="ml-1" />
              )
            }
            label={chip.network ? NETWORK_LABEL[chip.network] : a.allNetworks}
            count={chip.accounts}
          />
        ))}
        <span className="ml-auto text-2xs font-semibold text-muted max-mobile:hidden">{a.note(ws.brands.length, range)}</span>
      </nav>

      {expanded && <div aria-hidden onClick={() => setExpanded(null)} className="fixed inset-0 z-[55] animate-fade bg-[rgb(16_18_20/0.28)] dark:bg-black/50" />}

      <div className="an-grid">
        <AnCard {...card('grow')} area="grow" title={a.growth.title}>
          <Figure value={`+${t.numbers.compact(model.growth.gained)}`}>
            <span className="text-2xs text-muted">
              {a.growth.sub(range, model.growth.vsBefore === null ? null : t.numbers.signedPct1(model.growth.vsBefore))}
            </span>
          </Figure>
          <Legend tone="pine" label={a.growth.legend} previous={a.previousPeriod} />
          <PeriodChart current={model.growth.current} previous={model.growth.previous} days={model.days} tone="pine" label={a.growth.chart} />
        </AnCard>

        <AnCard {...card('imp')} area="imp" title={a.metrics.title}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Figure value={t.numbers.compact(model.metrics[metric].total)}>
              <span className="inline-flex items-center gap-2">
                {model.metrics[metric].change !== null && (
                  <Badge tone={model.metrics[metric].change! >= 0 ? 'pine' : 'coral'}>{t.numbers.signedPct1(model.metrics[metric].change!)}</Badge>
                )}
                <span className="text-2xs text-muted">{a.metrics.sub(metric, range)}</span>
              </span>
            </Figure>
            <div className="max-mobile:w-full max-mobile:[&>div]:flex max-mobile:[&>div]:w-full max-mobile:[&_button]:flex-1 max-mobile:[&_button]:px-1.5">
              <Segmented
                label={a.metrics.label}
                value={metric}
                onChange={setMetric}
                options={(['impressions', 'engagements', 'clicks'] as const).map((m) => ({ value: m, label: a.metrics.options[m] }))}
              />
            </div>
          </div>
          <Legend tone={METRIC_TONE[metric]} label={a.metrics.legend(metric)} previous={a.previousPeriod} />
          <PeriodChart
            key={metric}
            current={model.metrics[metric].current}
            previous={model.metrics[metric].previous}
            days={model.days}
            tone={METRIC_TONE[metric]}
            label={a.metrics.chart(metric)}
          />
        </AnCard>

        <AnCard {...card('best')} area="best" title={a.best.title}>
          <Heatmap cells={heat.cells} best={heat.best} network={heatNet} networks={activeNetworks(ws)} onNetwork={setHeatNet} timeZone={ws.timeZone} />
        </AnCard>

        <AnCard {...card('mix')} area="mix" title={a.mix.title}>
          <Mix model={model} />
        </AnCard>

        <AnCard
          {...card('net')}
          area="net"
          title={netLabel ? a.table.accountsOn(netLabel) : a.table.byNetwork}
          tools={
            netLabel && (
              <Button variant="ghost" size="sm" icon={ArrowLeft} href="#/analytics">
                {a.allNetworks}
              </Button>
            )
          }
        >
          <NetTable rows={model.table} byAccount={!!network} range={range} network={netLabel} sort={sort} onSort={setSort} />
        </AnCard>

        <AnCard
          {...card('top')}
          area="top"
          title={a.top.title}
          wrapTools
          tools={
            <Segmented label={a.top.rankBy} value={topBy} onChange={setTopBy} options={(['reach', 'eng', 'clicks'] as const).map((v) => ({ value: v, label: a.top.options[v] }))} />
          }
        >
          <TopPosts model={model} by={topBy} network={netLabel} onOpen={setOpenId} />
        </AnCard>

        <AnCard
          {...card('brands')}
          area="brands"
          title={a.brands.title}
          wrapTools
          tools={
            <Segmented
              label={a.brands.compareBy}
              value={brandBy}
              onChange={setBrandBy}
              options={(['followers', 'eng', 'impressions'] as const).map((v) => ({ value: v, label: a.brands.options[v] }))}
            />
          }
        >
          <Brands model={model} by={brandBy} />
        </AnCard>
      </div>

      <Websites range={range} network={network} card={card} />

      <PostDrawer
        post={open}
        brand={open ? ws.brands.find((b) => b.id === open.brandId) : undefined}
        author={open ? ws.team.find((m) => m.id === open.authorId) : undefined}
        now={now}
        onClose={() => setOpenId(null)}
        onPublish={publish}
        onDuplicate={duplicate}
        onDelete={remove}
      />
    </>
  )
}

/* ───────────────────────── content mix ───────────────────────── */

function Mix({ model }: { model: AnalyticsModel }) {
  const { t } = useI18n()
  const m = t.analytics.mix
  const { posts, deliveries, rows } = model.mix
  return (
    <>
      <Figure value={t.numbers.int(posts)}>
        <span className="text-2xs text-muted">{m.sub(posts, posts ? deliveries : null, model.range)}</span>
      </Figure>
      {rows.length ? (
        <ul className="mt-3.5 grid gap-1">
          {rows.map((r) => (
            <li
              key={r.network}
              title={m.row(NETWORK_LABEL[r.network], r.count, deliveries)}
              className="grid grid-cols-[auto_minmax(0,7.5em)_minmax(40px,1fr)_auto_3.2em] items-center gap-2.5 border-b border-line py-[7px] text-xs last:border-b-0 max-mobile:grid-cols-[auto_minmax(0,1fr)_minmax(40px,1fr)_auto_3em]"
            >
              <NetIcon network={r.network} size="sm" />
              <span className="truncate font-semibold">{NETWORK_LABEL[r.network]}</span>
              <span aria-hidden className="block h-2.5 overflow-hidden rounded-full bg-well">
                <span className="block h-full w-full origin-left rounded-full bg-ink opacity-82 transition-transform duration-700 ease-soft" style={{ transform: `scaleX(${r.fill})` }} />
              </span>
              <b className="font-bold tabular-nums">{r.count}</b>
              <span className="text-right text-muted tabular-nums">{t.numbers.pct0(r.share)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={PieChart} title={m.emptyTitle} text={m.emptyText} />
      )}
    </>
  )
}

/* ───────────────────────── by network / accounts ───────────────────────── */

interface NetTableProps {
  rows: TableRow[]
  byAccount: boolean
  range: Range
  network: string | null
  sort: Sort<SortKey>
  onSort: (s: Sort<SortKey>) => void
}

function NetTable({ rows, byAccount, range, network, sort, onSort }: NetTableProps) {
  const { t } = useI18n()
  const tb = t.analytics.table
  const name = (r: TableRow) => (r.brand ? r.brand.name : NETWORK_LABEL[r.network])
  const value = (r: TableRow, key: SortKey): string | number =>
    key === 'name' ? name(r) : key === 'eng' ? r.engagementRate : r[key]
  const sorted = [...rows].sort((x, y) => {
    const a = value(x, sort.key)
    const b = value(y, sort.key)
    return (typeof a === 'string' ? a.localeCompare(b as string) : a - (b as number)) * sort.dir
  })

  const columns: { key: SortKey; label: string; right?: boolean }[] = [
    { key: 'name', label: byAccount ? tb.account : tb.network },
    { key: 'accounts', label: byAccount ? tb.status : tb.accounts, right: true },
    { key: 'followers', label: tb.followers, right: true },
    { key: 'growth', label: tb.growth, right: true },
    { key: 'impressions', label: tb.impressions, right: true },
    { key: 'eng', label: tb.engRate, right: true },
    { key: 'posts', label: tb.posts, right: true },
  ]
  const td = TD

  return (
    <div className="-mx-1.5 overflow-x-auto">
      <table className="w-full border-collapse text-xs max-mobile:block">
        <caption className="sr-only">{tb.caption(range, byAccount)}</caption>
        <thead className="max-mobile:hidden">
          <tr>
            {columns.map((c) => (
              <SortHeader key={c.key} label={c.label} right={c.right} sort={sort} column={c.key} onSort={onSort} />
            ))}
            <th scope="col" className="w-[120px] whitespace-nowrap border-b border-line px-3 py-2.5 text-left text-2xs font-semibold text-muted">
              {tb.trend}
            </th>
          </tr>
        </thead>
        <tbody className="max-mobile:block">
          {sorted.length ? (
            sorted.map((r) => {
              const lead = r.brand ? <BrandMark brand={r.brand} size="md" /> : <NetIcon network={r.network} size="md" />
              const person = (
                <>
                  {lead}
                  <span className="min-w-0">
                    <b className="block truncate font-semibold">{name(r)}</b>
                    <small className="block truncate text-2xs text-muted">{r.channel ? r.channel.handle : tb.accountCount(r.accounts)}</small>
                  </span>
                </>
              )
              return (
                <tr
                  key={r.key}
                  onClick={(e) => {
                    if (!byAccount && !(e.target as HTMLElement).closest('a')) window.location.hash = `#/analytics/${r.network}`
                  }}
                  className={cn(
                    'border-b border-line last:border-b-0 max-mobile:grid max-mobile:grid-cols-3 max-mobile:items-center max-mobile:gap-x-3 max-mobile:gap-y-2.5 max-mobile:px-1 max-mobile:py-3.5',
                    !byAccount && 'cursor-pointer hover:bg-well/60',
                  )}
                >
                  <th scope="row" className="px-3 py-2.5 text-left font-medium max-mobile:col-span-2 max-mobile:p-0">
                    {byAccount ? (
                      <span className="flex items-center gap-2.5 pointer-coarse:min-h-11">{person}</span>
                    ) : (
                      <a href={`#/analytics/${r.network}`} className="flex items-center gap-2.5 pointer-coarse:min-h-11 [&:hover_b]:underline [&:hover_b]:underline-offset-2">
                        {person}
                      </a>
                    )}
                  </th>
                  <td className={cn(td, !byAccount && 'max-mobile:hidden')}>
                    <span className={CELL_LABEL}>{byAccount ? tb.status : tb.accounts}</span>
                    {r.channel ? (
                      <StatusPill tone={CHANNEL_TONE[r.channel.status]} size="md">
                        {tb.channelStatus[r.channel.status]}
                      </StatusPill>
                    ) : (
                      r.accounts
                    )}
                  </td>
                  <td className={cn(td, 'font-semibold')}>
                    <span className={CELL_LABEL}>{tb.followers}</span>
                    {t.numbers.compact(r.followers)}
                  </td>
                  <td className={td}>
                    <span className={CELL_LABEL}>{tb.growth}</span>
                    <span className={cn('font-bold', r.growth >= 0 ? 'text-good' : 'text-bad')}>{t.numbers.signedPct1(r.growth)}</span>
                  </td>
                  <td className={td}>
                    <span className={CELL_LABEL}>{tb.impressions}</span>
                    {t.numbers.compact(r.impressions)}
                  </td>
                  <td className={td}>
                    <span className={CELL_LABEL}>{tb.engRate}</span>
                    {r.posts ? t.numbers.pct1(r.engagementRate) : '—'}
                  </td>
                  <td className={td}>
                    <span className={CELL_LABEL}>{tb.posts}</span>
                    {r.posts}
                  </td>
                  <td className="px-3 py-2.5 max-mobile:col-start-3 max-mobile:row-start-1 max-mobile:justify-self-end max-mobile:p-0">
                    <Sparkline values={r.trend} tone={r.growth >= 0 ? 'pine' : 'coral'} className="ml-auto max-mobile:w-[84px]" />
                  </td>
                </tr>
              )
            })
          ) : (
            <tr className="max-mobile:block">
              <td colSpan={8} className="max-mobile:block">
                <Empty icon={Link} title={tb.emptyTitle} text={tb.emptyText(network)} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ───────────────────────── top posts ───────────────────────── */

function TopPosts({ model, by, network, onOpen }: { model: AnalyticsModel; by: TopBy; network: string | null; onOpen: (id: string) => void }) {
  const { t } = useI18n()
  const { ws } = useWorkspace()
  const tp = t.analytics.top
  const posts = [...model.posts].sort((a, b) => topValue(b.metrics, by) - topValue(a.metrics, by)).slice(0, 6)
  const show = (v: number) => (by === 'reach' ? t.numbers.compact(v) : by === 'eng' ? t.numbers.pct1(v) : t.numbers.int(v))

  if (!posts.length) return <Empty icon={ImageOff} title={tp.emptyTitle} text={tp.emptyText(network, model.range)} />
  return (
    <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(200px,100%),1fr))] gap-3 max-mobile:grid-cols-2 max-mobile:gap-2.5">
      {posts.map((p, i) => {
        const brand = ws.brands.find((b) => b.id === p.brandId)!
        return (
          <li key={p.id} className="min-w-0">
            <button
              type="button"
              aria-label={tp.label(i + 1, by, p.text.slice(0, 60))}
              onClick={() => onOpen(p.id)}
              className="grid size-full cursor-pointer grid-rows-[auto_1fr] overflow-hidden rounded-[20px] border border-rim bg-glass-2 text-left transition-colors duration-150 hover:bg-glass-3"
            >
              <span className="relative block aspect-[1/0.86] overflow-hidden bg-well">
                {p.media.length ? (
                  <img src={coverPhoto(p, 360)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <span className={cn('absolute inset-0 overflow-hidden p-3.5 text-xs font-semibold leading-[1.3]', brandSurface[brand.tone])}>{clip(p.text, 90)}</span>
                )}
                <span
                  className={cn(
                    'absolute left-2.5 top-2.5 grid h-[30px] min-w-[30px] place-items-center rounded-full px-2 text-xs font-bold shadow-[0_4px_12px_-4px_rgb(0_0_0/0.25)]',
                    i === 0 ? 'bg-butter text-[#16191d]' : 'bg-float text-text',
                  )}
                >
                  {i + 1}
                </span>
                <span className="absolute bottom-2.5 right-2.5">
                  <NetStack networks={p.networks} />
                </span>
              </span>
              <span className="grid min-w-0 content-start gap-0.5 px-3.5 pb-3.5 pt-3 max-mobile:px-3 max-mobile:pb-3 max-mobile:pt-2.5">
                <b className="text-[22px] font-bold leading-[1.1] tracking-[-0.02em] tabular-nums max-mobile:text-[19px]">{show(topValue(p.metrics, by))}</b>
                <small className="text-[12.5px] text-muted">{tp.unit[by]}</small>
                <span className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-muted">
                  <span className="inline-flex min-w-0 items-center gap-[7px] whitespace-nowrap font-semibold text-text">
                    <BrandMark brand={brand} size="xs" />
                    <span className="truncate">{brand.name}</span>
                  </span>
                  <span>{t.dates.monthDay(new Date(p.scheduledAt))}</span>
                </span>
                <span className="mt-1.5 flex gap-3 text-[12.5px] text-muted tabular-nums">
                  <span className="inline-flex items-center gap-1" title={tp.impressions}>
                    <Eye size={14} aria-hidden />
                    {t.numbers.compact(p.metrics.impressions)}
                  </span>
                  <span className="inline-flex items-center gap-1" title={tp.engagements}>
                    <Heart size={14} aria-hidden />
                    {t.numbers.compact(engagements(p.metrics))}
                  </span>
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/** Text-only posts sit on a soft wash of their brand colour. */
const brandSurface: Record<Tone, string> = {
  butter: 'bg-[color-mix(in_srgb,var(--butter)_22%,var(--float))]',
  pine: 'bg-[color-mix(in_srgb,var(--pine)_16%,var(--float))]',
  coral: 'bg-[color-mix(in_srgb,var(--coral)_16%,var(--float))]',
  sea: 'bg-[color-mix(in_srgb,var(--sea)_16%,var(--float))]',
  lilac: 'bg-[color-mix(in_srgb,var(--lilac)_16%,var(--float))]',
  ink: 'bg-[color-mix(in_srgb,var(--ink)_10%,var(--float))]',
  plain: 'bg-glass-2',
}

/* ───────────────────────── brand comparison ───────────────────────── */

function Brands({ model, by }: { model: AnalyticsModel; by: BrandBy }) {
  const { t } = useI18n()
  const rows = [...model.brands].sort((a, b) => brandValue(b, by) - brandValue(a, by))
  const max = Math.max(...rows.map((r) => brandValue(r, by)))
  const show = (r: (typeof rows)[number]) =>
    by === 'followers' ? (r.followers === null ? '—' : t.numbers.compact(r.followers)) : by === 'eng' ? t.numbers.pct1(r.engagementRate) : t.numbers.compact(r.impressions)
  return (
    <ul className="grid gap-1.5">
      {rows.map((r) => (
        <li
          key={r.brand.id}
          className="grid grid-cols-[auto_minmax(0,9em)_minmax(40px,1fr)_4.4em] items-center gap-3 border-b border-line py-2 last:border-b-0 max-mobile:grid-cols-[auto_minmax(0,1fr)_4.2em]"
        >
          <BrandMark brand={r.brand} size="md" className="max-mobile:row-span-2" />
          <span className="min-w-0 leading-[1.2]">
            <b className="block truncate text-xs font-bold">{r.brand.name}</b>
            <small className="block truncate text-[12.5px] text-muted">{t.analytics.brands.meta(r.accounts, r.posts)}</small>
          </span>
          <span aria-hidden className="block h-3.5 overflow-hidden rounded-full bg-well max-mobile:col-[2/-1] max-mobile:row-start-2">
            <span
              className="block h-full w-full origin-left rounded-full bg-ink opacity-82 transition-transform duration-700 ease-soft"
              style={{ transform: `scaleX(${max > 0 ? brandValue(r, by) / max : 0})` }}
            />
          </span>
          <b className="text-right text-sm font-bold tabular-nums max-mobile:col-start-3 max-mobile:row-start-1">{show(r)}</b>
        </li>
      ))}
    </ul>
  )
}

