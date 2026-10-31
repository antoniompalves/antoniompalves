import { AlertTriangle, ArrowUpRight, ChevronDown, ChevronRight, Lock, Plus, RotateCw, Search, ShieldCheck, Users, X } from 'lucide-react'
import { ChannelCard, Handshake, MiniStatus, TokenMeter } from './ChannelCard'
import type { ChannelHandlers } from './ChannelCard'
import { Avatar, Badge, BrandMark, Button, NetIcon, cn, toneFill } from '../ui'
import { widePhoto } from '../../data/assets'
import { whoCanPost } from '../../data/channels'
import { can, lockTitle } from '../../data/permissions'
import { NETWORK_LABEL } from '../../data/selectors'
import type { Brand, Channel, Post, Workspace } from '../../data/types'
import { useI18n } from '../../i18n'

/** The coral banner (".ch-alert"): how many channels need fixing, the failed post, and each one with Reconnect. */
export function AttentionBanner({ list, failed, ws, me, now, onReconnect, onOpenPost }: { list: Channel[]; failed: Post[]; ws: Workspace; me: string; now: Date; onReconnect: (c: Channel) => void; onOpenPost: (id: string) => void }) {
  const { t } = useI18n()
  const b = t.channels.banner
  const manage = can(ws, me, 'channels.manage')
  return (
    <section
      aria-labelledby="ch-alert-t"
      className="grid animate-rise grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-center gap-x-6 gap-y-[18px] rounded-card bg-coral px-[22px] py-5 text-on-coral max-[1101px]:grid-cols-1 max-mobile:gap-3.5 max-mobile:p-4"
    >
      <div className="flex min-w-0 items-start gap-4">
        <span className="grid size-[50px] shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,currentcolor_16%,transparent)] max-mobile:size-[42px] max-mobile:rounded-[14px]">
          <AlertTriangle size={26} aria-hidden className="max-mobile:size-[22px]" />
        </span>
        <div>
          <h2 id="ch-alert-t" className="text-[22px] font-bold leading-[1.15] tracking-[-0.02em] max-mobile:text-[19px]">
            {b.title(list.length)}
          </h2>
          <p className="mt-1 text-xs opacity-88 max-mobile:text-2xs">{b.text(failed.length)}</p>
          {failed[0] && (
            <button type="button" onClick={() => onOpenPost(failed[0].id)} className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 text-2xs font-bold underline underline-offset-[3px] pointer-coarse:min-h-11">
              <ArrowUpRight size={15} aria-hidden />
              {b.openFailed}
            </button>
          )}
        </div>
      </div>
      <ul className="grid gap-2">
        {list.map((c) => (
          <li key={c.id} className="flex min-w-0 items-center gap-3 rounded-[18px] bg-[color-mix(in_srgb,currentcolor_12%,transparent)] py-2.5 pl-3 pr-2.5 max-mobile:gap-2.5 max-mobile:py-2 max-mobile:pl-2.5 max-mobile:pr-2">
            <NetIcon network={c.network} size="sm" surface="badge" className="shadow-none" />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-xs font-bold max-mobile:whitespace-normal">{b.item(ws.brands.find((x) => x.id === c.brandId)?.name ?? '', NETWORK_LABEL[c.network])}</b>
              <small className="block text-[12.5px] opacity-85">{c.status === 'disconnected' ? b.disconnected(t.dates.ago(c.tokenExpiresAt, now)) : b.expires(t.dates.fromNow(new Date(c.tokenExpiresAt), now))}</small>
            </span>
            <button
              type="button"
              disabled={!manage}
              title={lockTitle(t, ws, me, 'channels.manage')}
              onClick={() => onReconnect(c)}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-transparent bg-float px-[15px] text-2xs font-semibold text-text hover:brightness-96 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-11 pointer-coarse:px-4"
            >
              {manage ? <RotateCw size={16} aria-hidden /> : <Lock size={16} aria-hidden />}
              {t.channels.reconnect}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** "5 people can post here · …" with their faces, and Manage access for whoever runs the team. */
function WhoLine({ ws, me, brandId, phone }: { ws: Workspace; me: string; brandId: string; phone?: boolean }) {
  const { t } = useI18n()
  const w = t.channels.who
  const { people, direct, reviewed } = whoCanPost(ws, brandId, t)
  const parts = [direct.length ? w.direct(direct) : '', reviewed.length ? w.reviewed(reviewed) : ''].filter(Boolean)
  return (
    <p
      className={cn('flex flex-wrap items-center gap-x-3 rounded-2xl bg-well px-3 text-muted', phone ? 'mb-1 gap-y-1 py-2 text-[13px]' : 'mx-1 mb-4 mt-3.5 gap-y-2 py-2.5 text-2xs')}
    >
      {people.length > 0 && (
        <span className="inline-flex shrink-0">
          {people.slice(0, 5).map((m, i) => (
            <Avatar key={m.id} src={m.avatar} name={m.name} size="sm" className={cn('shadow-[0_0_0_2px_var(--solid)]', i > 0 && '-ml-2')} />
          ))}
        </span>
      )}
      <span className={cn('min-w-[200px] flex-1 max-mobile:min-w-0 max-mobile:basis-full', phone && 'order-2 line-clamp-2')}>
        <b className="font-bold text-text">{w.people(people.length)}</b>
        {parts.length > 0 && ` · ${parts.join(' · ')}`}
      </span>
      {can(ws, me, 'team.manage') && (
        <a href="#/team/members" className={cn('inline-flex items-center gap-1.5 font-bold text-text underline underline-offset-[3px] pointer-coarse:min-h-11', phone && 'order-1 ml-auto')}>
          <Users size={15} aria-hidden />
          {w.manage}
        </a>
      )}
    </p>
  )
}

/** The dashed "Connect a channel / to Brand" tile (a row on phones). */
function AddTile({ brand, lock, row, onClick }: { brand: Brand; lock: string | undefined; row?: boolean; onClick: () => void }) {
  const disabled = !!lock
  const { t } = useI18n()
  return (
    <button
      type="button"
      disabled={disabled}
      title={lock}
      onClick={onClick}
      className={cn(
        'group grid cursor-pointer justify-items-center gap-1 rounded-tile border-[1.5px] border-dashed border-line-2 p-4 text-center text-muted enabled:hover:border-text enabled:hover:bg-well enabled:hover:text-text disabled:cursor-not-allowed disabled:opacity-60 [@media(hover:none)]:enabled:hover:border-line-2 [@media(hover:none)]:enabled:hover:bg-transparent [@media(hover:none)]:enabled:hover:text-muted',
        row ? 'min-h-[60px] grid-cols-[auto_minmax(0,1fr)] content-center items-center justify-items-start gap-x-3 gap-y-0 px-3 py-2 text-left' : 'min-h-[200px] place-content-center',
      )}
    >
      <span className={cn('grid place-items-center rounded-full bg-pill text-on-pill group-disabled:bg-well group-disabled:text-muted', row ? 'row-span-2 size-[38px]' : 'mb-1.5 size-[46px]')}>
        {disabled ? <Lock size={20} aria-hidden /> : <Plus size={20} aria-hidden />}
      </span>
      <b className={cn('font-bold text-text', row && 'self-end')}>{t.channels.add.title}</b>
      <small className={cn('text-[12.5px]', row && 'self-start text-[13px]')}>{t.channels.add.to(brand.name)}</small>
    </button>
  )
}

interface SectionProps extends ChannelHandlers {
  brand: Brand
  ws: Workspace
  me: string
  now: number
  /** Every channel of the brand, and the ones the tab and search let through. */
  channels: Channel[]
  shown: Channel[]
  /** Tab "all" with no search: the add tile shows, and phones fold and cut lists to four. */
  plain: boolean
  handshake: string | null
  onConnect: (brandId: string) => void
}

/** A brand (".ch-brand"): cover, mark and name, totals, who can post, then its channel cards. */
export function BrandSection({ brand, ws, me, now, channels, shown, plain, handshake, onConnect, ...handlers }: SectionProps) {
  const { t } = useI18n()
  const c = t.channels
  const audience = channels.reduce((s, x) => s + x.followers, 0)
  return (
    <section aria-labelledby={`ch-b-${brand.id}`} className="min-w-0 animate-rise overflow-hidden rounded-card border border-rim bg-glass px-5 pb-5 pt-2.5 shadow-card">
      <div className="relative -mx-2.5 h-28 overflow-hidden rounded-[18px] bg-well after:absolute after:inset-0 after:bg-[linear-gradient(rgb(20_16_12/0)_35%,rgb(20_16_12/0.32))] after:content-['']">
        <img src={widePhoto(brand.cover)} width={900} height={600} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      </div>
      <header className="relative -mt-[30px] flex flex-wrap items-start gap-x-3.5 gap-y-1.5 px-1">
        <span
          aria-hidden
          className={cn(
            'grid size-[62px] shrink-0 place-items-center rounded-[18px] text-[21px] font-bold tracking-[-0.02em] shadow-[0_0_0_4px_var(--solid),0_12px_24px_-14px_rgb(0_0_0/0.5)]',
            toneFill[brand.tone],
            brand.tone === 'plain' && 'border border-line',
          )}
        >
          {brand.initials}
        </span>
        <div className="mt-[38px] min-w-0 flex-[1_1_180px] pb-0.5">
          <h2 id={`ch-b-${brand.id}`} className="text-[22px] font-bold leading-[1.1] tracking-[-0.02em]">
            {brand.name}
          </h2>
          <p className="text-2xs text-muted">{brand.industry}</p>
        </div>
        <p className="mt-[38px] inline-flex items-center gap-1.5 rounded-full border border-rim bg-glass-2 px-3 py-1.5 text-2xs text-muted [&_b]:font-bold [&_b]:text-text">
          {c.summary(channels.length, <b>{channels.length}</b>, <b>{t.numbers.compact(audience)}</b>)}
        </p>
      </header>
      <WhoLine ws={ws} me={me} brandId={brand.id} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3">
        {shown.map((x) => (
          <ChannelCard key={x.id} channel={x} ws={ws} me={me} now={now} handshake={handshake === x.id} {...handlers} />
        ))}
        {plain && <AddTile brand={brand} lock={lockTitle(t, ws, me, 'channels.manage')} onClick={() => onConnect(brand.id)} />}
      </div>
    </section>
  )
}


/** Phones: a channel as a tappable row (".ch-row") with a thin token meter; it opens the card in a sheet. */
function ChannelRow({ channel, now, handshake, onOpen }: { channel: Channel; now: number; handshake: boolean; onOpen: () => void }) {
  const { t } = useI18n()
  const r = t.channels.row
  const net = NETWORK_LABEL[channel.network]
  const state = channel.status === 'connected' ? (channel.paused ? r.states.paused : r.states.connected) : r.states[channel.status]
  return (
    <li className="animate-rise">
      <button
        type="button"
        data-ch={channel.id}
        aria-label={r.label(channel.handle, net, state)}
        onClick={onOpen}
        className={cn(
          'relative grid min-h-16 w-full cursor-pointer touch-manipulation grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1 overflow-hidden rounded-[18px] border pb-[13px] pl-3 pr-2.5 pt-2.5 text-left text-text',
          channel.status === 'disconnected' ? 'border-[color-mix(in_srgb,var(--coral)_30%,transparent)] bg-[color-mix(in_srgb,var(--coral)_8%,var(--glass-2))]' : 'border-rim bg-glass-2',
        )}
      >
        <NetIcon network={channel.network} size="md" className={cn('bg-solid', channel.paused && 'opacity-60')} />
        <span className={cn('grid min-w-0', channel.paused && 'opacity-60')}>
          <b className="truncate text-[15px] font-bold">{channel.handle}</b>
          <small className="truncate text-[13px] text-muted">{r.followers(net, <b className="font-bold text-text tabular-nums">{t.numbers.compact(channel.followers)}</b>)}</small>
        </span>
        <span className="justify-self-end">
          <MiniStatus channel={channel} now={now} />
        </span>
        <ChevronRight size={18} aria-hidden className="text-faint" />
        <TokenMeter channel={channel} now={now} thin className="absolute inset-x-3 bottom-1.5 rounded-none" />
        {handshake && <Handshake channel={channel} label={t.channels.reconnected} compact />}
      </button>
    </li>
  )
}

interface PhoneSectionProps extends SectionProps {
  folded: boolean
  onFold: () => void
  expanded: boolean
  onExpand: () => void
  onOpen: (c: Channel) => void
}

/** Phones: a brand folds to one line; open, it lists four rows, then "Show N more", then the add row. */
export function PhoneBrandSection({ brand, ws, me, now, channels, shown, plain, handshake, onConnect, folded, onFold, expanded, onExpand, onOpen }: PhoneSectionProps) {
  const { t } = useI18n()
  const c = t.channels
  const audience = channels.reduce((s, x) => s + x.followers, 0)
  const fix = channels.filter((x) => x.status !== 'connected').length
  const shut = folded && plain
  const rows = !plain || expanded ? shown : shown.slice(0, 4)
  return (
    <section className="min-w-0 animate-rise rounded-card border border-rim bg-glass p-1.5 shadow-card">
      <h2>
        <button
          type="button"
          aria-expanded={!shut}
          aria-controls={`ch-body-${brand.id}`}
          onClick={onFold}
          className="flex min-h-16 w-full cursor-pointer touch-manipulation items-center gap-3 rounded-[20px] px-2.5 py-2 text-left text-text"
        >
          <BrandMark brand={brand} size="md" />
          <span className="grid min-w-0 flex-1">
            <b className="truncate text-lg font-bold leading-[1.2] tracking-[-0.015em]">{brand.name}</b>
            <small className="truncate text-[13px] text-muted">{c.summaryText(channels.length, t.numbers.compact(audience))}</small>
          </span>
          {fix > 0 && <Badge tone="coral">{c.toFix(fix)}</Badge>}
          <ChevronDown size={20} aria-hidden className={cn('shrink-0 text-muted transition-transform duration-300 ease-soft', shut && '-rotate-90')} />
        </button>
      </h2>
      <div id={`ch-body-${brand.id}`} hidden={shut} className="grid gap-2 px-1.5 pb-1.5">
        <WhoLine ws={ws} me={me} brandId={brand.id} phone />
        <ul className="grid gap-1.5">
          {rows.map((x) => (
            <ChannelRow key={x.id} channel={x} now={now} handshake={handshake === x.id} onOpen={() => onOpen(x)} />
          ))}
        </ul>
        {rows.length < shown.length && (
          <button type="button" onClick={onExpand} className="inline-flex min-h-11 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-2xl bg-well text-2xs font-bold text-text">
            <ChevronDown size={16} aria-hidden />
            {c.more(shown.length - rows.length)}
          </button>
        )}
        {plain && <AddTile brand={brand} row lock={lockTitle(t, ws, me, 'channels.manage')} onClick={() => onConnect(brand.id)} />}
      </div>
    </section>
  )
}

/** Nothing matches the tab or the search (".ch-none"). */
export function NoChannels({ query, tab, onClear }: { query: string; tab: 'attention' | 'paused' | 'all'; onClear: () => void }) {
  const { t } = useI18n()
  const e = t.channels.empty
  const q = query.trim()
  const [title, text, Icon]: [string, string, typeof Search] = q ? [e.query(q), e.queryText, Search] : tab === 'attention' ? [e.attention, e.attentionText, ShieldCheck] : [e.paused, e.pausedText, Search]
  return (
    <section className="animate-rise rounded-card border border-rim bg-glass shadow-card">
      <div className="grid justify-items-center gap-1.5 px-4 py-12 text-center text-muted">
        <Icon size={30} aria-hidden className="opacity-70" />
        <p className="text-md font-semibold text-text">{title}</p>
        <p className="max-w-[320px] text-xs">{text}</p>
        <Button size="sm" variant="ghost" icon={X} onClick={onClear} className="mt-2">
          {e.clear}
        </Button>
      </div>
    </section>
  )
}
