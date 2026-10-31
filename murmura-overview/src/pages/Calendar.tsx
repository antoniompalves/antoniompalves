import { useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Flag, LayoutGrid, Plus, Send, ShieldCheck, Sparkles, TriangleAlert, X } from 'lucide-react'
import { PageTitle, Stat } from '../components/PageHead'
import { useToast } from '../components/Toast'
import { usePostActions } from '../components/usePostActions'
import { Button, IconButton, NetIcon, Segmented, cn } from '../components/ui'
import { Chip, STATUS_FILTERS, StatusDot } from '../components/calendar/parts'
import { ListView } from '../components/calendar/ListView'
import { MonthView } from '../components/calendar/MonthView'
import { PostDrawer } from '../components/calendar/PostDrawer'
import { DraftsCard, MiniCalendar, NetworkCard } from '../components/calendar/SidePanel'
import { useCalendarDrag } from '../components/calendar/useCalendarDrag'
import { WeekView } from '../components/calendar/WeekView'
import type { CalendarView, Filters, StatusFilter } from '../data/calendar'
import {
  NO_FILTERS,
  calendarStats,
  dayKey,
  days,
  fromKey,
  hasFilters,
  matchesFilters,
  periodBounds,
  periodDays,
  startOfDay,
  startOfWeek,
  stepAnchor,
} from '../data/calendar'
import { NETWORK_LABEL, NETWORK_ORDER } from '../data/selectors'
import { useWorkspace } from '../data/store'
import type { NetworkId } from '../data/types'
import { useI18n } from '../i18n'

const VIEWS: CalendarView[] = ['week', 'month', 'list']

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/**
 * #/calendar — publishing calendar: header stats, filter bar, Week / Month /
 * List views on the left, planning tools (mini calendar, unscheduled drafts,
 * per-network load) on the right. Posts can be dragged between slots and
 * days, nudged with Alt + arrows, and opened in a preview drawer.
 */
export function Calendar({ now }: { now: Date }) {
  const { ws, dispatch } = useWorkspace()
  const toast = useToast()
  const { t } = useI18n()
  const [view, setView] = useState<CalendarView>('week')
  const [anchor, setAnchor] = useState(() => startOfDay(now))
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [heat, setHeat] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [landedId, setLandedId] = useState<string | null>(null)

  const brands = useMemo(() => new Map(ws.brands.map((b) => [b.id, b])), [ws.brands])
  const team = useMemo(() => new Map(ws.team.map((m) => [m.id, m])), [ws.team])
  const stats = calendarStats(ws, now)

  const shownDays = periodDays(view, anchor)
  const first = dayKey(shownDays[0])
  const last = dayKey(shownDays[shownDays.length - 1])
  const visible = ws.posts.filter((p) => matchesFilters(p, filters, ws.campaigns))
  const inPeriod = visible.filter((p) => p.scheduledAt.slice(0, 10) >= first && p.scheduledAt.slice(0, 10) <= last)
  const brandCount = new Set(inPeriod.map((p) => p.brandId)).size

  const week = days(startOfWeek(anchor), 7)
  const weekFirst = dayKey(week[0])
  const weekLast = dayKey(week[6])
  const weekPosts = ws.posts.filter((p) => p.status !== 'draft' && p.scheduledAt.slice(0, 10) >= weekFirst && p.scheduledAt.slice(0, 10) <= weekLast)
  const drafts = ws.posts.filter((p) => p.status === 'draft').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    ws.posts.forEach((p) => m.set(p.scheduledAt.slice(0, 10), (m.get(p.scheduledAt.slice(0, 10)) ?? 0) + 1))
    return m
  }, [ws.posts])

  /* ── mutations (all undoable) ── */

  const move = (id: string, when: Date) => {
    const before = ws.posts
    dispatch({ type: 'move', id, to: when.toISOString() })
    setLandedId(id)
    window.setTimeout(() => setLandedId((cur) => (cur === id ? null : cur)), 1300)
    toast({ text: t.calendar.moved(t.dates.relativeDay(when, now), t.dates.time(when)), undo: () => dispatch({ type: 'restore', posts: before }) })
  }
  const denied = () => toast({ text: t.calendar.pastSlot, icon: TriangleAlert })
  const drag = useCalendarDrag({ posts: ws.posts, now, onDrop: move, onDenied: denied, formatTime: t.dates.time })

  const keyMove = (id: string, delta: number) => {
    const p = ws.posts.find((x) => x.id === id)
    if (!p) return
    const when = new Date(Date.parse(p.scheduledAt) + delta * 60_000)
    if (when <= now) return denied()
    move(id, when)
  }

  const { publish, duplicate, remove } = usePostActions(now, () => setOpenId(null))

  // A slot opens the composer at that time; a month day (midnight) at noon.
  const createAt = (when: Date) => {
    const at = when.getTime() % 86_400_000 === 0 ? when.getTime() + 12 * 3_600_000 : when.getTime()
    window.location.hash = `#/compose?at=${at}`
  }
  const toggleCampaign = (id: string) => setFilters((f) => ({ ...f, campaignId: f.campaignId === id ? null : id }))
  const goWeek = (d: Date) => {
    setAnchor(d)
    setView('week')
  }

  const open = openId ? ws.posts.find((p) => p.id === openId) ?? null : null
  const unit = view === 'month' ? 'month' : 'week'
  const period = (v: CalendarView) => t.dates.period(...periodBounds(v, anchor))

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center gap-x-[clamp(28px,4vw,72px)] gap-y-[18px] max-mobile:mb-[18px] max-mobile:gap-y-3">
        <PageTitle lines={t.calendar.titleLines} label={t.calendar.title} />
        <dl className="flex flex-wrap gap-x-[clamp(24px,3.2vw,56px)] gap-y-3.5 max-mobile:grid max-mobile:w-full max-mobile:grid-cols-2 max-mobile:gap-x-3.5 max-mobile:gap-y-2.5">
          <Stat icon={CalendarDays} value={String(stats.scheduled)} label={t.calendar.scheduledThisWeek} />
          <Stat icon={ShieldCheck} value={String(stats.awaiting)} label={t.calendar.awaitingApproval} />
          <Stat icon={Send} value={String(stats.published)} label={t.calendar.publishedThisWeek} />
          <Stat icon={LayoutGrid} value={String(stats.emptyDays)} label={t.calendar.emptyDays} />
        </dl>
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <Segmented label={t.calendar.view} value={view} onChange={setView} options={VIEWS.map((v) => ({ value: v, label: t.calendar.views[v] }))} />
          <div className="flex items-center gap-1.5">
            <IconButton label={t.calendar.previous(unit)} icon={ChevronLeft} onClick={() => setAnchor(stepAnchor(view, anchor, -1))} />
            <Button variant="ghost" className="h-[42px]" onClick={() => setAnchor(startOfDay(now))}>
              {t.common.today}
            </Button>
            <IconButton label={t.calendar.next(unit)} icon={ChevronRight} onClick={() => setAnchor(stepAnchor(view, anchor, 1))} />
          </div>
          <Button icon={Plus} href="#/compose">
            {t.common.newPost}
          </Button>
        </div>
      </header>

      <FilterBar filters={filters} setFilters={setFilters} campaigns={ws.campaigns} brandName={(id) => brands.get(id)?.name ?? ''} />

      <div className="grid items-start gap-4 grid-cols-[minmax(0,1fr)_300px] min-[1500px]:grid-cols-[minmax(0,1fr)_330px] max-desk:grid-cols-1">
        <section
          aria-labelledby="cl-cal-t"
          className="relative min-w-0 rounded-card border border-rim bg-glass p-[18px] shadow-card max-mobile:px-2.5 max-mobile:py-3.5"
        >
          <header className="mb-3.5 flex min-h-[42px] flex-wrap items-end justify-between gap-x-3 gap-y-2 max-mobile:px-1">
            <div className="min-w-0">
              <h2 id="cl-cal-t" aria-live="polite" className="whitespace-nowrap text-[22px] font-bold leading-[1.15] tracking-[-0.02em] max-mobile:text-[19px]">
                {period(view)}
              </h2>
              <p className="text-2xs text-muted">{t.calendar.periodSummary(inPeriod.length, brandCount)}</p>
            </div>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
              {heat && view === 'week' ? (
                <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-text">
                  <Sparkles size={16} className="text-lilac" aria-hidden />
                  {t.calendar.bestTimes}
                  <i className="h-2 w-[70px] rounded bg-[linear-gradient(90deg,color-mix(in_srgb,var(--lilac)_10%,transparent),var(--lilac))]" />
                  <span className="text-muted">{t.calendar.quietBusy}</span>
                </span>
              ) : (
                <div className="flex flex-wrap justify-end gap-x-3.5 gap-y-1.5 text-2xs font-semibold text-muted max-mobile:hidden">
                  {STATUS_FILTERS.filter((s) => s !== 'draft').map((s) => (
                    <span key={s} className="inline-flex items-center gap-1.5">
                      <StatusDot status={s} />
                      {t.calendar.statusFilters[s].legend}
                    </span>
                  ))}
                </div>
              )}
              {view === 'week' && (
                <Chip
                  pressed={heat}
                  title={t.calendar.bestTimesHint}
                  onClick={() => {
                    setHeat((h) => !h)
                    if (!heat) toast({ text: t.calendar.bestTimesOn, icon: Sparkles })
                  }}
                  pressedClassName="border-transparent bg-lilac text-on-lilac"
                >
                  <Sparkles size={16} className={heat ? 'text-inherit' : 'text-lilac'} aria-hidden />
                  {t.calendar.bestTimes}
                </Chip>
              )}
            </div>
          </header>

          <div className="relative">
            {view === 'week' && (
              <WeekView
                days={shownDays}
                posts={inPeriod}
                allPosts={ws.posts}
                brands={brands}
                campaigns={ws.campaigns}
                selectedCampaign={filters.campaignId}
                onToggleCampaign={toggleCampaign}
                now={now}
                heat={heat}
                bestTimes={ws.bestTimes}
                drag={drag}
                landedId={landedId}
                onOpen={setOpenId}
                onKeyMove={keyMove}
                onCreateAt={createAt}
              />
            )}
            {view === 'month' && (
              <MonthView
                days={shownDays}
                anchor={anchor}
                posts={inPeriod}
                brands={brands}
                campaigns={ws.campaigns}
                selectedCampaign={filters.campaignId}
                onToggleCampaign={toggleCampaign}
                now={now}
                drag={drag}
                landedId={landedId}
                onOpen={setOpenId}
                onGoWeek={goWeek}
                onCreateAt={createAt}
              />
            )}
            {view === 'list' && <ListView days={shownDays} posts={inPeriod} brands={brands} team={team} now={now} onOpen={setOpenId} />}

            {hasFilters(filters) && inPeriod.length === 0 && (
              <div className={cn('pointer-events-none z-[7] grid place-items-center p-4', view === 'list' ? 'py-[30px]' : 'absolute inset-0')}>
                <div className="pointer-events-auto grid max-w-[340px] justify-items-center gap-1.5 rounded-[22px] border border-line bg-float px-7 py-[26px] text-center shadow-pop">
                  <b className="font-semibold">{t.calendar.nothingMatches}</b>
                  <p className="text-xs text-muted">{t.calendar.nothingInPeriod(unit)}</p>
                  <Button size="sm" variant="ghost" icon={X} className="mt-2" onClick={() => setFilters(NO_FILTERS)}>
                    {t.common.clearFilters}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside aria-label={t.calendar.planningTools} className="grid min-w-0 content-start gap-4 max-desk:grid-cols-2 max-desk:items-start max-mobile:grid-cols-1">
          <MiniCalendar
            anchor={anchor}
            now={now}
            range={[first, last]}
            counts={counts}
            onPick={(d) => setAnchor(d)}
          />
          <DraftsCard drafts={drafts} brands={brands} team={team} drag={drag} onOpen={setOpenId} />
          <NetworkCard posts={weekPosts} period={period('week')} />
        </aside>
      </div>

      <PostDrawer
        post={open}
        brand={open ? brands.get(open.brandId) : undefined}
        author={open ? team.get(open.authorId) : undefined}
        now={now}
        onClose={() => setOpenId(null)}
        onPublish={publish}
        onDuplicate={duplicate}
        onDelete={remove}
      />
    </>
  )
}

/* ───────────────────────── filter bar (".cl-bar") ───────────────────────── */

interface FilterBarProps {
  filters: Filters
  setFilters: (f: Filters | ((f: Filters) => Filters)) => void
  campaigns: { id: string; name: string; brandId: string; start: string; end: string }[]
  brandName: (id: string) => string
}

function FilterBar({ filters, setFilters, campaigns, brandName }: FilterBarProps) {
  const { t } = useI18n()
  const sep = <span aria-hidden className="h-[22px] w-px shrink-0 bg-line-2" />
  return (
    <div className="mb-4 flex items-center justify-between gap-3 max-[1100px]:flex-wrap">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2 max-mobile:-mx-3.5 max-mobile:w-[calc(100%+28px)] max-mobile:flex-nowrap max-mobile:overflow-x-auto max-mobile:px-3.5 max-mobile:py-0.5 max-mobile:[scrollbar-width:none]">
        <div role="group" aria-label={t.calendar.byNetwork} className="flex gap-1.5 max-mobile:flex-nowrap max-[760px]:shrink-0 min-[761px]:flex-wrap">
          <Chip pressed={filters.networks.length === 0} onClick={() => setFilters((f) => ({ ...f, networks: [] }))}>
            {t.calendar.allNetworks}
          </Chip>
          {NETWORK_ORDER.map((n: NetworkId) => {
            const pressed = filters.networks.includes(n)
            return (
              <Chip
                key={n}
                pressed={pressed}
                aria-label={NETWORK_LABEL[n]}
                title={NETWORK_LABEL[n]}
                compact
                onClick={() => setFilters((f) => ({ ...f, networks: toggle(f.networks, n) }))}
              >
                <NetIcon network={n} className={cn('border-transparent', pressed && 'bg-transparent! text-inherit!')} />
              </Chip>
            )
          })}
        </div>
        {sep}
        <div role="group" aria-label={t.calendar.byStatus} className="flex gap-1.5 max-mobile:shrink-0 max-mobile:flex-nowrap min-[761px]:flex-wrap">
          {STATUS_FILTERS.map((s) => {
            const pressed = filters.statuses.includes(s)
            return (
              <Chip key={s} pressed={pressed} onClick={() => setFilters((f) => ({ ...f, statuses: toggle<StatusFilter>(f.statuses, s) }))}>
                <StatusDot status={s} className={cn(pressed && 'ring-[1.5px] ring-on-pill')} />
                {t.calendar.statusFilters[s].label}
              </Chip>
            )
          })}
        </div>
        {sep}
        <label className="relative inline-flex shrink-0 items-center">
          <span className="sr-only">{t.calendar.campaign}</span>
          <Flag size={16} aria-hidden className="pointer-events-none absolute left-3 text-muted" />
          <select
            value={filters.campaignId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, campaignId: e.target.value || null }))}
            className="h-[34px] max-w-[210px] cursor-pointer appearance-none rounded-full border border-line-2 bg-glass-2 pl-[34px] pr-[34px] text-2xs font-semibold text-text outline-none focus:border-text max-mobile:text-md"
          >
            <option value="">{t.calendar.allCampaigns}</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {brandName(c.brandId)} ({t.dates.monthDay(fromKey(c.start))} – {t.dates.monthDay(fromKey(c.end))})
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden className="pointer-events-none absolute right-3 text-muted" />
        </label>
        {hasFilters(filters) && (
          <Button size="sm" variant="ghost" icon={X} className="h-[34px]" onClick={() => setFilters(NO_FILTERS)}>
            {t.common.clear}
          </Button>
        )}
      </div>
    </div>
  )
}
