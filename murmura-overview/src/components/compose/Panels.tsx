import { useState } from 'react'
import type { ReactNode } from 'react'
import { Calendar, Check, ChevronDown, Copy, Eye, FileText, Globe, Lock, Plus, Send, Shield, Trash2, TrendingUp, Zap } from 'lucide-react'
import { Empty } from '../analytics/parts'
import { PostPreview } from '../PostPreview'
import { Avatar, BrandMark, IconButton, NetStack, NetworkGlyph, cn, toneFill } from '../ui'
import type { Draft } from '../../data/compose'
import { postTitle } from '../../data/compose'
import { NETWORK_LABEL, STATUS_TONE } from '../../data/selectors'
import type { Brand, NetworkId, Post, TeamMember } from '../../data/types'
import { useI18n } from '../../i18n'

const DAY = 86_400_000
const card = 'min-w-0 rounded-card border border-rim bg-glass p-5 shadow-card max-mobile:p-4'
const cardTitle = 'text-base font-semibold tracking-[-0.005em]'

/* ───────────────────────── preview ───────────────────────── */

/** Preview (".cm-pv"): network switch, the post as that network lays it out, and a tip. Phones keep it folded until asked. */
export function PreviewCard({
  brand,
  nets,
  network,
  onNetwork,
  draft,
  stamp,
  empty,
}: {
  brand: Brand
  nets: NetworkId[]
  network: NetworkId | null
  onNetwork: (n: NetworkId) => void
  draft: Draft
  stamp: string
  empty?: string
}) {
  const { t } = useI18n()
  const p = t.compose.preview
  const [open, setOpen] = useState(false)
  return (
    <section aria-labelledby="cm-pv-t" className={cn(card, '[grid-area:pv] desk:sticky desk:top-4')}>
      <header className="mb-3.5 flex min-h-[42px] flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="cm-pv-t" className={cardTitle}>
            {p.title}
          </h2>
          {network && <p className="truncate text-2xs text-muted">{p.sub(NETWORK_LABEL[network], brand.handle)}</p>}
        </div>
        <div className="flex max-w-full items-center gap-2">
          {nets.length > 1 && (
            <div role="group" aria-label={p.network} className="inline-flex max-w-full overflow-x-auto rounded-full bg-well p-[3px] [scrollbar-width:none]">
              {nets.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={n === network}
                  aria-label={NETWORK_LABEL[n]}
                  title={NETWORK_LABEL[n]}
                  onClick={() => onNetwork(n)}
                  className={cn(
                    'grid cursor-pointer place-items-center rounded-full px-[11px] py-[7px] transition-[background-color,box-shadow] duration-300 ease-soft pointer-coarse:p-[13px]',
                    n === network ? 'bg-glass-3 shadow-[0_2px_8px_rgb(0_0_0/0.08)] dark:bg-white/14' : 'text-muted',
                  )}
                >
                  <NetworkGlyph network={n} className="size-[18px] stroke-[1.9]" />
                </button>
              ))}
            </div>
          )}
          <span className="hidden max-mobile:inline-flex">
            <IconButton
              label={open ? p.hide : p.show}
              icon={ChevronDown}
              size="sm"
              aria-expanded={open}
              aria-controls="cm-pv-body"
              onClick={() => setOpen((o) => !o)}
              className={cn('[&>svg]:transition-transform', open && '[&>svg]:rotate-180')}
            />
          </span>
        </div>
      </header>
      <div id="cm-pv-body" className={cn(!open && 'max-mobile:hidden')}>
        <div className="grid min-h-[380px] content-start justify-items-center rounded-[22px] bg-well px-3.5 py-[22px] max-mobile:min-h-0 max-mobile:px-2.5 max-mobile:py-4 [&>article]:shadow-[0_24px_50px_-28px_rgb(20_24_28/0.45)]">
          {network ? (
            <PostPreview post={{ text: draft.text, media: draft.media }} brand={brand} network={network} stamp={stamp} empty={empty} />
          ) : (
            <div className="self-center pt-20">
              <Empty icon={Eye} title={p.noneTitle} text={p.noneText} />
            </div>
          )}
        </div>
        {network && (
          <p className="mt-3 flex items-start gap-2 text-2xs text-muted">
            <Zap size={16} aria-hidden className="mt-px shrink-0 text-lilac" />
            {p.tips[network]}
          </p>
        )}
      </div>
    </section>
  )
}

/* ───────────────────────── when ───────────────────────── */

const pad = (n: number) => String(n).padStart(2, '0')
const dateValue = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const timeValue = (ms: number) => `${pad(new Date(ms).getUTCHours())}:${pad(new Date(ms).getUTCMinutes())}`

interface WhenProps {
  at: number
  now: Date
  onAt: (ms: number) => void
  readOnly: boolean
  /** "Goes out in 22 h" or what applies to the post being edited. */
  caption: string
  zone: string
  nets: NetworkId[]
  best: number[]
  onNextFree: () => void
  day: { day: number; posts: Post[]; close: number }
  brand: string
}

export function WhenCard({ at, now, onAt, readOnly, caption, zone, nets, best, onNextFree, day, brand }: WhenProps) {
  const { t } = useI18n()
  const w = t.compose.when
  const d = new Date(at)
  const setDate = (v: string) => v && onAt(Date.parse(`${v}T${timeValue(at)}:00Z`))
  const setTime = (v: string) => v && onAt(Date.parse(`${dateValue(at)}T${v}:00Z`))
  const chip =
    'inline-flex h-[34px] cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-full border px-[13px] text-2xs font-semibold transition-colors pointer-coarse:h-11 max-mobile:flex-[calc(50%-6px)] max-mobile:justify-center'
  const field = 'h-[47px] w-full min-w-0 rounded-[14px] border border-line-2 bg-glass-2 px-3 py-2.5 text-md text-text outline-none focus-visible:border-text'
  return (
    <section aria-labelledby="cm-when-t" className={cn(card, '[grid-area:when]')}>
      <header className="mb-2 flex min-h-[42px] items-center justify-between gap-3">
        <h2 id="cm-when-t" className={cardTitle}>
          {w.title}
        </h2>
        <span className="inline-flex h-[30px] items-center rounded-full bg-well px-3 text-2xs font-semibold text-muted">{zone.split('/').pop()?.replace('_', ' ')}</span>
      </header>
      <p className="mb-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <b className="text-[30px] font-bold leading-[1.08] tracking-[-0.025em] tabular-nums max-mobile:text-[26px]">{t.dates.dayLong(d)}</b>
        <span className="text-[30px] font-semibold leading-[1.08] tracking-[-0.025em] text-muted tabular-nums max-mobile:text-[26px]">{t.dates.time(d)}</span>
        <small className={cn('basis-full text-2xs font-semibold', at < now.getTime() && !readOnly ? 'text-bad' : 'text-muted')}>{caption}</small>
      </p>
      <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
        <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-2.5">
          <label className="grid gap-1.5">
            <span className="text-2xs font-semibold text-muted">{w.date}</span>
            <input type="date" value={dateValue(at)} min={dateValue(now.getTime())} onChange={(e) => setDate(e.target.value)} className={field} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-2xs font-semibold text-muted">{w.time}</span>
            <input type="time" value={timeValue(at)} step={300} onChange={(e) => setTime(e.target.value)} className={field} />
          </label>
        </div>
        {!readOnly && (
          <div className="mt-4 grid gap-2">
            <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-muted">
              {nets.length ? w.bestFor : w.best}
              {nets.length > 0 && <NetStack networks={nets} size="xs" />}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {best.map((ms) => {
                const on = Math.abs(ms - at) < 60_000
                return (
                  <button
                    key={ms}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onAt(ms)}
                    className={cn(chip, on ? 'border-transparent bg-pill text-on-pill' : 'border-rim bg-glass-2 hover:bg-glass-3')}
                  >
                    <TrendingUp size={16} aria-hidden className={on ? '' : 'text-good'} />
                    {t.dates.slot(new Date(ms), now)}
                  </button>
                )
              })}
              <button type="button" onClick={onNextFree} className={cn(chip, 'border-rim bg-glass-2 hover:bg-glass-3')}>
                <Zap size={16} aria-hidden className="text-warn" />
                {w.nextFree}
              </button>
            </div>
          </div>
        )}
      </fieldset>
      <div className="mt-4">
        <div
          role="img"
          aria-label={`${w.day}: ${day.close ? w.close(day.close, brand) : day.posts.length ? w.sameDay(day.posts.length, brand) : w.nothing(brand)}`}
          className="relative h-9 overflow-hidden rounded-xl border border-line bg-[linear-gradient(90deg,var(--well)_0_25%,transparent_25%_87.5%,var(--well)_87.5%),var(--glass-2)]"
        >
          {day.posts.map((p) => (
            <i
              key={p.id}
              title={`${t.dates.time(new Date(p.scheduledAt))} · ${t.status[p.status]} · ${postTitle(p.text) || t.compose.untitled}`}
              className={cn('absolute top-2.5 -ml-[7px] size-3.5 rounded-full shadow-[0_0_0_2px_var(--solid)]', STATUS_TONE[p.status] === 'plain' ? 'bg-faint' : toneFill[STATUS_TONE[p.status]])}
              style={{ left: `${((Date.parse(p.scheduledAt) - day.day) / DAY) * 100}%` }}
            />
          ))}
          <i
            aria-hidden
            className="absolute bottom-1 top-1 -ml-0.5 w-1 rounded-sm bg-text shadow-[0_0_0_2px_var(--solid)] transition-[left] duration-500 ease-soft"
            style={{ left: `${((at - day.day) / DAY) * 100}%` }}
          />
        </div>
        <div aria-hidden className="mt-1 flex justify-between text-[12.5px] text-faint tabular-nums">
          {w.ticks.map((tick, i) => (
            <span key={i}>{tick}</span>
          ))}
        </div>
        <p className={cn('mt-1.5 text-2xs', day.close ? 'font-semibold text-warn' : 'text-muted')}>
          {day.close ? w.close(day.close, brand) : day.posts.length ? w.sameDay(day.posts.length, brand) : w.nothing(brand)}
        </p>
      </div>
      <p className="mt-3.5 flex items-start gap-2 border-t border-line pt-3 text-2xs text-muted">
        <Globe size={16} aria-hidden className="mt-px shrink-0" />
        {w.tz(zone)}
      </p>
    </section>
  )
}

/* ───────────────────────── publish bar ───────────────────────── */

type BarAction = 'main' | 'now' | 'draft'

interface BarProps {
  approval: boolean
  approvers: TeamMember[]
  channels: number
  when: string
  mainLabel: string
  /** Blocking issues for scheduling, and for "Publish now" (which ignores the time). */
  blocked: number
  blockedNow: number
  /** "Publish now" is off under the "everyone needs approval" rule. */
  nowLocked: boolean
  why: string
  onAction: (a: BarAction) => void
  readOnly: null | { published: boolean; when: string; onOpen?: () => void; onDuplicate: () => void; onNew: () => void }
}

const onInk =
  'inline-flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border border-on-ink/28 px-4 text-sm font-semibold text-on-ink hover:bg-on-ink/10 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 disabled:cursor-not-allowed disabled:opacity-50 max-mobile:size-12 max-mobile:flex-none max-mobile:p-0'
const go =
  'inline-flex h-[54px] min-w-0 flex-[100%] cursor-pointer items-center justify-center gap-2 rounded-full bg-butter px-5 text-md font-bold text-[#16191d] hover:bg-[#f6d56d] aria-disabled:cursor-not-allowed aria-disabled:bg-on-ink/14 aria-disabled:text-on-ink/72 max-mobile:order-3 max-mobile:h-12 max-mobile:flex-auto max-mobile:px-4 max-mobile:text-sm'

export function PublishBar(props: BarProps) {
  const { t } = useI18n()
  const b = t.compose.bar
  const box =
    'grid gap-3.5 rounded-card bg-ink p-5 text-on-ink shadow-card [grid-area:bar] max-mobile:sticky max-mobile:bottom-[calc(64px+10px)] max-mobile:z-20 max-mobile:gap-2 max-mobile:rounded-[26px] max-mobile:p-2.5 max-mobile:shadow-pop'
  const kicker = 'flex items-center gap-[7px] text-2xs font-semibold opacity-76 max-mobile:hidden'
  const label = 'max-mobile:sr-only'

  if (props.readOnly) {
    const r = props.readOnly
    return (
      <section aria-label={b.readOnly} className={box}>
        <div className="min-w-0 max-mobile:px-1.5">
          <p className={kicker}>
            {r.published ? <Check size={16} aria-hidden /> : <Lock size={16} aria-hidden />}
            {r.published ? b.published : b.readOnly}
          </p>
          <p className="mt-1 text-lg font-semibold tracking-[-0.01em] max-mobile:m-0 max-mobile:truncate max-mobile:text-2xs">{r.when}</p>
        </div>
        <div className="flex flex-wrap gap-2 max-mobile:flex-nowrap">
          {r.onOpen && (
            <button type="button" onClick={r.onOpen} className={go}>
              <Eye size={20} aria-hidden />
              <span className="truncate">{b.open}</span>
            </button>
          )}
          <button type="button" onClick={r.onDuplicate} aria-label={b.duplicate} className={onInk}>
            <Copy size={18} aria-hidden />
            <span className={label}>{b.duplicate}</span>
          </button>
          <button type="button" onClick={r.onNew} aria-label={t.compose.newPost} className={onInk}>
            <Plus size={18} aria-hidden />
            <span className={label}>{t.compose.newPost}</span>
          </button>
        </div>
      </section>
    )
  }

  const names = props.approvers.map((m) => m.name.split(' ')[0])
  return (
    <section aria-label={props.approval ? b.approval : b.direct} className={box}>
      <div className="min-w-0 max-mobile:px-1.5">
        <p className={kicker}>
          {props.approval ? <Shield size={16} aria-hidden /> : <Zap size={16} aria-hidden />}
          {props.approval ? b.approval : b.direct}
        </p>
        <p className="mt-1 text-lg font-semibold tracking-[-0.01em] max-mobile:m-0 max-mobile:truncate max-mobile:text-2xs max-mobile:leading-[1.3]">
          <b className="mr-0.5 inline-block text-[28px] font-bold tracking-[-0.02em] max-mobile:inline max-mobile:text-base">{props.channels}</b> {b.channels(props.channels)} · {props.when}
        </p>
      </div>
      {props.approval && (
        <p className="flex items-center gap-2.5 text-2xs font-semibold max-mobile:hidden">
          {props.approvers.length ? (
            <span className="inline-flex">
              {props.approvers.slice(0, 4).map((m, i) => (
                <Avatar key={m.id} src={m.avatar} name={m.name} size="sm" className={cn('shadow-[0_0_0_2px_var(--ink)]', i > 0 && '-ml-2')} />
              ))}
            </span>
          ) : (
            <Shield size={18} aria-hidden className="text-butter" />
          )}
          <span>{props.approvers.length ? b.approvers(names) : b.noApprovers}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2 max-mobile:flex-nowrap">
        <button type="button" aria-disabled={props.blocked > 0} onClick={() => props.onAction('main')} className={go}>
          {props.approval ? <Shield size={20} aria-hidden /> : <Calendar size={20} aria-hidden />}
          <span className="truncate">{props.mainLabel}</span>
        </button>
        <button
          type="button"
          aria-label={b.now}
          disabled={props.nowLocked}
          title={props.nowLocked ? b.ruleAll : undefined}
          aria-disabled={!props.nowLocked && props.blockedNow > 0}
          onClick={() => props.onAction('now')}
          className={onInk}
        >
          <Send size={16} aria-hidden />
          <span className={label}>{b.now}</span>
        </button>
        <button type="button" aria-label={b.draft} onClick={() => props.onAction('draft')} className={onInk}>
          <FileText size={16} aria-hidden />
          <span className={label}>{b.draft}</span>
        </button>
      </div>
      {props.why && <p className="text-2xs opacity-76 max-mobile:hidden">{props.why}</p>}
    </section>
  )
}

/* ───────────────────────── drafts ───────────────────────── */

export function DraftsCard({
  toFinish,
  waiting,
  current,
  brands,
  now,
  onDelete,
}: {
  toFinish: Post[]
  waiting: Post[]
  current: string | null
  brands: Brand[]
  now: Date
  onDelete: (p: Post) => void
}) {
  const { t } = useI18n()
  const dr = t.compose.drafts
  const count = toFinish.length + waiting.length
  const group = 'px-0.5 pb-0.5 pt-2 text-[12.5px] font-bold uppercase tracking-[0.06em] text-muted first:pt-0 max-tablet:col-span-full'
  const item = (p: Post): ReactNode => {
    const brand = brands.find((b) => b.id === p.brandId)
    const on = p.id === current
    const bar = p.status === 'changes_requested' || p.status === 'failed' ? 'before:bg-coral' : p.status === 'awaiting_approval' ? 'before:bg-butter' : 'before:bg-faint'
    const status = t.status[p.status]
    const rel = t.dates.ago(p.status === 'awaiting_approval' ? ([...p.reviews].reverse().find((r) => r.decision === 'submitted')?.at ?? p.createdAt) : p.createdAt, now)
    return (
      <li key={p.id} className="flex min-w-0 items-center gap-1">
        <a
          href={`#/compose/${p.id}`}
          aria-current={on ? 'true' : undefined}
          className={cn(
            'relative flex min-w-0 flex-1 items-center gap-[11px] rounded-[18px] border py-2.5 pl-3.5 pr-3 before:absolute before:bottom-3.5 before:left-[5px] before:top-3.5 before:w-[3px] before:rounded-sm pointer-coarse:min-h-14',
            bar,
            on ? 'border-transparent bg-pill text-on-pill' : 'border-rim bg-glass-2 hover:bg-glass-3',
          )}
        >
          {brand && <BrandMark brand={brand} size="sm" />}
          <span className="min-w-0 flex-1">
            <b className="block truncate text-xs font-semibold">{postTitle(p.text) || t.compose.untitled}</b>
            <small className={cn('block truncate text-[12.5px]', on ? 'text-on-pill/70' : 'text-muted')}>{p.status === 'awaiting_approval' ? dr.sent(status, rel) : dr.started(status, rel)}</small>
          </span>
          <span className="shrink-0 max-mobile:hidden desk:hidden">
            <NetStack networks={p.networks} size="2xs" />
          </span>
        </a>
        {p.status !== 'awaiting_approval' && <IconButton label={dr.remove} icon={Trash2} size="sm" onClick={() => onDelete(p)} className="border-transparent" />}
      </li>
    )
  }
  return (
    <section aria-labelledby="cm-dr-t" className={cn(card, '[grid-area:drafts]')}>
      <header className="mb-3.5 flex min-h-[42px] items-center gap-2">
        <h2 id="cm-dr-t" className={cn(cardTitle, 'flex items-center gap-2')}>
          {dr.title}
          {count > 0 && <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-well px-1.5 text-[12.5px] font-bold">{count}</span>}
        </h2>
      </header>
      <ul className="grid gap-1.5 max-tablet:grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))]">
        {count ? (
          <>
            {toFinish.length > 0 && <li className={group}>{dr.toFinish}</li>}
            {toFinish.map(item)}
            {waiting.length > 0 && <li className={group}>{dr.waiting}</li>}
            {waiting.map(item)}
          </>
        ) : (
          <li className="col-span-full">
            <Empty icon={FileText} title={dr.noneTitle} text={dr.noneText} compact />
          </li>
        )}
      </ul>
    </section>
  )
}
