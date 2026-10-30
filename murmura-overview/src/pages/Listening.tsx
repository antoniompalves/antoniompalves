import { useEffect, useMemo, useRef, useState } from 'react'
import { Ear, Eye, EyeOff, Inbox, MessageCircle, PieChart, Plus, Smile, Star, Trash2, Unlink } from 'lucide-react'
import { PageTitle, Stat } from '../components/PageHead'
import { useToast } from '../components/Toast'
import { useMediaQuery } from '../components/useMediaQuery'
import { AnCard, Figure } from '../components/analytics/parts'
import { Keywords } from '../components/listening/Keywords'
import { SentimentChart, SentimentDot } from '../components/listening/SentimentChart'
import { LiveToggle, Stream } from '../components/listening/Stream'
import { TrackDialog } from '../components/listening/TrackDialog'
import type { NewKeyword } from '../components/listening/TrackDialog'
import { Trending } from '../components/listening/Trending'
import { BrandPicker, Competitors, ShareOfVoice } from '../components/listening/Voice'
import { Button } from '../components/ui'
import { NO_STREAM_FILTERS, SENTIMENTS, mentionText, newMention, pastVolume, selectListening, streamOf } from '../data/listening'
import type { StreamFilters, TrendingTerm } from '../data/listening'
import { useWorkspace } from '../data/store'
import type { AuditAction, AuditEvent, Conversation, Keyword, Mention } from '../data/types'
import { useI18n } from '../i18n'

type CardId = 'kw' | 'st' | 'sov' | 'tr' | 'sent' | 'comp'

/** A new mention reaches the live stream this often. */
const LIVE_EVERY = 12_000

/**
 * Listening (#/listening): what people say about the workspace's brands,
 * hashtags, topics and competitors. Laid out like the reference: keywords and
 * the live stream side by side with share of voice over trending terms, then
 * sentiment over time and the competitors (6 columns from 1340px, 1 from 1000px).
 */
export function Listening({ now }: { now: Date }) {
  const { ws, dispatch } = useWorkspace()
  const { t } = useI18n()
  const toast = useToast()
  const l = t.listening

  const phone = useMediaQuery('(width < 761px)')
  const pageSize = phone ? 6 : 8
  const [brandId, setBrandId] = useState(() => ws.brands[0]?.id ?? '')
  const [filters, setFilters] = useState<StreamFilters>(NO_STREAM_FILTERS)
  const [shown, setShown] = useState(pageSize)
  const [live, setLive] = useState(true)
  const [fresh, setFresh] = useState<string | null>(null)
  const [allKeywords, setAllKeywords] = useState(false)
  const [adding, setAdding] = useState(false)
  const [expanded, setExpanded] = useState<CardId | null>(null)

  // The mock clock only re-renders every few seconds; read it to the millisecond for new mentions.
  const clockRef = useRef({ now, at: Date.now() })
  if (clockRef.current.now !== now) clockRef.current = { now, at: Date.now() }
  const clock = () => new Date(clockRef.current.now.getTime() + Date.now() - clockRef.current.at)

  const minute = Math.floor(now.getTime() / 60_000)
  const model = useMemo(() => selectListening(ws, new Date(minute * 60_000), brandId), [ws, minute, brandId])
  const stream = useMemo(() => streamOf(ws, filters), [ws, filters])
  const keywords = useMemo(() => new Map(ws.keywords.map((k) => [k.id, k])), [ws.keywords])
  const brand = ws.brands.find((b) => b.id === brandId)
  const brandName = (id: string) => ws.brands.find((b) => b.id === id)?.name ?? ''
  const savedCount = ws.mentions.filter((m) => m.saved && keywords.has(m.keywordId)).length

  const audit = (kind: AuditEvent['kind'], action: AuditAction) =>
    dispatch({ type: 'audit', event: { id: `au-${Date.now().toString(36)}`, actorId: ws.currentUserId, kind, action, at: clock().toISOString() } })

  /* Live: a new mention of a random keyword every 12 s while the page is visible. */
  const wsRef = useRef(ws)
  wsRef.current = ws
  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => {
      const pool = wsRef.current.keywords
      if (document.visibilityState !== 'visible' || !pool.length) return
      const mention = newMention(pool[Math.floor(Math.random() * pool.length)], clock().getTime())
      dispatch({ type: 'mentionArrived', mention })
      setFresh(mention.id)
    }, LIVE_EVERY)
    // `clock` and `wsRef` only read refs, so the timer survives re-renders.
    return () => window.clearInterval(id)
  }, [live, dispatch])

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

  const filter = (patch: Partial<StreamFilters>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setShown(pageSize)
    setFresh(null)
  }

  const toggleLive = () => {
    setLive(!live)
    toast({ text: live ? l.toast.paused : l.toast.resumed, icon: live ? EyeOff : Ear })
  }

  const track = ({ term, kind, brandId: owner }: NewKeyword) => {
    const keyword: Keyword = { id: `k-${Date.now().toString(36)}`, brandId: owner, term, kind, history: pastVolume(term) }
    const at = clock().getTime()
    // Backfill: one mention from a few hours ago, a day ago and two days ago.
    const mentions = [0, 1, 2].map((i) => newMention(keyword, at - (i * 26 + 3) * 3_600_000, i))
    setAdding(false)
    dispatch({ type: 'track', keyword, mentions })
    audit('listening', { type: 'trackedKeyword', term, brandId: owner })
    toast({ text: l.toast.tracking(term, mentions.length), icon: Ear, undo: () => dispatch({ type: 'untrack', id: keyword.id }) })
  }

  const stop = (keyword: Keyword) => {
    const index = ws.keywords.indexOf(keyword)
    const mentions = ws.mentions.filter((m) => m.keywordId === keyword.id)
    dispatch({ type: 'untrack', id: keyword.id })
    if (filters.keywordId === keyword.id) filter({ keywordId: null })
    audit('listening', { type: 'untrackedKeyword', term: keyword.term, brandId: keyword.brandId })
    toast({ text: l.toast.stopped(keyword.term), icon: Trash2, undo: () => dispatch({ type: 'track', keyword, mentions, index }) })
  }

  const save = (m: Mention) => {
    dispatch({ type: 'mention', id: m.id, patch: { saved: !m.saved } })
    toast({ text: m.saved ? l.toast.unsaved : l.toast.saved, icon: Star })
  }

  const hide = (m: Mention) => {
    dispatch({ type: 'mention', id: m.id, patch: { hidden: true } })
    toast({ text: l.toast.hidden, icon: EyeOff, undo: () => dispatch({ type: 'mention', id: m.id, patch: { hidden: false } }) })
  }

  /** Opens a conversation with the author in the inbox (once; afterwards it just goes there). */
  const reply = (m: Mention) => {
    if (m.conversationId && ws.conversations.some((c) => c.id === m.conversationId)) {
      window.location.hash = `#/inbox/${m.conversationId}`
      return
    }
    const keyword = keywords.get(m.keywordId)
    if (!keyword) return
    const own = ws.channels.filter((c) => c.brandId === keyword.brandId)
    const connected = own.filter((c) => c.status === 'connected')
    // Reply from the brand's account on the same network when there is one.
    const channel = connected.find((c) => c.network === m.network) ?? connected[0] ?? own[0]
    if (!channel) return toast({ text: l.toast.noChannel(brandName(keyword.brandId)), icon: Unlink })
    const id = `c-${Date.now().toString(36)}`
    const conversation: Conversation = {
      id,
      brandId: keyword.brandId,
      network: channel.network,
      kind: 'mention',
      contact: { name: m.author, handle: m.handle, avatar: m.avatar, followers: Math.round(m.reach / 3) },
      messages: [{ id: `${id}-m1`, from: 'them', text: mentionText(m, keyword), at: m.at }],
      sentiment: m.sentiment,
      unread: false,
      priority: m.sentiment === 'negative',
      status: 'open',
      tags: ['#listening'],
    }
    dispatch({ type: 'mentionToInbox', id: m.id, conversation })
    audit('inbox', { type: 'openedMention', network: m.network, term: keyword.term })
    toast({ text: l.toast.moved(brandName(keyword.brandId)), icon: Inbox })
    window.location.hash = `#/inbox/${id}`
  }

  /** A keyword in the cloud filters by that keyword; any other term searches the stream. */
  const pickTerm = (term: TrendingTerm) => {
    if (term.keywordId) filter({ keywordId: filters.keywordId === term.keywordId ? null : term.keywordId, term: null })
    else filter({ term: filters.term?.toLowerCase() === term.label.toLowerCase() ? null : term.label })
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('an-ls-st-t')?.closest('section')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  const card = (id: CardId) => ({
    id: `ls-${id}`,
    area: id,
    expanded: expanded === id,
    onToggle: () => setExpanded((cur) => (cur === id ? null : id)),
  })

  const s = model.stats
  const pts = Math.round((model.sentiment.net - model.sentiment.before) * 100)

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center gap-x-[clamp(28px,4vw,72px)] gap-y-[18px] max-mobile:mb-[18px] max-mobile:gap-y-3">
        <PageTitle lines={[l.title]} label={l.title} />
        <dl className="flex flex-wrap gap-x-[clamp(24px,3.2vw,56px)] gap-y-3.5 max-mobile:grid max-mobile:w-full max-mobile:grid-cols-2 max-mobile:gap-x-3.5 max-mobile:gap-y-2.5">
          <Stat icon={MessageCircle} value={t.numbers.int(s.mentions)} label={l.stats.mentions} />
          <Stat icon={Smile} value={t.numbers.pct0(s.net)} label={l.stats.net} />
          <Stat icon={Eye} value={t.numbers.compact(s.reach)} label={l.stats.reach} />
          <Stat icon={PieChart} value={t.numbers.pct0(s.shareOfVoice)} label={l.stats.share(brand?.name ?? '')} />
        </dl>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 max-mobile:ml-0 max-mobile:w-full">
          <Button icon={Plus} onClick={() => setAdding(true)} className="max-mobile:flex-1">
            {l.track}
          </Button>
        </div>
      </header>

      <div className="ls-grid">
        <AnCard {...card('kw')} title={l.keywords.title} className="self-stretch">
          <Keywords
            rows={model.keywords}
            selected={filters.keywordId}
            onSelect={(id) => filter({ keywordId: filters.keywordId === id ? null : id })}
            onStop={stop}
            showAll={allKeywords}
            onShowAll={setAllKeywords}
          />
        </AnCard>

        <AnCard {...card('st')} title={l.stream.title} tools={<LiveToggle live={live} onToggle={toggleLive} />} className="scroll-mt-4 self-stretch">
          <Stream
            mentions={stream}
            shown={Math.max(shown, pageSize)}
            pageSize={pageSize}
            onMore={() => setShown((n) => Math.max(n, pageSize) + pageSize)}
            fresh={fresh}
            keywords={keywords}
            filters={filters}
            onFilters={filter}
            onClear={() => filter(NO_STREAM_FILTERS)}
            networks={model.networks}
            savedCount={savedCount}
            now={now}
            onReply={reply}
            onSave={save}
            onHide={hide}
          />
        </AnCard>

        <AnCard {...card('sov')} title={l.voice.title} className="self-stretch wide:self-start">
          <BrandPicker brands={ws.brands} brand={brand} onPick={setBrandId} />
          <ShareOfVoice model={model} brand={brand} />
        </AnCard>

        <AnCard {...card('tr')} title={l.trending.title} className="self-stretch">
          <Trending
            terms={model.trending}
            isOn={(term) => (term.keywordId ? filters.keywordId === term.keywordId : filters.term?.toLowerCase() === term.label.toLowerCase())}
            onPick={pickTerm}
          />
        </AnCard>

        <AnCard {...card('sent')} title={l.sentiment.title} className="self-stretch">
          <Figure value={t.numbers.pct0(model.sentiment.net)}>
            <span className="text-2xs text-muted">{l.sentiment.sub(pts)}</span>
          </Figure>
          <div className="mb-1.5 mt-3 flex flex-wrap gap-x-4 gap-y-2 text-2xs text-muted">
            {SENTIMENTS.map((sentiment) => (
              <span key={sentiment} className="inline-flex items-center gap-1.5">
                <SentimentDot s={sentiment} />
                {t.sentiment[sentiment]}
              </span>
            ))}
          </div>
          <SentimentChart days={model.sentiment.days} series={model.sentiment.series} />
        </AnCard>

        <AnCard {...card('comp')} title={l.competitors.title} className="self-stretch">
          <Competitors model={model} />
        </AnCard>
      </div>

      {adding && <TrackDialog brandId={brandId} onTrack={track} onClose={() => setAdding(false)} />}
    </>
  )
}
