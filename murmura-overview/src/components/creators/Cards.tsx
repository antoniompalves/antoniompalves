import { useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { BarChart3, Check, ChevronDown, Download, ExternalLink, Lock, MoreHorizontal, PenLine, Plus, Trash2, UserMinus, UserPlus } from 'lucide-react'
import { MenuDivider, MenuItem, Popover } from '../Popover'
import { Avatar, Badge, BrandMark, Button, IconButton, NetIcon, StatusPill, cn } from '../ui'
import { deliverableWhere } from './Dialogs'
import { avatar } from '../../data/assets'
import { STATUS_ORDER, campaignState, creatorRecord, deliverablesOf, hasResults, isOverdue, rateOf, totals } from '../../data/creators'
import type { Creator, CreatorCampaign, Deliverable, DeliverableStatus, Tone, Workspace } from '../../data/types'
import { useI18n } from '../../i18n'

export const STATUS_TONE: Record<DeliverableStatus, Tone> = { briefed: 'plain', in_review: 'butter', approved: 'sea', live: 'pine' }
const BAR: Record<DeliverableStatus, string> = { briefed: 'bg-faint', in_review: 'bg-butter', approved: 'bg-sea', live: 'bg-pine' }

export const creatorPhoto = (c: Creator) => (c.photo ? avatar(c.photo) : undefined)

/** A small menu anchored to its own "…" button. */
function Menu({ label, children, anchorClass }: { label: string; children: (close: () => void) => ReactNode; anchorClass?: string }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <>
      <IconButton ref={ref} label={label} icon={MoreHorizontal} size="sm" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={cn('border-transparent hover:border-line-2', open && 'border-line-2', anchorClass)} />
      <Popover open={open} onClose={() => setOpen(false)} anchor={ref as RefObject<HTMLElement | null>} placement="bottom-end" label={label}>
        <div role="menu" aria-label={label}>
          {children(() => setOpen(false))}
        </div>
      </Popover>
    </>
  )
}

export interface CampaignHandlers {
  manage: boolean
  lock?: string
  money: (n: number, digits?: number) => string
  onAddDeliverable: (c: CreatorCampaign) => void
  onEditCampaign: (c: CreatorCampaign) => void
  onDeleteCampaign: (c: CreatorCampaign) => void
  onExport: (c: CreatorCampaign) => void
  onStatus: (d: Deliverable, s: DeliverableStatus) => void
  onPaid: (d: Deliverable) => void
  onResults: (d: Deliverable) => void
  onEditDeliverable: (d: Deliverable) => void
  onDeleteDeliverable: (d: Deliverable) => void
}

function StatusButton({ d, creator, h }: { d: Deliverable; creator: string; h: CampaignHandlers }) {
  const { t } = useI18n()
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const pill = <StatusPill tone={STATUS_TONE[d.status]}>{t.creators.status[d.status]}</StatusPill>
  if (!h.manage) return pill
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t.creators.statusOf(creator)}: ${t.creators.status[d.status]}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex cursor-pointer items-center gap-0.5 rounded-full pointer-coarse:min-h-11"
      >
        {pill}
        <ChevronDown size={14} aria-hidden className="text-muted" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={ref} label={t.creators.statusOf(creator)}>
        <div role="menu" aria-label={t.creators.statusOf(creator)}>
          {STATUS_ORDER.map((s) => (
            <MenuItem
              key={s}
              checked={d.status === s}
              lead={<i className={cn('size-2 shrink-0 rounded-full', BAR[s])} />}
              onClick={() => {
                setOpen(false)
                if (s !== d.status) h.onStatus(d, s)
              }}
            >
              {t.creators.status[s]}
            </MenuItem>
          ))}
        </div>
      </Popover>
    </>
  )
}

const CELL = 'hidden text-[12.5px] font-semibold text-muted max-[900px]:block'

/** One deliverable: who, where and in what format, due date, status, fee and whether it's paid, results, and its menu. */
function DeliverableRow({ d, ws, now, h }: { d: Deliverable; ws: Workspace; now: number; h: CampaignHandlers }) {
  const { t } = useI18n()
  const c = t.creators
  const creator = ws.creators.find((x) => x.id === d.creatorId)
  const name = creator?.name ?? '—'
  const profile = creator?.profiles.find((p) => p.network === d.network)
  const late = isOverdue(d, now)
  const rate = rateOf(d.results)
  return (
    <li className="grid grid-cols-[minmax(150px,1.3fr)_minmax(140px,1.1fr)_96px_minmax(120px,0.9fr)_118px_minmax(150px,1.2fr)_34px] items-center gap-3 border-t border-line py-3 first:border-t-0 max-[1100px]:grid-cols-[minmax(150px,1.3fr)_minmax(140px,1fr)_96px_minmax(120px,0.9fr)_110px_34px] max-[900px]:flex max-[900px]:flex-wrap max-[900px]:items-start max-[900px]:gap-x-4 max-[900px]:gap-y-2.5">
      <span className="flex min-w-0 items-center gap-2.5 max-[900px]:basis-[calc(100%-64px)]">
        {creator && <Avatar src={creatorPhoto(creator)} name={name} size="md" />}
        <span className="grid min-w-0">
          <b className="truncate text-sm font-bold">{name}</b>
          <small className="truncate text-[12.5px] text-muted">{profile?.handle ?? ''}</small>
        </span>
      </span>
      <span className="grid min-w-0 gap-0.5 max-[900px]:order-3 max-[900px]:basis-[calc(50%-8px)]">
        <span className={CELL}>{c.table.deliverable}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-2xs font-semibold">
          <NetIcon network={d.network} size="2xs" />
          <span className="truncate">{deliverableWhere(t, d.network, d.format)}</span>
        </span>
        {d.code && <small className="text-[12.5px] text-muted">{c.code(d.code)}</small>}
      </span>
      <span className="grid gap-0.5 text-2xs max-[900px]:order-4">
        <span className={CELL}>{c.table.due}</span>
        <span className={cn('font-semibold', late && 'text-bad')}>{t.dates.monthDay(new Date(d.dueAt))}</span>
        {late && (
          <Badge tone="coral" size="sm" className="justify-self-start">
            {c.overdue}
          </Badge>
        )}
      </span>
      <span className="max-[900px]:order-2 max-[900px]:basis-full">
        <StatusButton d={d} creator={name} h={h} />
      </span>
      <span className="grid gap-1 text-2xs max-[900px]:order-5">
        <span className={CELL}>{c.table.fee}</span>
        <b className="font-bold tabular-nums">{h.money(d.fee)}</b>
        {h.manage ? (
          <button
            type="button"
            aria-pressed={d.paid}
            aria-label={d.paid ? c.markUnpaid(name) : c.markPaid(name)}
            title={d.paid ? c.markUnpaid(name) : c.markPaid(name)}
            onClick={() => h.onPaid(d)}
            className={cn(
              'inline-flex h-6 w-fit cursor-pointer items-center gap-1 rounded-full px-2 text-[12px] font-bold pointer-coarse:h-9',
              d.paid ? 'bg-[color-mix(in_srgb,var(--pine)_15%,transparent)] text-good' : 'border border-dashed border-line-2 text-muted hover:text-text',
            )}
          >
            {d.paid && <Check size={12} strokeWidth={3} aria-hidden />}
            {d.paid ? c.paid : c.unpaid}
          </button>
        ) : (
          <small className={cn('font-bold', d.paid ? 'text-good' : 'text-muted')}>{d.paid ? c.paid : c.unpaid}</small>
        )}
      </span>
      <span className="grid min-w-0 gap-0.5 text-2xs max-[1100px]:hidden max-[900px]:order-6 max-[900px]:grid max-[900px]:basis-full">
        <span className={CELL}>{c.table.results}</span>
        {hasResults(d) ? (
          <>
            <b className="truncate font-semibold tabular-nums">{c.results(t.numbers.compact(d.results?.reach || d.results?.views || 0), rate === null ? '—' : t.numbers.pct1(rate))}</b>
            {(d.results?.conversions || d.results?.revenue) && (
              <small className="truncate text-[12.5px] text-muted tabular-nums">
                {[d.results?.conversions ? c.campaign.conversions(t.numbers.int(d.results.conversions)) : '', d.results?.revenue ? h.money(d.results.revenue) : ''].filter(Boolean).join(' · ')}
              </small>
            )}
          </>
        ) : h.manage && (d.status === 'live' || d.status === 'approved') ? (
          <Button variant="ghost" size="sm" icon={BarChart3} onClick={() => h.onResults(d)} className="justify-self-start">
            {c.logResults}
          </Button>
        ) : (
          <span className="text-muted">{c.noResults}</span>
        )}
      </span>
      <span className="justify-self-end max-[900px]:order-1 max-[900px]:ml-auto">
        <Menu label={c.deliverableOptions(name)}>
          {(close) => (
            <>
              <MenuItem
                icon={h.manage ? BarChart3 : Lock}
                disabled={!h.manage}
                title={h.lock}
                onClick={() => {
                  close()
                  h.onResults(d)
                }}
              >
                {hasResults(d) ? c.editResults : c.logResults}
              </MenuItem>
              {d.url && (
                <MenuItem
                  icon={ExternalLink}
                  onClick={() => {
                    close()
                    window.open(d.url, '_blank', 'noopener')
                  }}
                >
                  {c.openPost}
                </MenuItem>
              )}
              <MenuItem
                icon={h.manage ? PenLine : Lock}
                disabled={!h.manage}
                title={h.lock}
                onClick={() => {
                  close()
                  h.onEditDeliverable(d)
                }}
              >
                {c.editDeliverable}
              </MenuItem>
              <MenuDivider />
              <MenuItem
                icon={h.manage ? Trash2 : Lock}
                disabled={!h.manage}
                title={h.lock}
                className="text-bad"
                onClick={() => {
                  close()
                  h.onDeleteDeliverable(d)
                }}
              >
                {c.deleteDeliverable}
              </MenuItem>
            </>
          )}
        </Menu>
      </span>
    </li>
  )
}

/** A creator campaign: brand, dates, state and goal, its four figures, and every deliverable. */
export function CampaignCard({ campaign, ws, now, h }: { campaign: CreatorCampaign; ws: Workspace; now: number; h: CampaignHandlers }) {
  const { t } = useI18n()
  const c = t.creators
  const brand = ws.brands.find((b) => b.id === campaign.brandId)
  const ds = deliverablesOf(ws, campaign.id)
  const tot = totals(ds)
  const state = campaignState(campaign, now)
  const linked = ws.campaigns.find((x) => x.id === campaign.campaignId)
  const over = tot.agreed - campaign.budget
  const late = ds.filter((d) => isOverdue(d, now)).length
  const fig = 'grid min-w-0 content-start gap-1 rounded-[18px] bg-well px-3.5 py-3'
  const figLabel = 'text-[12.5px] font-semibold text-muted'
  const figValue = 'text-xl font-bold tracking-[-0.01em] tabular-nums'
  const sub = 'text-[12.5px] text-muted'
  const day = (s: string) => t.dates.monthDay(new Date(`${s}T12:00:00Z`))
  return (
    <section aria-labelledby={`cc-${campaign.id}`} className="min-w-0 animate-rise rounded-card border border-rim bg-glass p-5 shadow-card max-mobile:p-4">
      <header className="flex flex-wrap items-start gap-x-3 gap-y-2.5">
        {brand && <BrandMark brand={brand} size="md" />}
        <div className="min-w-0 flex-[1_1_220px] max-mobile:basis-0">
          <h2 id={`cc-${campaign.id}`} className="text-lg font-bold leading-[1.25] tracking-[-0.01em]">
            {campaign.name}
          </h2>
          <p className="text-2xs text-muted">
            {brand?.name} · {day(campaign.start)} – {day(campaign.end)}
            {linked && <span className="max-mobile:block"> · {c.campaign.linked(linked.name)}</span>}
          </p>
        </div>
        <span className="flex flex-wrap items-center gap-2 max-mobile:order-2 max-mobile:w-full">
          <StatusPill tone={state === 'running' ? 'pine' : state === 'upcoming' ? 'sea' : 'plain'}>{c.state[state]}</StatusPill>
          <Badge tone="plain" size="tight">
            {c.goal[campaign.goal]}
          </Badge>
          <Button size="sm" icon={h.manage ? Plus : Lock} disabled={!h.manage} title={h.lock} onClick={() => h.onAddDeliverable(campaign)}>
            {c.campaign.add}
          </Button>
        </span>
        <span className="max-mobile:order-1">
          <Menu label={c.campaign.options(campaign.name)}>
            {(close) => (
              <>
                <MenuItem
                  icon={h.manage ? PenLine : Lock}
                  disabled={!h.manage}
                  title={h.lock}
                  onClick={() => {
                    close()
                    h.onEditCampaign(campaign)
                  }}
                >
                  {c.campaign.edit}
                </MenuItem>
                <MenuItem
                  icon={Download}
                  onClick={() => {
                    close()
                    h.onExport(campaign)
                  }}
                >
                  {c.campaign.export}
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon={h.manage ? Trash2 : Lock}
                  disabled={!h.manage}
                  title={h.lock}
                  className="text-bad"
                  onClick={() => {
                    close()
                    h.onDeleteCampaign(campaign)
                  }}
                >
                  {c.campaign.delete}
                </MenuItem>
              </>
            )}
          </Menu>
        </span>
      </header>

      <dl className="mt-4 grid grid-cols-4 gap-2.5 max-[1100px]:grid-cols-2">
        <div className={fig}>
          <dt className={figLabel}>{c.campaign.budget}</dt>
          <dd className="grid gap-1.5">
            <span className="flex flex-wrap items-baseline gap-x-1.5">
              <span className={figValue}>{h.money(tot.agreed)}</span>
              <span className={sub}>{c.campaign.agreedOf(h.money(campaign.budget))}</span>
            </span>
            <span className="block h-1.5 overflow-hidden rounded-full bg-glass-3">
              <span className={cn('block h-full rounded-full', over > 0 ? 'bg-coral' : 'bg-text')} style={{ width: `${Math.min(100, campaign.budget ? (tot.agreed / campaign.budget) * 100 : 100)}%` }} />
            </span>
            <span className={cn(sub, over > 0 && 'font-semibold text-bad')}>{over > 0 ? c.campaign.over(h.money(over)) : c.campaign.paid(h.money(tot.paid))}</span>
          </dd>
        </div>
        <div className={fig}>
          <dt className={figLabel}>{c.campaign.deliverables}</dt>
          <dd className="grid gap-1.5">
            <span className={figValue}>{c.campaign.live(tot.live, tot.count)}</span>
            <span aria-hidden className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
              {STATUS_ORDER.map((s) => tot.byStatus[s] > 0 && <span key={s} className={cn('h-full', BAR[s])} style={{ flex: tot.byStatus[s] }} />)}
            </span>
            {late > 0 && <span className={cn(sub, 'font-semibold text-bad')}>{`${late} ${c.overdue.toLowerCase()}`}</span>}
          </dd>
        </div>
        <div className={fig}>
          <dt className={figLabel}>{c.campaign.reach}</dt>
          <dd className="grid gap-0.5">
            <span className={figValue}>{tot.reach ? t.numbers.compact(tot.reach) : c.campaign.none}</span>
            <span className={sub}>{tot.rate === null ? c.campaign.none : `${c.campaign.rate} ${t.numbers.pct1(tot.rate)}`}</span>
          </dd>
        </div>
        <div className={fig}>
          <dt className={figLabel}>{c.campaign.cpe}</dt>
          <dd className="grid gap-0.5">
            <span className={figValue}>{tot.cpe === null ? c.campaign.none : h.money(tot.cpe, 2)}</span>
            <span className={sub}>{tot.roas !== null ? `${c.campaign.roas} ${t.numbers.times(tot.roas)}` : tot.conversions ? c.campaign.conversions(t.numbers.int(tot.conversions)) : c.campaign.none}</span>
          </dd>
        </div>
      </dl>

      {ds.length ? (
        <div className="mt-3">
          <div aria-hidden className="grid grid-cols-[minmax(150px,1.3fr)_minmax(140px,1.1fr)_96px_minmax(120px,0.9fr)_118px_minmax(150px,1.2fr)_34px] gap-3 pb-1 pt-2 text-[12.5px] font-semibold text-muted max-[1100px]:grid-cols-[minmax(150px,1.3fr)_minmax(140px,1fr)_96px_minmax(120px,0.9fr)_110px_34px] max-[900px]:hidden">
            <span>{c.table.creator}</span>
            <span>{c.table.deliverable}</span>
            <span>{c.table.due}</span>
            <span>{c.table.status}</span>
            <span>{c.table.fee}</span>
            <span className="max-[1100px]:hidden">{c.table.results}</span>
            <span />
          </div>
          <ul aria-label={c.campaign.deliverables}>
            {ds.map((d) => (
              <DeliverableRow key={d.id} d={d} ws={ws} now={now} h={h} />
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 grid justify-items-center gap-1 rounded-[18px] border-[1.5px] border-dashed border-line-2 px-4 py-6 text-center">
          <b className="text-sm font-semibold">{c.campaign.emptyTitle}</b>
          <p className="text-2xs text-muted">{c.campaign.emptyText}</p>
        </div>
      )}
    </section>
  )
}

/** A creator on the roster: who they are, where they post, their rate and record, and what can be done with them. */
export function CreatorCard({ creator, ws, h }: { creator: Creator; ws: Workspace; h: { manage: boolean; lock?: string; money: (n: number, digits?: number) => string; onEdit: (c: Creator) => void; onBook: (c: Creator) => void; onRemove: (c: Creator) => void } }) {
  const { t } = useI18n()
  const r = t.creators.roster
  const rec = creatorRecord(ws, creator.id)
  const tone: Tone = creator.status === 'active' ? 'pine' : creator.status === 'prospect' ? 'butter' : 'plain'
  return (
    <article aria-label={creator.name} className="grid min-w-0 animate-rise content-start gap-3.5 rounded-tile border border-rim bg-glass-2 p-4 shadow-[0_14px_30px_-26px_rgb(20_24_28/0.5)]">
      <header className="flex min-w-0 items-center gap-3">
        <Avatar src={creatorPhoto(creator)} name={creator.name} size="lg" />
        <span className="grid min-w-0 flex-1">
          <b className="truncate font-bold">{creator.name}</b>
          <small className="truncate text-[12.5px] text-muted">{creator.location}</small>
        </span>
        <Badge tone={tone} size="tight">
          {r.state[creator.status]}
        </Badge>
        <Menu label={r.options(creator.name)}>
          {(close) => (
            <>
              <MenuItem
                icon={h.manage ? PenLine : Lock}
                disabled={!h.manage}
                title={h.lock}
                onClick={() => {
                  close()
                  h.onEdit(creator)
                }}
              >
                {r.edit}
              </MenuItem>
              <MenuItem
                icon={h.manage ? UserPlus : Lock}
                disabled={!h.manage}
                title={h.lock}
                onClick={() => {
                  close()
                  h.onBook(creator)
                }}
              >
                {r.book}
              </MenuItem>
              <MenuDivider />
              <MenuItem
                icon={h.manage ? UserMinus : Lock}
                disabled={!h.manage}
                title={h.lock}
                className="text-bad"
                onClick={() => {
                  close()
                  h.onRemove(creator)
                }}
              >
                {r.remove}
              </MenuItem>
            </>
          )}
        </Menu>
      </header>
      <ul className="grid gap-1.5">
        {creator.profiles.map((p) => (
          <li key={`${p.network}${p.handle}`} className="flex min-w-0 items-center gap-2 text-2xs">
            <NetIcon network={p.network} size="2xs" />
            <span className="min-w-0 flex-1 truncate font-semibold">{p.handle}</span>
            <span className="tabular-nums text-muted">{t.numbers.compact(p.followers)}</span>
          </li>
        ))}
      </ul>
      {creator.tags.length > 0 && (
        <p className="flex flex-wrap gap-1.5">
          {creator.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-well px-2 py-0.5 text-[12px] font-semibold text-muted">
              {tag}
            </span>
          ))}
        </p>
      )}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line pt-3 text-2xs">
        {creator.rate !== undefined && <dd className="col-span-full font-bold">{r.rate(h.money(creator.rate))}</dd>}
        <dd className="text-muted">{r.deliverables(rec.count)}</dd>
        <dd className="text-right text-muted tabular-nums">{rec.agreed ? r.fees(h.money(rec.agreed)) : ''}</dd>
        {rec.rate !== null && <dd className="col-span-full text-muted">{r.rateAvg(t.numbers.pct1(rec.rate))}</dd>}
      </dl>
      {creator.notes && <p className="line-clamp-2 text-[12.5px] text-muted">{creator.notes}</p>}
    </article>
  )
}
