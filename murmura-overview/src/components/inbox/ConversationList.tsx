import { useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { AtSign, Check, CheckCheck, Flag, Image as ImageIcon, ListFilter, Mail, MessageCircle, Search, Star, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Brand, Conversation, ConversationKind, NetworkId, Sentiment, TeamMember } from '../../data/types'
import type { InboxFilters, InboxView, inboxStats } from '../../data/inbox'
import { VIEWS, filterCount, lastInbound, previewMessage, splitMatches, unreadCount } from '../../data/inbox'
import { NETWORK_LABEL, NETWORK_ORDER } from '../../data/selectors'
import { useI18n } from '../../i18n'
import { Popover } from '../Popover'
import { Avatar, Button, Initials, NetIcon, NetworkGlyph, cn, toneFill } from '../ui'

export const KIND_ICON: Record<ConversationKind, LucideIcon> = {
  comment: MessageCircle,
  message: Mail,
  mention: AtSign,
  review: Star,
}

const SENTIMENTS: { value: Sentiment; dot: string }[] = [
  { value: 'positive', dot: 'bg-good' },
  { value: 'neutral', dot: 'bg-faint' },
  { value: 'negative', dot: 'bg-coral' },
]

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/** 48px avatar with the network glyph pinned to its corner (".ib-face"). */
export function Face({ c, size = 'lg' }: { c: Conversation; size?: 'lg' | 'md' | 'xl' }) {
  const box = size === 'lg' ? 'size-12 text-base' : size === 'md' ? 'size-10 text-[13px]' : 'mb-2 size-24 text-[30px]'
  return (
    <span className="relative inline-flex shrink-0">
      {c.contact.avatar ? (
        <img src={c.contact.avatar} alt="" loading="lazy" decoding="async" className={cn('rounded-full bg-well object-cover', box)} />
      ) : (
        <Initials name={c.contact.name} className={box} />
      )}
      {size !== 'xl' && (
        <span className="absolute -bottom-[3px] -right-1">
          <NetIcon network={c.network} size={size === 'md' ? '3xs' : '2xs'} surface="badge" />
        </span>
      )}
    </span>
  )
}

const Hl = ({ text, q }: { text: string; q: string }) => (
  <>
    {splitMatches(text, q).map((p, i) =>
      p.hit ? (
        <mark key={i} className="rounded-[3px] bg-[color-mix(in_srgb,var(--butter)_70%,transparent)] px-px text-inherit">
          {p.text}
        </mark>
      ) : (
        p.text
      ),
    )}
  </>
)

interface ListProps {
  all: Conversation[]
  rows: Conversation[]
  currentId: string | null
  view: InboxView
  setView: (v: InboxView) => void
  stats: ReturnType<typeof inboxStats>
  filters: InboxFilters
  setFilters: (f: InboxFilters) => void
  query: string
  setQuery: (q: string) => void
  searchRef: RefObject<HTMLInputElement | null>
  brands: Map<string, Brand>
  team: Map<string, TeamMember>
  now: Date
  stampId: string | null
  onMarkAllRead: () => void
}

/** Left pane (".ib-side"): title + figures, search, view chips, filter popover, rows. */
export function ConversationList(props: ListProps) {
  const { all, rows, currentId, view, setView, stats, filters, setFilters, query, setQuery, searchRef, brands, team, now, stampId, onMarkAllRead } = props
  const { t } = useI18n()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterBtn = useRef<HTMLButtonElement>(null)
  const active = filterCount(filters)
  const open = all.filter((c) => c.status === 'open')

  const ic =
    'relative inline-grid size-[38px] shrink-0 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-well hover:text-text disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <aside aria-label={t.inbox.conversations} className="flex min-h-0 min-w-0 flex-col border-r border-line bg-[color-mix(in_srgb,var(--float)_55%,transparent)] max-mobile:border-r-0 max-mobile:bg-transparent">
      <header className="flex items-center justify-between gap-2.5 pb-2.5 pl-4 pr-2.5 pt-3.5 max-mobile:pb-2 max-mobile:pl-3.5 max-mobile:pr-2 max-mobile:pt-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[21px] font-bold leading-[1.15] tracking-[-0.02em]">
            {t.inbox.title}
            <span aria-label={t.inbox.openCount} className="inline-grid h-[22px] min-w-[26px] place-items-center rounded-full bg-well px-[7px] text-[12.5px] font-bold tabular-nums">
              {stats.open}
            </span>
          </h2>
          <p className="mt-0.5 truncate text-[12.5px] text-muted">
            {t.inbox.summary(
              <b className="font-bold text-text tabular-nums">{stats.unread}</b>,
              <b className="font-bold text-text tabular-nums">{t.dates.duration(stats.medianReply)}</b>,
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <button
            ref={filterBtn}
            type="button"
            aria-label={t.inbox.filters}
            title={t.inbox.filters}
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(ic, (filtersOpen || active > 0) && 'bg-[color-mix(in_srgb,var(--sea)_13%,transparent)] text-ib-acc-text')}
          >
            <ListFilter size={20} aria-hidden />
            {active > 0 && (
              <span className="absolute right-px top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-sea px-1 text-[11.5px] font-bold leading-none text-on-sea">
                {active}
              </span>
            )}
          </button>
          <button type="button" aria-label={t.inbox.markAllRead} title={t.inbox.markAllRead} onClick={onMarkAllRead} disabled={stats.unread === 0} className={ic}>
            <CheckCheck size={20} aria-hidden />
          </button>
        </div>
      </header>

      <label className="mx-3 flex h-[38px] shrink-0 items-center gap-2.5 rounded-full border border-transparent bg-well px-3 text-muted focus-within:border-sea focus-within:bg-float max-mobile:mx-2.5">
        <Search size={17} aria-hidden className="shrink-0" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && (setQuery(''), e.currentTarget.blur())}
          placeholder={t.inbox.searchPlaceholder}
          aria-label={t.inbox.searchLabel}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-muted"
        />
        <kbd className="ml-auto rounded-lg border border-line-2 bg-glass-2 px-[7px] py-px font-[inherit] text-[12.5px] font-semibold leading-normal text-muted [@media(pointer:coarse)]:hidden">/</kbd>
      </label>

      <div
        role="group"
        aria-label={t.inbox.viewsLabel}
        className="flex shrink-0 gap-1.5 overflow-x-auto px-3 py-2.5 [mask-image:linear-gradient(90deg,#000_calc(100%-20px),transparent)] [scrollbar-width:none]"
      >
        {VIEWS.map((v) => {
          const pressed = view === v
          const n = stats.views[v]
          return (
            <button
              key={v}
              type="button"
              aria-pressed={pressed}
              onClick={() => setView(v)}
              className={cn(
                'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-2xs font-semibold transition-colors',
                pressed
                  ? 'bg-[color-mix(in_srgb,var(--sea)_16%,var(--float))] text-ib-acc-text shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--sea)_40%,transparent)]'
                  : 'bg-well text-muted hover:bg-line-2 hover:text-text',
              )}
            >
              {t.inbox.views[v]}
              {n > 0 && <b className="text-[12.5px] font-bold tabular-nums">{n}</b>}
            </button>
          )
        })}
      </div>

      <div role="list" aria-label="Conversations" className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-color:var(--line-2)_transparent] [scrollbar-width:thin] max-mobile:overflow-visible">
        {rows.length === 0 ? (
          <EmptyList view={view} query={query} filtered={active > 0} onClear={() => (setQuery(''), setFilters({ kinds: [], networks: [], sentiments: [] }))} />
        ) : (
          rows.map((c, i) => (
            <Row
              key={c.id}
              c={c}
              last={i === rows.length - 1}
              current={c.id === currentId}
              stamped={c.id === stampId}
              brand={brands.get(c.brandId)!}
              assignee={c.assigneeId ? team.get(c.assigneeId) : undefined}
              query={query}
              now={now}
            />
          ))
        )}
      </div>

      <Popover open={filtersOpen} onClose={() => setFiltersOpen(false)} anchor={filterBtn} label={t.inbox.filters} className="w-[288px]">
        <div className="flex items-center justify-between gap-2.5 px-2.5 pb-1.5 pt-2">
          <b className="text-sm font-bold">{t.inbox.filters}</b>
          <Button size="sm" variant="ghost" disabled={active === 0} onClick={() => setFilters({ kinds: [], networks: [], sentiments: [] })}>
            {t.common.clear}
          </Button>
        </div>
        <div className="max-h-[min(60vh,460px)] overflow-y-auto px-1 pb-1.5">
          <FilterGroup title={t.inbox.kind}>
            {(Object.keys(KIND_ICON) as ConversationKind[]).map((k) => {
              const Icon = KIND_ICON[k]
              return (
                <FilterCheck
                  key={k}
                  checked={filters.kinds.includes(k)}
                  onChange={() => setFilters({ ...filters, kinds: toggle(filters.kinds, k) })}
                  count={open.filter((c) => c.kind === k).length}
                  lead={<Icon size={17} className="text-muted" aria-hidden />}
                >
                  {t.kinds[k].many}
                </FilterCheck>
              )
            })}
          </FilterGroup>
          <FilterGroup title={t.inbox.network}>
            {(['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'threads'] as NetworkId[])
              .filter((n) => NETWORK_ORDER.includes(n))
              .map((n) => (
                <FilterCheck
                  key={n}
                  checked={filters.networks.includes(n)}
                  onChange={() => setFilters({ ...filters, networks: toggle(filters.networks, n) })}
                  count={open.filter((c) => c.network === n).length}
                  lead={
                    // Inside a filter row every icon is drawn muted at 17px, network glyphs included.
                    <span className="grid size-[22px] shrink-0 place-items-center rounded-full border border-line bg-glass-2 text-muted">
                      <NetworkGlyph network={n} className="size-[17px] stroke-[1.9]" />
                    </span>
                  }
                >
                  {NETWORK_LABEL[n]}
                </FilterCheck>
              ))}
          </FilterGroup>
          <FilterGroup title={t.inbox.sentimentLabel}>
            {SENTIMENTS.map((s) => (
              <FilterCheck
                key={s.value}
                checked={filters.sentiments.includes(s.value)}
                onChange={() => setFilters({ ...filters, sentiments: toggle(filters.sentiments, s.value) })}
                count={open.filter((c) => c.sentiment === s.value).length}
                lead={<i className={cn('size-[9px] shrink-0 rounded-full', s.dot)} />}
              >
                {t.sentiment[s.value]}
              </FilterCheck>
            ))}
          </FilterGroup>
        </div>
      </Popover>
    </aside>
  )
}

const FilterGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <fieldset>
    <legend className="w-full px-2 pb-1 pt-2.5 text-[12.5px] font-bold uppercase tracking-[0.06em] text-muted">{title}</legend>
    {children}
  </fieldset>
)

function FilterCheck({ checked, onChange, count, lead, children }: { checked: boolean; onChange: () => void; count: number; lead: ReactNode; children: ReactNode }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2 text-xs font-semibold hover:bg-well">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="grid size-5 shrink-0 cursor-pointer appearance-none place-items-center rounded-[7px] border-[1.5px] border-line-2 bg-glass-2 checked:border-transparent checked:bg-pill checked:after:h-[5px] checked:after:w-2.5 checked:after:-translate-y-px checked:after:-rotate-45 checked:after:border-b-2 checked:after:border-l-2 checked:after:border-on-pill checked:after:content-['']"
      />
      {lead}
      <span className="min-w-0 flex-1">{children}</span>
      <span className="text-[12.5px] font-bold text-muted tabular-nums">{count}</span>
    </label>
  )
}

interface RowProps {
  c: Conversation
  last: boolean
  current: boolean
  stamped: boolean
  brand: Brand
  assignee?: TeamMember
  query: string
  now: Date
}

/** One conversation (".ib-row"): 72px, avatar + network, name, brand dot, time, kind, snippet, badges. */
function Row({ c, last, current, stamped, brand, assignee, query, now }: RowProps) {
  const { t } = useI18n()
  const link = useRef<HTMLAnchorElement>(null)
  // Keep the open conversation in sight when it's picked with J/K or arrives from a link.
  useEffect(() => {
    if (current) link.current?.scrollIntoView({ block: 'nearest' })
  }, [current])
  const Icon = KIND_ICON[c.kind]
  const msg = previewMessage(c)
  const count = unreadCount(c)
  const unread = count > 0
  const inbound = lastInbound(c)
  return (
    <div role="listitem" className="relative">
      <a
        ref={link}
        href={`#/inbox/${c.id}`}
        aria-current={current ? 'true' : undefined}
        aria-label={t.inbox.row({ name: c.contact.name, kind: t.kinds[c.kind].one, network: NETWORK_LABEL[c.network], brand: brand.name, unread: count, priority: c.priority, assignee: assignee?.name })}
        className={cn(
          'relative grid h-[72px] grid-cols-[48px_minmax(0,1fr)] items-center gap-[13px] pl-3.5 pr-3 text-text focus-visible:rounded-md focus-visible:-outline-offset-2 max-mobile:h-[76px] max-mobile:pl-3 max-mobile:pr-2.5',
          current ? 'bg-well' : 'hover:bg-[color-mix(in_srgb,var(--well)_60%,transparent)]',
        )}
      >
        <Face c={c} />
        <span className={cn('grid h-full min-w-0 content-center gap-0.5 border-b', last ? 'border-transparent' : 'border-line')}>
          <span className="flex min-w-0 items-center gap-1.5">
            <b className={cn('min-w-0 truncate text-md', unread ? 'font-extrabold' : 'font-semibold')}>
              <Hl text={c.contact.name} q={query} />
            </b>
            <i title={brand.name} className={cn('size-[7px] shrink-0 rounded-full', toneFill[brand.tone])} />
            <time dateTime={inbound.at} className={cn('ml-auto shrink-0 pl-1.5 text-[12.5px]', unread ? 'font-bold text-ib-acc-text' : 'text-muted')}>
              {t.dates.listTime(inbound.at, now)}
            </time>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span title={t.kinds[c.kind].one} className="inline-grid shrink-0 text-faint">
              <Icon size={15} aria-hidden />
            </span>
            <span className={cn('min-w-0 flex-1 truncate text-xs max-mobile:text-sm', unread ? 'text-text' : 'text-muted')}>
              {msg.from === 'us' && <em className="font-semibold not-italic">{msg.note ? t.inbox.previewNote : t.inbox.previewYou}</em>}
              {msg.image && (
                <>
                  <ImageIcon size={15} aria-hidden className="mr-[3px] inline-block align-[-3px]" />
                  {t.inbox.photo}{' '}
                </>
              )}
              <Hl text={msg.text} q={query} />
            </span>
            <span className="inline-flex shrink-0 items-center gap-[5px]">
              {c.priority && c.status === 'open' && <Flag size={15} className="text-coral" aria-hidden />}
              {c.status === 'done' && <Check size={15} strokeWidth={2.2} className="text-good" aria-label={t.inbox.done} />}
              {assignee && <Avatar src={assignee.avatar} name={assignee.name} size="xs" />}
              {unread && (
                <b className="inline-grid h-[21px] min-w-[21px] place-items-center rounded-full bg-sea px-1.5 text-[12.5px] font-bold text-on-sea tabular-nums">{count}</b>
              )}
            </span>
          </span>
        </span>
      </a>
      {stamped && (
        <>
          <span aria-hidden className="pointer-events-none absolute inset-0 z-[1] bg-[color-mix(in_srgb,var(--pine)_16%,transparent)]" />
          <span
            aria-hidden
            className="absolute inset-y-0 right-4 z-[3] my-auto grid size-10 animate-stamp place-items-center rounded-full bg-pine text-on-pine shadow-[0_10px_22px_-10px_color-mix(in_srgb,var(--pine)_80%,transparent),0_0_0_4px_color-mix(in_srgb,var(--pine)_22%,transparent)]"
          >
            <Check size={22} strokeWidth={2.6} />
          </span>
        </>
      )}
    </div>
  )
}

function EmptyList({ view, query, filtered, onClear }: { view: InboxView; query: string; filtered: boolean; onClear: () => void }) {
  const { t } = useI18n()
  const caughtUp = !query && !filtered && (view === 'unread' || view === 'all')
  const copy = query ? t.inbox.empty.search(query) : filtered ? t.inbox.empty.filtered : t.inbox.empty[view]
  return (
    <div className="grid h-full place-items-center px-[18px] py-8 text-center">
      <div className="grid justify-items-center gap-1.5 text-muted">
        {caughtUp && (
          <span className="mb-1.5 grid size-[54px] place-items-center rounded-full bg-pine text-on-pine">
            <Check size={26} strokeWidth={2.2} aria-hidden />
          </span>
        )}
        <b className="font-semibold text-text">{copy.title}</b>
        <p className="max-w-[320px] text-xs">{copy.text}</p>
        {(query || filtered) && (
          <Button size="sm" variant="ghost" icon={X} className="mt-2" onClick={onClear}>
            {t.common.clearFilters}
          </Button>
        )}
      </div>
    </div>
  )
}
