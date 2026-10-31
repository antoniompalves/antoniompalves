import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Globe, Link, Lock, Pause, Play, Plus, Search, Unlink, Users } from 'lucide-react'
import { AuthoriseDialog } from '../components/AuthoriseDialog'
import { Drawer } from '../components/Drawer'
import { ConfirmDialog } from '../components/Modal'
import { PageTitle, Stat } from '../components/PageHead'
import { useToast } from '../components/Toast'
import { usePostActions } from '../components/usePostActions'
import { useMediaQuery } from '../components/useMediaQuery'
import { PostDrawer } from '../components/calendar/PostDrawer'
import { ChannelCard } from '../components/channels/ChannelCard'
import { ConnectDialog } from '../components/channels/ConnectDialog'
import { AttentionBanner, BrandSection, NoChannels, PhoneBrandSection } from '../components/channels/Sections'
import { AudienceCard, NetworksCard } from '../components/channels/Side'
import { BrandMark, Button, cn } from '../components/ui'
import { SUPPORTED, attentionList, channelStats, failedPosts, matches, needsAttention, newChannel, waitingPosts } from '../data/channels'
import type { ChannelTab } from '../data/channels'
import { can, lockTitle } from '../data/permissions'
import { NETWORK_LABEL } from '../data/selectors'
import { useWorkspace } from '../data/store'
import type { AuditAction, Channel, NetworkId } from '../data/types'
import { useI18n } from '../i18n'

const DAY = 86_400_000
const TABS: ChannelTab[] = ['all', 'attention', 'paused']

/**
 * Channels (#/channels): every social account, brand by brand — audience and
 * its curve, how long the access token lasts, who connected it — with the
 * ones that need fixing up top. Admins connect, reconnect, pause and
 * disconnect; everyone else can look.
 */
export function Channels({ now, hash }: { now: Date; hash: string }) {
  const { ws, all, dispatch } = useWorkspace()
  const { t } = useI18n()
  const toast = useToast()
  const c = t.channels
  const me = ws.currentUserId
  const nowMs = Math.floor(now.getTime() / 60_000) * 60_000
  const phone = useMediaQuery('(max-width: 760px)')
  const manage = can(ws, me, 'channels.manage')
  const lock = lockTitle(t, ws, me, 'channels.manage')

  const [tab, setTab] = useState<ChannelTab>('all')
  const [query, setQuery] = useState('')
  // Phones: every brand but the first folds, unless something in it needs fixing.
  const [folded, setFolded] = useState(() => new Set(ws.brands.filter((b, i) => i > 0 && !ws.channels.some((x) => x.brandId === b.id && needsAttention(x))).map((b) => b.id)))
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [connecting, setConnecting] = useState<{ network?: NetworkId; brandId?: string } | null>(null)
  const [authorise, setAuthorise] = useState<Channel | null>(null)
  const [disconnecting, setDisconnecting] = useState<Channel | null>(null)
  const [sheet, setSheet] = useState<string | null>(null)
  const [handshake, setHandshake] = useState<string | null>(null)
  const [postId, setPostId] = useState<string | null>(null)
  const handshakeTimer = useRef(0)
  const { publish, duplicate, remove } = usePostActions(now, () => setPostId(null))

  const stats = channelStats(ws)
  const attention = attentionList(ws)
  const failed = failedPosts(ws)
  const plain = tab === 'all' && !query.trim()
  const label = (n: NetworkId) => NETWORK_LABEL[n]
  const groups = useMemo(
    () =>
      ws.brands
        .map((b) => {
          const channels = ws.channels.filter((x) => x.brandId === b.id)
          return { brand: b, channels, shown: channels.filter((x) => matches(ws, x, tab, query, label)) }
        })
        .filter((g) => plain || g.shown.length > 0),
    [ws, tab, query, plain],
  )

  const audit = (action: AuditAction) => {
    const id = `au-${Date.now().toString(36)}`
    dispatch({ type: 'audit', event: { id, actorId: me, kind: 'channel', action, at: new Date(nowMs).toISOString() } })
    return id
  }

  const connect = (opts: { network?: NetworkId; brandId?: string } = {}) => {
    if (!manage) return toast({ text: c.toast.cantConnect, icon: Lock })
    setConnecting({ brandId: opts.brandId ?? ws.brandScope ?? undefined, network: opts.network })
  }

  // "Connect a channel" from the Create menu or ⌘K lands here as #/channels?connect.
  useEffect(() => {
    if (!hash.includes('?connect')) return
    window.history.replaceState(null, '', '#/channels')
    connect()
  }, [hash])

  const reconnect = (ch: Channel) => {
    if (!manage) return toast({ text: c.toast.cantReconnect, icon: Lock })
    setAuthorise(ch)
  }

  const pause = (ch: Channel, paused: boolean) => {
    if (!manage) return toast({ text: c.toast.cantPause, icon: Lock })
    if (ch.status === 'disconnected') return toast({ text: c.toast.reconnectFirst, icon: Unlink })
    const net = NETWORK_LABEL[ch.network]
    dispatch({ type: 'channel', id: ch.id, patch: { paused } })
    const id = audit({ type: 'pausedChannel', brandId: ch.brandId, network: ch.network, paused })
    toast({
      text: paused ? c.toast.paused(net, waitingPosts(ws, ch)) : c.toast.resumed(net),
      icon: paused ? Pause : Play,
      undo: () => {
        dispatch({ type: 'unaudit', id })
        dispatch({ type: 'channel', id: ch.id, patch: { paused: !paused } })
      },
    })
  }

  const disconnect = (ch: Channel) => {
    if (!manage) return
    setDisconnecting(ch)
  }

  const confirmDisconnect = () => {
    const ch = disconnecting
    if (!ch) return
    setDisconnecting(null)
    dispatch({ type: 'channel', id: ch.id, patch: { status: 'disconnected', tokenExpiresAt: new Date(nowMs).toISOString() } })
    audit({ type: 'disconnectedChannel', brandId: ch.brandId, network: ch.network })
    toast({
      text: c.toast.disconnected(NETWORK_LABEL[ch.network]),
      icon: Unlink,
      undo: () => dispatch({ type: 'channel', id: ch.id, patch: { status: 'connected', tokenExpiresAt: new Date(nowMs + 40 * DAY).toISOString() } }),
    })
  }

  const allowed = (ch: Channel) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    window.clearTimeout(handshakeTimer.current)
    setHandshake(ch.id)
    handshakeTimer.current = window.setTimeout(() => setHandshake(null), 1700)
    // A new channel scrolls into view once it's drawn.
    window.setTimeout(() => document.querySelector(`[data-ch="${ch.id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80)
  }
  useEffect(() => () => window.clearTimeout(handshakeTimer.current), [])

  const handlers = { onReconnect: reconnect, onPause: pause, onDisconnect: disconnect }
  const sheetChannel = sheet ? ws.channels.find((x) => x.id === sheet) : undefined
  const sheetBrand = sheetChannel ? ws.brands.find((b) => b.id === sheetChannel.brandId) : undefined
  const post = postId ? (ws.posts.find((p) => p.id === postId) ?? null) : null
  const clear = () => {
    setTab('all')
    setQuery('')
  }

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center gap-x-[clamp(28px,4vw,72px)] gap-y-[18px] max-mobile:mb-[18px] max-mobile:gap-y-3">
        <PageTitle lines={[c.title]} label={c.title} />
        <dl className="flex flex-wrap gap-x-[clamp(24px,3.2vw,56px)] gap-y-3.5 max-mobile:grid max-mobile:w-full max-mobile:grid-cols-2 max-mobile:gap-x-3.5 max-mobile:gap-y-2.5">
          <Stat icon={Link} value={t.numbers.int(stats.connected)} label={c.stats.connected} />
          <Stat icon={AlertTriangle} value={t.numbers.int(stats.attention)} badge={stats.attention ? c.stats.fixNow : c.stats.allGood} badgeTone={stats.attention ? 'coral' : 'pine'} label={c.stats.attention} />
          <Stat icon={Users} value={t.numbers.compact(stats.audience)} label={c.stats.audience} />
          <Stat icon={Globe} value={t.numbers.int(stats.networks)} label={c.stats.networks(SUPPORTED.length)} />
        </dl>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 max-mobile:ml-0 max-mobile:w-full">
          <Button icon={manage ? Plus : Lock} disabled={!manage} title={lock} onClick={() => connect()} className="max-mobile:flex-1">
            {c.connect}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-4 max-[1281px]:grid-cols-1">
        <div className="grid min-w-0 gap-4">
          {attention.length > 0 && <AttentionBanner list={attention} failed={failed} ws={ws} me={me} now={new Date(nowMs)} onReconnect={reconnect} onOpenPost={setPostId} />}
          {!manage && (
            <p className="flex animate-rise items-center gap-2.5 rounded-2xl bg-well px-3.5 py-[11px] text-2xs font-semibold text-muted">
              <Lock size={17} aria-hidden className="shrink-0 text-text" />
              <span>{c.lockNote}</span>
            </p>
          )}
          <div className="flex animate-rise flex-wrap items-center gap-2.5">
            <div role="group" aria-label={c.show} className="inline-flex max-w-full shrink-0 rounded-full border border-rim bg-glass-2 p-[3px] max-mobile:w-full">
              {TABS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={tab === k}
                  onClick={() => setTab(k)}
                  className={cn(
                    'cursor-pointer whitespace-nowrap rounded-full px-4 py-[9px] text-xs font-semibold transition-[background-color,color,box-shadow] duration-300 ease-soft pointer-coarse:py-[13px] max-mobile:min-w-0 max-mobile:flex-1 max-mobile:px-1.5',
                    tab === k ? 'bg-glass-3 text-text shadow-[0_2px_8px_rgb(0_0_0/0.08)] dark:bg-white/14' : 'text-muted',
                  )}
                >
                  {c.tabs[k]}
                </button>
              ))}
            </div>
            <label className="ml-auto inline-flex h-11 min-w-0 max-w-[380px] flex-[1_1_240px] items-center gap-2 rounded-full border border-line-2 bg-glass-2 px-4 text-muted focus-within:border-text pointer-coarse:min-h-[46px] max-mobile:ml-0 max-mobile:max-w-none max-mobile:basis-full">
              <Search size={20} aria-hidden className="shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && (setQuery(''), e.currentTarget.blur())}
                placeholder={c.searchPlaceholder}
                aria-label={c.searchLabel}
                autoComplete="off"
                className="h-full w-full min-w-0 bg-transparent text-text outline-none placeholder:text-muted max-mobile:text-[16px]"
              />
            </label>
          </div>
          <div className="grid min-w-0 gap-4 max-mobile:gap-3">
            {groups.length ? (
              groups.map(({ brand, channels, shown }) =>
                phone ? (
                  <PhoneBrandSection
                    key={brand.id}
                    brand={brand}
                    ws={ws}
                    me={me}
                    now={nowMs}
                    channels={channels}
                    shown={shown}
                    plain={plain}
                    handshake={handshake}
                    onConnect={(id) => connect({ brandId: id })}
                    folded={folded.has(brand.id)}
                    onFold={() =>
                      setFolded((s) => {
                        const next = new Set(s)
                        if (!next.delete(brand.id)) next.add(brand.id)
                        return next
                      })
                    }
                    expanded={expanded.has(brand.id)}
                    onExpand={() => setExpanded((s) => new Set(s).add(brand.id))}
                    onOpen={(x) => setSheet(x.id)}
                    {...handlers}
                  />
                ) : (
                  <BrandSection key={brand.id} brand={brand} ws={ws} me={me} now={nowMs} channels={channels} shown={shown} plain={plain} handshake={handshake} onConnect={(id) => connect({ brandId: id })} {...handlers} />
                ),
              )
            ) : (
              <NoChannels query={query} tab={tab} onClear={clear} />
            )}
          </div>
        </div>
        <aside className="grid min-w-0 content-start gap-4 max-[1281px]:grid-cols-2 max-mobile:grid-cols-1">
          <AudienceCard ws={ws} />
          <NetworksCard ws={ws} me={me} onConnect={(network) => connect({ network })} />
        </aside>
      </div>

      {connecting && (
        <ConnectDialog
          network={connecting.network}
          brandId={connecting.brandId}
          onClose={() => setConnecting(null)}
          onContinue={(brandId, network) => {
            setConnecting(null)
            const existing = all.channels.find((x) => x.brandId === brandId && x.network === network)
            window.setTimeout(() => setAuthorise(existing ?? newChannel(all, brandId, network, me, nowMs)), 60)
          }}
        />
      )}
      <AuthoriseDialog channel={authorise} now={new Date(nowMs)} onClose={() => setAuthorise(null)} onAllowed={allowed} />
      <ConfirmDialog
        open={!!disconnecting}
        title={disconnecting ? c.disconnect.title(NETWORK_LABEL[disconnecting.network]) : ''}
        text={disconnecting ? c.disconnect.text(ws.brands.find((b) => b.id === disconnecting.brandId)?.name ?? '', NETWORK_LABEL[disconnecting.network], skipCount(ws.posts, disconnecting)) : ''}
        confirm={c.disconnect.confirm}
        cancel={c.disconnect.cancel}
        onConfirm={confirmDisconnect}
        onClose={() => setDisconnecting(null)}
      />
      <Drawer open={!!sheetChannel && phone} onClose={() => setSheet(null)} label={sheetChannel ? c.sheet.label(NETWORK_LABEL[sheetChannel.network], sheetBrand?.name ?? '') : ''}>
        {sheetChannel && (
          <>
            <header className="flex items-center gap-2.5 pr-[52px] text-xs font-semibold text-muted">
              {sheetBrand && <BrandMark brand={sheetBrand} size="sm" />}
              <span>{sheetBrand?.name}</span>
            </header>
            <ChannelCard channel={sheetChannel} ws={ws} me={me} now={nowMs} sheet handshake={handshake === sheetChannel.id} onAnalytics={() => setSheet(null)} {...handlers} />
          </>
        )}
      </Drawer>
      <PostDrawer
        post={post}
        brand={post ? ws.brands.find((b) => b.id === post.brandId) : undefined}
        author={post ? ws.team.find((m) => m.id === post.authorId) : undefined}
        now={now}
        onClose={() => setPostId(null)}
        onPublish={publish}
        onDuplicate={duplicate}
        onDelete={remove}
      />
    </>
  )
}

/** Scheduled or pending posts that would skip a channel once it's disconnected. */
const skipCount = (posts: { brandId: string; networks: NetworkId[]; status: string }[], ch: Channel) =>
  posts.filter((p) => p.brandId === ch.brandId && p.networks.includes(ch.network) && (p.status === 'scheduled' || p.status === 'awaiting_approval')).length
