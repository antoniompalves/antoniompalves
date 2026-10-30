import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Heart,
  History,
  Inbox,
  KeyRound,
  Link,
  PenLine,
  RotateCw,
  Send,
  ShieldCheck,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { GrowthChart } from '../components/GrowthChart'
import { PageTitle, Stat } from '../components/PageHead'
import {
  Avatar,
  Badge,
  BrandMark,
  Button,
  Card,
  IconButton,
  LegendDot,
  Meter,
  NetIcon,
  NetStack,
  PostStatusPill,
  StatusPill,
  Thumb,
  cn,
  toneFill,
} from '../components/ui'
import { photo } from '../data/assets'
import type { AuditKind } from '../data/types'
import type { GrowthRange, OverviewModel } from '../data/selectors'
import { NETWORK_LABEL, NETWORK_ORDER, STATUS_META, ago, clip, compact, countdown, pct1, signedPct1 } from '../data/selectors'

interface OverviewProps {
  model: OverviewModel
  now: Date
}

/**
 * #/overview — 12-column bento grid:
 *   next(7) needs(5) / growth(7) top(5) / week(12) / nets(4) inbox(4) team(4)
 * collapsing to 2 columns ≤1279px and 1 column ≤860px.
 */
export function Overview({ model, now }: OverviewProps) {
  return (
    <>
      <OverviewHead model={model} />
      <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desk:grid-cols-12">
        <UpNext model={model} now={now} className="tablet:col-span-2 desk:col-span-7" />
        <NeedsYou model={model} className="desk:col-span-5" />
        <AudienceGrowth model={model} className="desk:col-span-7" />
        <TopPost model={model} className="tablet:col-span-2 desk:col-span-5" />
        <WeekAhead model={model} className="col-span-full" />
        <NetworkPulse model={model} className="desk:col-span-4" />
        <InboxPulse model={model} className="desk:col-span-4" />
        <TeamActivity model={model} now={now} className="tablet:col-span-2 desk:col-span-4" />
      </div>
    </>
  )
}

type SectionProps = { model: OverviewModel; className?: string }

/* ───────────────────────── header ───────────────────────── */

function OverviewHead({ model }: { model: OverviewModel }) {
  const [salute, name] = model.greeting.split(', ')
  return (
    <header className="mb-6 flex flex-wrap items-center gap-x-[clamp(28px,4vw,72px)] gap-y-[18px]">
      <PageTitle lines={[`${salute},`, name]} label={model.greeting} />
      <dl className="flex flex-wrap gap-x-[clamp(24px,3.2vw,56px)] gap-y-3.5">
        <Stat
          icon={Users}
          value={compact(model.stats.audience)}
          badge={`${signedPct1(model.stats.audienceGrowth30d)} in 30 days`}
          label="Audience across your channels"
        />
        <Stat icon={Heart} value={pct1(model.stats.engagementRate)} label="Engagement rate, last 30 days" />
        <Stat icon={CalendarDays} value={String(model.stats.postsThisWeek)} label="Posts going out this week" />
      </dl>
      <div className="ml-auto flex flex-wrap items-center gap-2.5">
        <Button icon={PenLine} href="#/compose">
          New post
        </Button>
      </div>
    </header>
  )
}

/* ───────────────────────── up next ───────────────────────── */

function UpNext({ model, now, className }: SectionProps & { now: Date }) {
  const { hero, comingUp } = model.upNext
  const { dates } = model
  const tools = (
    <>
      <span className="inline-flex items-center gap-[7px] text-2xs font-semibold text-muted">
        <i className="size-2 animate-breathe rounded-full bg-good shadow-[0_0_0_0_color-mix(in_srgb,var(--good)_50%,transparent)]" />
        Live queue
      </span>
      <IconButton label="Open calendar" icon={ArrowUpRight} href="#/calendar" />
    </>
  )

  return (
    <Card title="Up next" tools={tools} className={cn('flex flex-col', className)}>
      {hero && (
        <article className="grid h-[clamp(250px,20vw,290px)] grid-cols-[clamp(170px,30%,250px)_minmax(0,1fr)] items-stretch gap-5 rounded-tile bg-ink p-3.5 text-on-ink max-[600px]:h-auto max-[600px]:grid-cols-1 max-[600px]:gap-3.5 max-[600px]:p-3">
          <button type="button" aria-label="Open post" className="relative block cursor-pointer overflow-hidden rounded-2xl bg-white/6 max-[600px]:aspect-video">
            {hero.image && <img src={photo(hero.image, 600)} alt="" className="absolute inset-0 size-full object-cover" />}
          </button>
          <div className="flex min-w-0 flex-col gap-2 pb-0.5 pr-1.5 pt-1.5">
            <p className="flex min-w-0 items-center gap-[9px] text-xs font-semibold">
              <BrandMark brand={hero.brand} size="sm" />
              <span className="truncate">{hero.brand.name}</span>
              <Badge tone={STATUS_META[hero.status].tone} className="ml-auto shrink-0">
                {STATUS_META[hero.status].label}
              </Badge>
            </p>
            <p className="mt-1 grid gap-0.5">
              <span className="text-2xs font-semibold opacity-70">goes out in</span>
              <b className="text-[clamp(30px,2.8vw,42px)] font-semibold leading-none tracking-[-0.035em] tabular-nums">
                {countdown(Date.parse(hero.scheduledAt) - now.getTime())}
              </b>
            </p>
            <p className="flex items-center gap-[7px] text-xs opacity-78">
              <Clock size={16} aria-hidden />
              <time dateTime={hero.scheduledAt}>
                {dates.day(new Date(hero.scheduledAt), now)} · {dates.time(new Date(hero.scheduledAt))}
              </time>
            </p>
            <p className="line-clamp-2 text-sm leading-[1.45] opacity-92">{hero.text}</p>
            <div className="mt-auto flex items-center gap-2.5">
              <NetStack networks={hero.networks} size="sm" surface="on-ink" />
              <span className="flex-1" />
              <IconButton label="Open post" icon={ArrowUpRight} variant="on-dark" />
            </div>
          </div>
        </article>
      )}

      <p className="mx-0.5 mb-2 mt-4 text-2xs font-bold uppercase tracking-[0.07em] text-muted">Coming up</p>
      <ol className="grid grid-cols-2 content-start gap-2 max-[600px]:grid-cols-1">
        {comingUp.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-[11px] rounded-[18px] border border-line bg-glass-2 p-2 text-left transition-colors hover:bg-glass-3"
            >
              <Thumb src={p.image && photo(p.image, 120)} className="size-[50px] rounded-[13px]" />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-xs font-semibold">{clip(p.text, 43)}</b>
                <small className="block text-2xs text-muted">
                  {dates.day(new Date(p.scheduledAt), now)} · {dates.time(new Date(p.scheduledAt))}
                </small>
              </span>
              <span className="grid justify-items-end gap-[5px]">
                <NetStack networks={p.networks} />
                <PostStatusPill status={p.status} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </Card>
  )
}

/* ───────────────────────── needs you ───────────────────────── */

const VISIBLE_TODOS = 4

function NeedsYou({ model, className }: SectionProps) {
  const [expanded, setExpanded] = useState(false)
  const todos = expanded ? model.todos : model.todos.slice(0, VISIBLE_TODOS)
  const hidden = model.todos.length - VISIBLE_TODOS

  return (
    <Card title="Needs you" tools={<Badge tone="coral">{model.todos.length}</Badge>} className={cn('flex flex-col', className)}>
      <ul className="grid grid-cols-1 content-start gap-2">
        {todos.map((t) => (
          <li
            key={t.id}
            className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-[18px] border border-line bg-glass-2 p-3 [grid-template-areas:'ico_txt'_'ico_act']"
          >
            <span className="[grid-area:ico]">
              {t.kind === 'approval' && <Thumb src={t.post?.image && photo(t.post.image, 120)} className="size-11 rounded-[13px]" />}
              {t.kind === 'failed_post' && (
                <span className={cn('grid size-10 place-items-center rounded-[13px]', toneFill.coral)}>
                  <TriangleAlert size={19} aria-hidden />
                </span>
              )}
              {t.kind === 'channel' && t.channel && <NetIcon network={t.channel.network} size="md" />}
            </span>
            <div className="min-w-0 [grid-area:txt]">
              <b className="block text-xs font-semibold">{t.title}</b>
              <small className="line-clamp-2 text-2xs text-muted">{t.detail}</small>
            </div>
            <div className="flex flex-wrap gap-1.5 [grid-area:act]">
              {t.kind === 'approval' && (
                <>
                  <Button size="sm" variant="pine" icon={Check}>
                    Approve
                  </Button>
                  <Button size="sm" variant="ghost">
                    Review
                  </Button>
                </>
              )}
              {t.kind === 'failed_post' && (
                <Button size="sm" variant="ink" icon={RotateCw}>
                  Retry
                </Button>
              )}
              {t.kind === 'channel' && (
                <Button size="sm" variant="ghost" icon={Link}>
                  Reconnect
                </Button>
              )}
            </div>
          </li>
        ))}
        {hidden > 0 && (
          <li className="flex justify-center pt-0.5">
            <Button
              size="sm"
              variant="ghost"
              icon={ChevronDown}
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              className="[&[aria-expanded=true]>svg]:rotate-180 [&>svg]:transition-transform"
            >
              {expanded ? 'Show less' : `Show ${hidden} more`}
            </Button>
          </li>
        )}
      </ul>
    </Card>
  )
}

/* ───────────────────────── audience growth ───────────────────────── */

function AudienceGrowth({ model, className }: SectionProps) {
  const [range, setRange] = useState<GrowthRange>(30)
  const g = model.growth(range)

  const tools = (
    <>
      <div role="group" aria-label="Growth range" className="inline-flex rounded-full bg-well p-[3px]">
        {([30, 90] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={range === r}
            onClick={() => setRange(r)}
            className={cn(
              'cursor-pointer whitespace-nowrap rounded-full px-[15px] py-2 text-2xs font-semibold transition-[background-color,color,box-shadow] duration-300 ease-soft',
              range === r ? 'bg-glass-3 text-text shadow-[0_2px_8px_rgb(0_0_0/0.08)] dark:bg-white/14' : 'text-muted',
            )}
          >
            {r}D
          </button>
        ))}
      </div>
      <IconButton label="Expand" icon={ArrowUpRight} />
    </>
  )

  return (
    <Card title="Audience growth" tools={tools} className={className}>
      <div className="mb-2 flex flex-wrap items-baseline gap-3">
        <b className="text-[clamp(32px,3vw,44px)] font-semibold tracking-[-0.03em] tabular-nums">+{compact(g.added)}</b>
        <span className="text-2xs text-muted">
          new followers in {range} days · {pct1(g.rate)} growth
        </span>
      </div>
      <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-2xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <LegendDot tone="sea" />
          New followers per day
        </span>
        {NETWORK_ORDER.map((n) => (
          <NetIcon key={n} network={n} />
        ))}
      </div>
      <GrowthChart key={range} data={g.series} label="New followers per day" formatDate={model.dates.monthDay} />
    </Card>
  )
}

/* ───────────────────────── top post ───────────────────────── */

function TopPost({ model, className }: SectionProps) {
  const p = model.topPost
  return (
    <Card title="Top post this month" className={cn('flex flex-col', className)}>
      {p && (
        <button
          type="button"
          aria-label="Open the top post"
          className="relative block min-h-[300px] w-full flex-1 cursor-pointer overflow-hidden rounded-tile text-left text-[#f6f7f5] max-desk:min-h-[320px]"
        >
          {p.image && <img src={photo(p.image, 900)} alt="" className="absolute inset-0 size-full object-cover" />}
          <span className="absolute inset-0 bg-[linear-gradient(rgb(10_10_12/0)_30%,rgb(10_10_12/0.78))]" />
          <Badge tone="butter" className="absolute left-3.5 top-3.5">
            {p.metrics.reachVsUsual}× usual reach
          </Badge>
          <span className="absolute inset-x-0 bottom-0 grid gap-2.5 p-4">
            <span className="flex items-center justify-between gap-2.5">
              <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-2xs font-semibold">
                <BrandMark brand={p.brand} size="xs" />
                {p.brand.name}
              </span>
              <NetStack networks={p.networks} surface="on-photo" />
            </span>
            <span className="text-md font-semibold leading-[1.35]">{p.text}</span>
            <span className="flex gap-[22px] text-2xs opacity-90">
              {[
                [compact(p.metrics.reach), 'reach'],
                [pct1(p.metrics.engagementRate), 'eng. rate'],
                [compact(p.metrics.saves), 'saves'],
              ].map(([v, l]) => (
                <span key={l}>
                  <b className="block text-[22px] font-bold tracking-[-0.02em] tabular-nums">{v}</b>
                  {l}
                </span>
              ))}
            </span>
          </span>
        </button>
      )}
    </Card>
  )
}

/* ───────────────────────── week ahead ───────────────────────── */

const MAX_CHIPS = 3

function WeekAhead({ model, className }: SectionProps) {
  const { dates } = model
  return (
    <Card
      title="The week ahead"
      tools={
        <Button size="sm" variant="ghost" icon={CalendarDays} href="#/calendar">
          Calendar
        </Button>
      }
      className={className}
    >
      <div className="grid grid-cols-7 gap-2 max-[1000px]:snap-x max-[1000px]:snap-mandatory max-[1000px]:grid-cols-[repeat(7,minmax(120px,1fr))] max-[1000px]:overflow-x-auto max-[1000px]:pb-1 max-[1000px]:[mask-image:linear-gradient(90deg,#000_calc(100%-28px),transparent)] max-[1000px]:[scrollbar-width:none]">
        {model.week.map((day) => {
          const extra = day.posts.length - MAX_CHIPS
          return (
            <a
              key={day.date.toISOString()}
              href="#/calendar"
              className={cn(
                'flex min-h-[172px] snap-start flex-col gap-2.5 rounded-[20px] border p-3 transition-colors',
                day.isToday ? 'border-transparent bg-ink text-on-ink' : 'border-line bg-glass-2 hover:bg-glass-3',
              )}
            >
              <span className="flex items-baseline justify-between">
                <b className="text-xs font-semibold">{dates.weekday(day.date)}</b>
                <span className="text-[24px] font-semibold tracking-[-0.02em] tabular-nums">{dates.dayNum(day.date)}</span>
              </span>
              <span className="grid flex-1 content-start gap-[5px]">
                {day.posts.slice(0, MAX_CHIPS).map((p) => (
                  <span
                    key={p.id}
                    className={cn(
                      'flex items-center justify-between gap-1.5 rounded-full py-1 pl-[9px] pr-1 text-[12.5px] font-bold',
                      toneFill[STATUS_META[p.status].tone],
                    )}
                  >
                    <span className="tabular-nums">{dates.shortTime(new Date(p.scheduledAt))}</span>
                    <BrandMark brand={p.brand} size="xs" className="shadow-[0_0_0_1.5px_rgb(255_255_255/0.5)]" />
                  </span>
                ))}
                {extra > 0 && (
                  <span
                    className={cn(
                      'flex justify-center rounded-full px-[9px] py-1 text-[12.5px] font-bold',
                      day.isToday ? 'bg-white/14 dark:bg-black/10' : 'bg-well',
                    )}
                  >
                    +{extra}
                  </span>
                )}
              </span>
              <span className={cn('text-2xs', day.isToday ? 'opacity-70' : 'text-muted')}>
                {day.posts.length} {day.posts.length === 1 ? 'post' : 'posts'}
              </span>
            </a>
          )
        })}
      </div>
    </Card>
  )
}

/* ───────────────────────── network pulse ───────────────────────── */

function NetworkPulse({ model, className }: SectionProps) {
  return (
    <Card title="Network pulse" tools={<IconButton label="Channels" icon={Link} href="#/channels" />} className={className}>
      <ul className="grid grid-cols-1 gap-1">
        {model.networkPulse.map((n) => (
          <li key={n.network} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-[9px] last:border-b-0">
            <NetIcon network={n.network} size="md" />
            <div>
              <p className="mb-1.5 flex justify-between gap-2 text-xs">
                <b className="font-semibold">{NETWORK_LABEL[n.network]}</b>
                <span className="tabular-nums">{compact(n.followers)}</span>
              </p>
              <Meter value={n.share} />
            </div>
            <div className="text-right">
              <span className={cn('block text-xs font-bold', n.growth30d >= 0 ? 'text-good' : 'text-bad')}>{signedPct1(n.growth30d)}</span>
              <small className="text-[12.5px] text-muted">{pct1(n.engagementRate)} eng.</small>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* ───────────────────────── inbox pulse ───────────────────────── */

const SENTIMENT_TONE = { positive: 'pine', neutral: 'plain', negative: 'coral' } as const

function InboxPulse({ model, className }: SectionProps) {
  const { inbox } = model
  const { positive, neutral, negative } = inbox.sentiment
  const total = positive + neutral + negative || 1

  return (
    <Card title="Inbox pulse" tools={<IconButton label="Open inbox" icon={Inbox} href="#/inbox" />} className={className}>
      <div className="mb-3.5 grid grid-cols-3 gap-2">
        {[
          [inbox.open, 'open'],
          [inbox.unread, 'unread'],
          [inbox.priority, 'priority'],
        ].map(([v, l]) => (
          <p key={l} className="rounded-2xl border border-line bg-glass-2 px-3 py-2.5">
            <b className="block text-[24px] font-bold tracking-[-0.02em] tabular-nums">{v}</b>
            <span className="text-2xs text-muted">{l}</span>
          </p>
        ))}
      </div>

      <div role="img" aria-label={`${positive} positive, ${neutral} neutral, ${negative} negative`} className="mb-2 flex h-3 gap-[3px]">
        <span className="min-w-1.5 rounded-full bg-pine" style={{ flex: positive / total }} />
        <span className="min-w-1.5 rounded-full bg-faint" style={{ flex: neutral / total }} />
        <span className="min-w-1.5 rounded-full bg-coral" style={{ flex: negative / total }} />
      </div>
      <p className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-2xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <LegendDot tone="pine" />
          Positive {positive}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LegendDot tone="faint" />
          Neutral {neutral}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LegendDot tone="coral" />
          Negative {negative}
        </span>
      </p>

      <ul className="grid grid-cols-1 gap-0.5">
        {inbox.latest.map((c) => (
          <li key={c.id}>
            <a href={`#/inbox/${c.id}`} className="-mx-2 flex items-center gap-[11px] rounded-[14px] p-2 transition-colors hover:bg-well">
              <Avatar src={c.contact.avatar} name={c.contact.name} />
              <span className="min-w-0 flex-1">
                <b className="flex items-center gap-1.5 text-xs font-semibold">
                  {c.contact.name}
                  {c.unread && <i aria-label="unread" className="inline-block size-[7px] rounded-full bg-coral" />}
                </b>
                <small className="block truncate text-2xs text-muted">{c.preview}</small>
              </span>
              <span className="grid justify-items-end gap-1">
                <NetIcon network={c.network} />
                <StatusPill tone={SENTIMENT_TONE[c.sentiment]} className="py-0.5 pl-[7px] pr-2 text-[12px] capitalize">
                  {c.sentiment}
                </StatusPill>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* ───────────────────────── team activity ───────────────────────── */

const AUDIT_ICON: Record<AuditKind, LucideIcon> = {
  approval: ShieldCheck,
  channel: Link,
  review: ShieldCheck,
  member: Users,
  permission: KeyRound,
  schedule: Send,
  inbox: Inbox,
}

function TeamActivity({ model, now, className }: SectionProps & { now: Date }) {
  return (
    <Card title="Team activity" tools={<IconButton label="Audit log" icon={History} href="#/team/audit" />} className={className}>
      <ol className="grid grid-cols-1 gap-0.5">
        {model.feed.map((e) => {
          const Icon = AUDIT_ICON[e.kind]
          return (
            <li key={e.id} className="flex items-start gap-[11px] border-b border-line py-2 last:border-b-0">
              <Avatar src={e.actor.avatar} name={e.actor.name} size="sm" />
              <p className="min-w-0 text-xs leading-[1.4]">
                <b className="font-bold">{e.actorFirstName}</b> {e.summary}
                <small className="mt-0.5 flex items-center gap-[5px] text-[12.5px] text-muted">
                  <Icon size={13} aria-hidden />
                  <time dateTime={e.at}>{ago(e.at, now)}</time>
                </small>
              </p>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

