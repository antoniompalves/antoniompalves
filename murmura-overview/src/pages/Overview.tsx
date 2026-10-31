import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Ear,
  Heart,
  History,
  Inbox,
  KeyRound,
  Link,
  PenLine,
  Reply,
  RotateCw,
  Send,
  ShieldCheck,
  TriangleAlert,
  Undo2,
  Users,
} from 'lucide-react'
import { AuthoriseDialog } from '../components/AuthoriseDialog'
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
import { PostDrawer } from '../components/calendar/PostDrawer'
import { useToast } from '../components/Toast'
import { usePostActions } from '../components/usePostActions'
import { approve } from '../data/approvals'
import { approvedNotices, excerpt } from '../data/notices'
import { coverPhoto } from '../data/assets'
import { useWorkspace } from '../data/store'
import type { AuditKind, Channel, Post } from '../data/types'
import type { GrowthRange, OverviewModel } from '../data/selectors'
import { NETWORK_LABEL, NETWORK_ORDER, STATUS_TONE, clip } from '../data/selectors'
import { useI18n } from '../i18n'

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
        <NeedsYou model={model} now={now} className="desk:col-span-5" />
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
  const { t } = useI18n()
  const [salute, name] = model.greeting.split(', ')
  return (
    <header className="mb-6 flex flex-wrap items-center gap-x-[clamp(28px,4vw,72px)] gap-y-[18px] max-mobile:mb-[18px] max-mobile:gap-y-3">
      <PageTitle lines={[`${salute},`, name]} label={model.greeting} />
      <dl className="flex flex-wrap gap-x-[clamp(24px,3.2vw,56px)] gap-y-3.5 max-mobile:grid max-mobile:w-full max-mobile:grid-cols-2 max-mobile:gap-x-3.5 max-mobile:gap-y-2.5">
        <Stat
          icon={Users}
          value={t.numbers.compact(model.stats.audience)}
          badge={t.overview.audienceGrowthBadge(t.numbers.signedPct1(model.stats.audienceGrowth30d))}
          label={t.overview.audience}
        />
        <Stat icon={Heart} value={t.numbers.pct1(model.stats.engagementRate)} label={t.overview.engagement} />
        <Stat icon={CalendarDays} value={String(model.stats.postsThisWeek)} label={t.overview.postsThisWeek} />
      </dl>
      <div className="ml-auto flex flex-wrap items-center gap-2.5">
        <Button icon={PenLine} href="#/compose">
          {t.common.newPost}
        </Button>
      </div>
    </header>
  )
}

/* ───────────────────────── up next ───────────────────────── */

function UpNext({ model, now, className }: SectionProps & { now: Date }) {
  const { hero, comingUp } = model.upNext
  const { t } = useI18n()
  const dates = t.dates
  const tools = (
    <>
      <span className="inline-flex items-center gap-[7px] text-2xs font-semibold text-muted">
        <i className="size-2 animate-breathe rounded-full bg-good shadow-[0_0_0_0_color-mix(in_srgb,var(--good)_50%,transparent)]" />
        {t.overview.liveQueue}
      </span>
      <IconButton label={t.overview.openCalendar} icon={ArrowUpRight} href="#/calendar" />
    </>
  )

  return (
    <Card title={t.overview.upNext} tools={tools} className={cn('flex flex-col', className)}>
      {hero && (
        <article className="grid h-[clamp(250px,20vw,290px)] grid-cols-[clamp(170px,30%,250px)_minmax(0,1fr)] items-stretch gap-5 rounded-tile bg-ink p-3.5 text-on-ink max-[600px]:h-auto max-[600px]:grid-cols-1 max-[600px]:gap-3.5 max-[600px]:p-3">
          <button type="button" aria-label={t.overview.openPost} className="relative block cursor-pointer overflow-hidden rounded-2xl bg-white/6 max-[600px]:aspect-video">
            {hero.media.length > 0 && <img src={coverPhoto(hero, 600)} alt="" className="absolute inset-0 size-full object-cover" />}
          </button>
          <div className="flex min-w-0 flex-col gap-2 pb-0.5 pr-1.5 pt-1.5">
            <p className="flex min-w-0 items-center gap-[9px] text-xs font-semibold">
              <BrandMark brand={hero.brand} size="sm" />
              <span className="truncate">{hero.brand.name}</span>
              <Badge tone={STATUS_TONE[hero.status]} className="ml-auto shrink-0">
                {t.status[hero.status]}
              </Badge>
            </p>
            <p className="mt-1 grid gap-0.5">
              <span className="text-2xs font-semibold opacity-70">{t.overview.goesOutIn}</span>
              <b className="text-[clamp(30px,2.8vw,42px)] font-semibold leading-none tracking-[-0.035em] tabular-nums">
                {dates.countdown(Date.parse(hero.scheduledAt) - now.getTime())}
              </b>
            </p>
            <p className="flex items-center gap-[7px] text-xs opacity-78">
              <Clock size={16} aria-hidden />
              <time dateTime={hero.scheduledAt}>
                {dates.relativeDay(new Date(hero.scheduledAt), now)} · {dates.time(new Date(hero.scheduledAt))}
              </time>
            </p>
            <p className="line-clamp-2 text-sm leading-[1.45] opacity-92">{hero.text}</p>
            <div className="mt-auto flex items-center gap-2.5">
              <NetStack networks={hero.networks} size="sm" surface="on-ink" />
              <span className="flex-1" />
              <IconButton label={t.overview.openPost} icon={ArrowUpRight} variant="on-dark" />
            </div>
          </div>
        </article>
      )}

      <p className="mx-0.5 mb-2 mt-4 text-2xs font-bold uppercase tracking-[0.07em] text-muted">{t.overview.comingUp}</p>
      <ol className="grid grid-cols-2 content-start gap-2 max-[600px]:grid-cols-1">
        {comingUp.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-[11px] rounded-[18px] border border-line bg-glass-2 p-2 text-left transition-colors hover:bg-glass-3"
            >
              <Thumb src={coverPhoto(p, 120)} className="size-[50px] rounded-[13px]" />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-xs font-semibold">{clip(p.text, 43)}</b>
                <small className="block text-2xs text-muted">
                  {dates.relativeDay(new Date(p.scheduledAt), now)} · {dates.time(new Date(p.scheduledAt))}
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

function NeedsYou({ model, now, className }: SectionProps & { now: Date }) {
  const { t } = useI18n()
  const { ws, all, dispatch } = useWorkspace()
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [authorise, setAuthorise] = useState<Channel | null>(null)
  const { publish, duplicate, remove } = usePostActions(now, () => setOpenId(null))
  const todos = expanded ? model.todos : model.todos.slice(0, VISIBLE_TODOS)
  const hidden = model.todos.length - VISIBLE_TODOS
  const nowMs = Math.floor(now.getTime() / 60_000) * 60_000

  const approveOne = (p: Post) => {
    const before = all.posts
    const done = approve(p, ws.currentUserId, nowMs)
    dispatch({ type: 'savePost', post: done })
    dispatch({ type: 'notify', notices: approvedNotices(ws.currentUserId, p, nowMs) })
    dispatch({
      type: 'audit',
      event: { id: `au-${Date.now().toString(36)}`, actorId: ws.currentUserId, kind: 'approval', action: { type: 'approved', excerpt: excerpt(p.text), brandId: p.brandId }, at: new Date(nowMs).toISOString() },
    })
    toast({ text: t.approvals.toast.approved(t.dates.dayStamp(new Date(done.scheduledAt), now)), icon: Check, undo: () => dispatch({ type: 'restore', posts: before }) })
  }

  /** Retry without the channels that are still disconnected; with none left, reconnecting comes first. */
  const retry = (p: Post) => {
    const live = p.networks.filter((n) => ws.channels.some((c) => c.brandId === p.brandId && c.network === n && c.status !== 'disconnected'))
    if (!live.length) return toast({ text: t.approvals.toast.reconnectFirst, icon: Link, action: { label: t.approvals.toast.channels, run: () => (window.location.hash = '#/channels') } })
    dispatch({ type: 'savePost', post: { ...p, networks: live } })
    publish(p.id)
  }

  const open = openId ? ws.posts.find((p) => p.id === openId) ?? null : null
  return (
    <Card title={t.overview.needsYou} tools={<Badge tone="coral">{model.todos.length}</Badge>} className={cn('flex flex-col', className)}>
      <ul className="grid grid-cols-1 content-start gap-2">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-[18px] border border-line bg-glass-2 p-3 [grid-template-areas:'ico_txt'_'ico_act']"
          >
            <span className="[grid-area:ico]">
              {todo.kind === 'approval' && <Thumb src={todo.post && coverPhoto(todo.post, 120)} className="size-11 rounded-[13px]" />}
              {(todo.kind === 'failed_post' || todo.kind === 'changes') && (
                <span className={cn('grid size-10 place-items-center rounded-[13px]', toneFill.coral)}>
                  {todo.kind === 'changes' ? <Undo2 size={19} aria-hidden /> : <TriangleAlert size={19} aria-hidden />}
                </span>
              )}
              {todo.kind === 'myPending' && (
                <span className={cn('grid size-10 place-items-center rounded-[13px]', toneFill.sea)}>
                  <Clock size={19} aria-hidden />
                </span>
              )}
              {todo.kind === 'channel' && todo.channel && <NetIcon network={todo.channel.network} size="md" />}
              {todo.kind === 'unhappy' && todo.conversation && <Avatar src={todo.conversation.contact.avatar} name={todo.conversation.contact.name} size="lg" />}
            </span>
            <div className="min-w-0 [grid-area:txt]">
              <b className="block text-xs font-semibold">{todo.title}</b>
              <small className="line-clamp-2 text-2xs text-muted">{todo.detail}</small>
            </div>
            <div className="flex flex-wrap gap-1.5 [grid-area:act]">
              {todo.kind === 'approval' && todo.post && (
                <>
                  <Button size="sm" variant="pine" icon={Check} onClick={() => approveOne(todo.post!)}>
                    {t.overview.approve}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(todo.post!.id)}>
                    {t.overview.review}
                  </Button>
                </>
              )}
              {todo.kind === 'changes' && todo.post && (
                <Button size="sm" icon={PenLine} href={`#/compose/${todo.post.id}`}>
                  {t.overview.todo.edit}
                </Button>
              )}
              {todo.kind === 'failed_post' && todo.post && (
                <Button size="sm" variant="ink" icon={RotateCw} onClick={() => retry(todo.post!)}>
                  {t.overview.retry}
                </Button>
              )}
              {todo.kind === 'channel' && todo.channel && (
                <Button size="sm" variant="ghost" icon={Link} onClick={() => setAuthorise(todo.channel!)}>
                  {t.overview.reconnect}
                </Button>
              )}
              {todo.kind === 'unhappy' && todo.conversation && (
                <Button size="sm" icon={Reply} href={`#/inbox/${todo.conversation.id}`}>
                  {t.overview.todo.reply}
                </Button>
              )}
              {todo.kind === 'myPending' && (
                <Button size="sm" variant="ghost" href="#/approvals">
                  {t.overview.todo.view}
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
              {expanded ? t.overview.showLess : t.overview.showMore(hidden)}
            </Button>
          </li>
        )}
      </ul>
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
      <AuthoriseDialog channel={authorise} now={now} onClose={() => setAuthorise(null)} />
    </Card>
  )
}

/* ───────────────────────── audience growth ───────────────────────── */

function AudienceGrowth({ model, className }: SectionProps) {
  const [range, setRange] = useState<GrowthRange>(30)
  const g = model.growth(range)
  const { t } = useI18n()

  const tools = (
    <>
      <div role="group" aria-label={t.overview.growthRange} className="inline-flex rounded-full bg-well p-[3px]">
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
            {t.overview.rangeOption(r)}
          </button>
        ))}
      </div>
      <IconButton label={t.overview.expand} icon={ArrowUpRight} />
    </>
  )

  return (
    <Card title={t.overview.audienceGrowth} tools={tools} className={className}>
      <div className="mb-2 flex flex-wrap items-baseline gap-3">
        <b className="text-[clamp(32px,3vw,44px)] font-semibold tracking-[-0.03em] tabular-nums">+{t.numbers.compact(g.added)}</b>
        <span className="text-2xs text-muted">{t.overview.newFollowersIn(range, t.numbers.pct1(g.rate))}</span>
      </div>
      <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-2xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <LegendDot tone="sea" />
          {t.overview.newFollowersPerDay}
        </span>
        {NETWORK_ORDER.map((n) => (
          <NetIcon key={n} network={n} />
        ))}
      </div>
      <GrowthChart key={range} data={g.series} label={t.overview.newFollowersPerDay} formatDate={t.dates.monthDay} />
    </Card>
  )
}

/* ───────────────────────── top post ───────────────────────── */

function TopPost({ model, className }: SectionProps) {
  const p = model.topPost
  const { t } = useI18n()
  return (
    <Card title={t.overview.topPost} className={cn('flex flex-col', className)}>
      {p && (
        <button
          type="button"
          aria-label={t.overview.openTopPost}
          className="relative block min-h-[300px] w-full flex-1 cursor-pointer overflow-hidden rounded-tile text-left text-[#f6f7f5] max-desk:min-h-[320px]"
        >
          {p.media.length > 0 && <img src={coverPhoto(p, 900)} alt="" className="absolute inset-0 size-full object-cover" />}
          <span className="absolute inset-0 bg-[linear-gradient(rgb(10_10_12/0)_30%,rgb(10_10_12/0.78))]" />
          <Badge tone="butter" className="absolute left-3.5 top-3.5">
            {t.overview.usualReach(t.numbers.times(p.reachVsUsual))}
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
                [t.numbers.compact(p.metrics.reach), t.overview.reach],
                [t.numbers.pct1(p.engagementRate), t.overview.engRate],
                [t.numbers.compact(p.metrics.saves), t.overview.saves],
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
  const { t } = useI18n()
  const dates = t.dates
  return (
    <Card
      title={t.overview.weekAhead}
      tools={
        <Button size="sm" variant="ghost" icon={CalendarDays} href="#/calendar">
          {t.common.calendar}
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
                      toneFill[STATUS_TONE[p.status]],
                    )}
                  >
                    <span className="tabular-nums">{dates.shortTime(new Date(p.scheduledAt))}</span>
                    <BrandMark brand={p.brand} size="xs" className="shadow-[0_0_0_1.5px_rgb(255_255_255/0.5)]" />
                  </span>
                ))}
                {day.posts.length === 0 && (
                  <span
                    className={cn(
                      'flex justify-center rounded-full border border-dashed px-[9px] py-1 text-[12.5px] font-semibold',
                      day.isToday ? 'border-on-ink/30' : 'border-line-2 text-muted',
                    )}
                  >
                    {t.calendar.gap}
                  </span>
                )}
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
                {t.common.post(day.posts.length)}
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
  const { t } = useI18n()
  return (
    <Card title={t.overview.networkPulse} tools={<IconButton label={t.overview.channels} icon={Link} href="#/channels" />} className={className}>
      <ul className="grid grid-cols-1 gap-1">
        {model.networkPulse.map((n) => (
          <li key={n.network} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-[9px] last:border-b-0">
            <NetIcon network={n.network} size="md" />
            <div>
              <p className="mb-1.5 flex justify-between gap-2 text-xs">
                <b className="font-semibold">{NETWORK_LABEL[n.network]}</b>
                <span className="tabular-nums">{t.numbers.compact(n.followers)}</span>
              </p>
              <Meter value={n.share} />
            </div>
            <div className="text-right">
              <span className={cn('block text-xs font-bold', n.growth >= 0 ? 'text-good' : 'text-bad')}>{t.numbers.signedPct1(n.growth)}</span>
              <small className="text-[12.5px] text-muted">{t.overview.engShort(t.numbers.pct1(n.engagementRate))}</small>
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
  const { t } = useI18n()

  return (
    <Card title={t.overview.inboxPulse} tools={<IconButton label={t.overview.openInbox} icon={Inbox} href="#/inbox" />} className={className}>
      <div className="mb-3.5 grid grid-cols-3 gap-2">
        {[
          [inbox.open, t.overview.open],
          [inbox.unread, t.overview.unread],
          [inbox.priority, t.overview.priority],
        ].map(([v, l]) => (
          <p key={l} className="rounded-2xl border border-line bg-glass-2 px-3 py-2.5">
            <b className="block text-[24px] font-bold tracking-[-0.02em] tabular-nums">{v}</b>
            <span className="text-2xs text-muted">{l}</span>
          </p>
        ))}
      </div>

      <div role="img" aria-label={t.overview.sentimentSplit(positive, neutral, negative)} className="mb-2 flex h-3 gap-[3px]">
        <span className="min-w-1.5 rounded-full bg-pine" style={{ flex: positive / total }} />
        <span className="min-w-1.5 rounded-full bg-faint" style={{ flex: neutral / total }} />
        <span className="min-w-1.5 rounded-full bg-coral" style={{ flex: negative / total }} />
      </div>
      <p className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-2xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <LegendDot tone="pine" />
          {t.overview.sentimentLegend('positive', positive)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LegendDot tone="faint" />
          {t.overview.sentimentLegend('neutral', neutral)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LegendDot tone="coral" />
          {t.overview.sentimentLegend('negative', negative)}
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
                  {c.unread && <i aria-label={t.overview.unread} className="inline-block size-[7px] rounded-full bg-coral" />}
                </b>
                <small className="block truncate text-2xs text-muted">{c.preview}</small>
              </span>
              <span className="grid justify-items-end gap-1">
                <NetIcon network={c.network} />
                <StatusPill tone={SENTIMENT_TONE[c.sentiment]} className="py-0.5 pl-[7px] pr-2 text-[12px]">
                  {t.sentiment[c.sentiment]}
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
  listening: Ear,
}

function TeamActivity({ model, now, className }: SectionProps & { now: Date }) {
  const { t } = useI18n()
  return (
    <Card title={t.overview.teamActivity} tools={<IconButton label={t.overview.auditLog} icon={History} href="#/team/audit" />} className={className}>
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
                  <time dateTime={e.at}>{t.dates.ago(e.at, now)}</time>
                </small>
              </p>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

