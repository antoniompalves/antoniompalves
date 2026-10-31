import { useRef, useState } from 'react'
import { ChartColumn, KeyRound, Link2, Lock, MoreHorizontal, Pause, Play, RotateCw, Unlink } from 'lucide-react'
import { monotonePath } from '../GrowthChart'
import { KataruMark } from '../Logo'
import { MenuDivider, MenuItem, Popover } from '../Popover'
import { Avatar, Button, IconButton, NetIcon, StatusPill, cn } from '../ui'
import { TOKEN_DAYS, channelTrend, daysLeft, needsAttention, tokenTone } from '../../data/channels'
import { can, lockTitle, member, roleName } from '../../data/permissions'
import { NETWORK_LABEL } from '../../data/selectors'
import type { Channel, Workspace } from '../../data/types'
import { useI18n } from '../../i18n'

export interface ChannelHandlers {
  onReconnect: (c: Channel) => void
  onPause: (c: Channel, paused: boolean) => void
  onDisconnect: (c: Channel) => void
  /** Leaving for analytics from a sheet closes it first. */
  onAnalytics?: () => void
}

const FILL = { coral: 'bg-coral', butter: 'bg-butter', pine: 'bg-pine' } as const

/** Token meter (".meter", 8px): how much of the 60 days is left, coral when gone, butter in the last two weeks. */
export function TokenMeter({ channel, now, label, className, thin }: { channel: Channel; now: number; label?: string; className?: string; thin?: boolean }) {
  const left = daysLeft(channel, now)
  return (
    <span
      role={label ? 'meter' : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? TOKEN_DAYS : undefined}
      aria-valuenow={label ? left : undefined}
      aria-hidden={label ? undefined : true}
      className={cn('block overflow-hidden rounded-full', thin ? 'h-[3px] bg-line' : 'h-2 bg-well', className)}
    >
      <span
        className={cn('block h-full w-full origin-left rounded-full transition-transform duration-700 ease-soft', FILL[tokenTone(channel, now)])}
        style={{ transform: `scaleX(${Math.min(1, left / TOKEN_DAYS)})` }}
      />
    </span>
  )
}

/** The card's 30-day follower curve (150×40), pine, or muted once the channel stops syncing. */
function Spark({ values, muted }: { values: number[]; muted: boolean }) {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const step = 150 / Math.max(1, values.length - 1)
  const d = monotonePath(values.map((v, i) => [i * step, 36 - ((v - lo) / (hi - lo || 1)) * 32]))
  return (
    <svg viewBox="0 0 150 40" width="150" height="40" aria-hidden className="h-auto w-full max-w-[150px] overflow-visible">
      <path d={d} className={cn('fill-none [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.2]', muted ? 'stroke-faint' : 'stroke-pine')} />
    </svg>
  )
}

/** Status pill: Disconnected, Expires in N d, Paused or Connected. */
export function ChannelStatus({ channel, now }: { channel: Channel; now: number }) {
  const { t } = useI18n()
  const s = t.channels.status
  if (channel.status === 'disconnected') return <StatusPill tone="coral" size="md">{s.disconnected}</StatusPill>
  if (channel.status === 'expiring') return <StatusPill tone="coral" size="md">{s.expires(daysLeft(channel, now))}</StatusPill>
  if (channel.paused) return <StatusPill tone="plain" size="md">{s.paused}</StatusPill>
  return <StatusPill tone="pine" size="md">{s.connected}</StatusPill>
}

/** The short status on a phone's row: Offline, N d left, Paused or Live. */
export function MiniStatus({ channel, now }: { channel: Channel; now: number }) {
  const { t } = useI18n()
  const s = t.channels.mini
  if (channel.status === 'disconnected') return <StatusPill tone="coral" size="md">{s.offline}</StatusPill>
  if (channel.status === 'expiring') return <StatusPill tone="coral" size="md">{s.left(daysLeft(channel, now))}</StatusPill>
  if (channel.paused) return <StatusPill tone="plain" size="md">{s.paused}</StatusPill>
  return <StatusPill tone="pine" size="md">{s.live}</StatusPill>
}

/** "Posting" switch (".switch", 46×28; 52×32 on touch screens). */
function PostingSwitch({ channel, ws, me, onToggle, big }: { channel: Channel; ws: Workspace; me: string; onToggle: () => void; big?: boolean }) {
  const { t } = useI18n()
  const c = t.channels
  const brand = ws.brands.find((b) => b.id === channel.brandId)?.name ?? ''
  const manage = can(ws, me, 'channels.manage')
  const on = !channel.paused && channel.status !== 'disconnected'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={c.postingTo(NETWORK_LABEL[channel.network], brand)}
      disabled={!manage || channel.status === 'disconnected'}
      onClick={onToggle}
      className={cn(
        "relative inline-block h-7 w-[46px] shrink-0 cursor-pointer rounded-full transition-colors before:absolute before:inset-x-[-4px] before:inset-y-[-8px] before:content-[''] after:absolute after:left-[3px] after:top-[3px] after:size-[22px] after:rounded-full after:bg-white after:shadow-[0_1px_3px_rgb(0_0_0/0.2)] after:transition-transform after:duration-300 after:ease-soft after:content-[''] disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-8 pointer-coarse:w-[52px] pointer-coarse:after:size-[26px]",
        on ? 'bg-pine after:translate-x-[18px] pointer-coarse:after:translate-x-5' : 'bg-line-2',
        big && 'max-mobile:h-8 max-mobile:w-[52px] max-mobile:after:size-[26px] max-mobile:aria-checked:after:translate-x-5',
      )}
    />
  )
}

/** Why the switch is off-limits, shown as its label's tooltip. */
function switchTitle(channel: Channel, ws: Workspace, me: string, t: ReturnType<typeof useI18n>['t']) {
  if (!can(ws, me, 'channels.manage')) return t.channels.roleCant(roleName(t, ws, member(ws, me)?.role ?? ''))
  return channel.status === 'disconnected' ? t.channels.reconnectFirst : undefined
}

/** The "…" menu: refresh or reconnect, pause or resume, analytics, disconnect. */
function OptionsMenu({ channel, ws, me, handlers }: { channel: Channel; ws: Workspace; me: string; handlers: ChannelHandlers }) {
  const { t } = useI18n()
  const m = t.channels.menu
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const manage = can(ws, me, 'channels.manage')
  const net = NETWORK_LABEL[channel.network]
  const run = (f: () => void) => () => {
    setOpen(false)
    f()
  }
  const down = channel.status === 'disconnected'
  return (
    <>
      <IconButton
        ref={ref}
        label={t.channels.options(net)}
        icon={MoreHorizontal}
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn('border-transparent hover:border-line-2', open && 'border-line-2')}
      />
      <Popover open={open} onClose={() => setOpen(false)} anchor={ref} placement="bottom-end" label={t.channels.options(net)}>
        <div role="menu" aria-label={t.channels.options(net)}>
          <MenuItem icon={manage ? RotateCw : Lock} disabled={!manage} title={manage ? m.signInAgain : m.adminsOnly} onClick={run(() => handlers.onReconnect(channel))}>
            {channel.status === 'connected' ? m.refresh : m.reconnect}
          </MenuItem>
          <MenuItem icon={!manage || down ? Lock : channel.paused ? Play : Pause} disabled={!manage || down} onClick={run(() => handlers.onPause(channel, !channel.paused))}>
            {channel.paused ? m.resume : m.pause}
          </MenuItem>
          <MenuItem
            icon={ChartColumn}
            onClick={run(() => {
              window.location.hash = `#/analytics/${channel.network}`
            })}
          >
            {m.analytics}
          </MenuItem>
          <MenuDivider />
          <MenuItem icon={!manage || down ? Lock : Unlink} disabled={!manage || down} className="text-bad" onClick={run(() => handlers.onDisconnect(channel))}>
            {m.disconnect}
          </MenuItem>
        </div>
      </Popover>
    </>
  )
}

interface ChannelCardProps extends ChannelHandlers {
  channel: Channel
  ws: Workspace
  me: string
  now: number
  /** The phone sheet's version: bigger type, the switch explained, buttons in a grid. */
  sheet?: boolean
  /** Plays the "Reconnected" handshake over the card. */
  handshake?: boolean
}

/** One account (".ch-card"): who it is, its audience and curve, its token, sync and owner, and what can be done. */
export function ChannelCard({ channel, ws, me, now, sheet, handshake, ...handlers }: ChannelCardProps) {
  const { t } = useI18n()
  const c = t.channels
  const net = NETWORK_LABEL[channel.network]
  const { growth, curve } = channelTrend(ws, channel)
  const by = member(ws, channel.connectedById)
  const down = channel.status === 'disconnected'
  const manage = can(ws, me, 'channels.manage')
  const lock = lockTitle(t, ws, me, 'channels.manage')
  const tokenText = down ? c.revoked : c.tokenLeft(daysLeft(channel, now), TOKEN_DAYS)
  const title = switchTitle(channel, ws, me, t)
  const attention = needsAttention(channel)
  const nowDate = new Date(now)

  return (
    <article
      data-ch={channel.id}
      className={cn(
        'relative grid min-w-0 content-start rounded-tile border shadow-[0_14px_30px_-26px_rgb(20_24_28/0.5)]',
        sheet ? 'gap-4 p-[18px]' : 'gap-3.5 p-4',
        down ? 'border-[color-mix(in_srgb,var(--coral)_30%,transparent)] bg-[color-mix(in_srgb,var(--coral)_7%,var(--glass-2))]' : 'border-rim bg-glass-2',
      )}
    >
      <header className="flex min-w-0 items-center gap-2.5">
        <NetIcon network={channel.network} size="lg" className="bg-solid" />
        <div className="min-w-0 flex-1">
          <b className={cn('block truncate font-bold', sheet && 'text-[19px]')}>{channel.handle}</b>
          <small className="block text-[12.5px] text-muted">{net}</small>
        </div>
        <ChannelStatus channel={channel} now={now} />
      </header>

      <div className={cn('flex items-end justify-between gap-2.5', channel.paused && 'opacity-60')}>
        <div className="min-w-0">
          <b className={cn('block font-bold leading-none tracking-[-0.02em] tabular-nums', sheet ? 'text-[36px]' : 'text-[30px]')}>{t.numbers.compact(channel.followers)}</b>
          <small className="mt-[5px] block text-[12.5px] text-muted">{c.growth(<span className={cn('font-bold', growth >= 0 ? 'text-good' : 'text-bad')}>{t.numbers.signedPct1(growth)}</span>)}</small>
        </div>
        <span className="flex min-w-[70px] flex-[0_1_150px] justify-end">
          <Spark values={curve} muted={down} />
        </span>
      </div>

      <div className={cn('grid gap-[7px]', channel.paused && 'opacity-60')}>
        <div className="flex items-center justify-between gap-2 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <KeyRound size={15} aria-hidden />
            {c.token}
          </span>
          <b className="font-bold text-text">{tokenText}</b>
        </div>
        <TokenMeter channel={channel} now={now} label={c.tokenLabel(tokenText)} />
      </div>

      <dl className="grid grid-cols-2 gap-2 border-t border-line pt-3">
        <div className="min-w-0">
          <dt className="text-[12.5px] text-muted">{c.lastSync}</dt>
          <dd className="flex items-center gap-1.5 truncate text-2xs font-semibold">{down ? c.stopped(t.dates.ago(channel.lastSyncAt, nowDate)) : t.dates.ago(channel.lastSyncAt, nowDate)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[12.5px] text-muted">{c.connectedBy}</dt>
          <dd className="flex items-center gap-1.5 truncate text-2xs font-semibold">
            {by ? (
              <>
                <Avatar src={by.avatar} name={by.name} size="menu" />
                {by.name.split(' ')[0]}
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>

      {sheet ? (
        <footer className="grid gap-2.5 border-t border-line pt-3.5">
          <label title={title} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 text-xs font-semibold">
            <span className="grid min-w-0">
              <b className="font-bold">{c.posting}</b>
              <small className="text-[13px] font-medium text-muted">{down ? c.sheet.off : channel.paused ? c.sheet.paused : c.sheet.on}</small>
            </span>
            <PostingSwitch channel={channel} ws={ws} me={me} onToggle={() => handlers.onPause(channel, !channel.paused)} big />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={attention ? 'ink' : 'ghost'} icon={manage ? RotateCw : Lock} disabled={!manage} title={lock} onClick={() => handlers.onReconnect(channel)} className="w-full pointer-coarse:h-12">
              {attention ? c.reconnect : c.menu.refresh}
            </Button>
            <Button variant="ghost" icon={ChartColumn} href={`#/analytics/${channel.network}`} onClick={handlers.onAnalytics} className="w-full pointer-coarse:h-12">
              {c.analytics}
            </Button>
          </div>
          <Button
            variant="ghost"
            icon={manage || down ? Unlink : Lock}
            disabled={!manage || down}
            title={down ? c.sheet.alreadyDisconnected : lock}
            onClick={() => handlers.onDisconnect(channel)}
            className={cn('w-full pointer-coarse:h-12', down ? 'text-muted' : 'text-bad')}
          >
            {c.menu.disconnect}
          </Button>
        </footer>
      ) : (
        <footer className="flex items-center gap-2">
          {attention ? (
            <Button size="sm" icon={manage ? RotateCw : Lock} disabled={!manage} title={lock} onClick={() => handlers.onReconnect(channel)}>
              {c.reconnect}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" icon={ChartColumn} href={`#/analytics/${channel.network}`}>
              {c.analytics}
            </Button>
          )}
          <label title={title} className="ml-auto inline-flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-muted pointer-coarse:min-h-11">
            <span>{c.posting}</span>
            <PostingSwitch channel={channel} ws={ws} me={me} onToggle={() => handlers.onPause(channel, !channel.paused)} />
          </label>
          <OptionsMenu channel={channel} ws={ws} me={me} handlers={handlers} />
        </footer>
      )}

      {handshake && <Handshake channel={channel} label={c.reconnected} compact={false} />}
    </article>
  )
}

/**
 * "Reconnected": the network and Kataru shake hands over the card for a
 * moment after a sign-in, then fade (skipped with reduced motion).
 */
export function Handshake({ channel, label, compact }: { channel: Channel; label: string; compact: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 z-[3] flex animate-handshake flex-wrap content-center items-center justify-center gap-3 rounded-[inherit] bg-[color-mix(in_srgb,var(--float)_94%,transparent)]',
        compact && 'flex-nowrap gap-2',
      )}
    >
      <span className="animate-handshake-a">
        <NetIcon network={channel.network} size="lg" className={cn('bg-solid shadow-[0_10px_22px_-12px_rgb(0_0_0/0.4)]', compact ? 'size-[38px]' : 'size-14')} />
      </span>
      <span className={cn('grid animate-handshake-link place-items-center rounded-full bg-pine text-on-pine', compact ? 'size-7' : 'size-[38px]')}>
        <Link2 size={compact ? 16 : 20} strokeWidth={2.2} aria-hidden />
      </span>
      <span className="animate-handshake-b">
        <KataruTile compact={compact} />
      </span>
      <span className={cn('animate-handshake-text text-center text-xs font-bold text-good', compact ? 'ml-1' : 'basis-full')}>{label}</span>
    </div>
  )
}

function KataruTile({ compact }: { compact: boolean }) {
  return (
    <span className={cn('grid place-items-center bg-butter text-[#16191d] shadow-[0_10px_22px_-12px_rgb(0_0_0/0.4)]', compact ? 'size-[38px] rounded-xl' : 'size-14 rounded-[17px]')}>
      <KataruMark size={compact ? 20 : 28} />
    </span>
  )
}
