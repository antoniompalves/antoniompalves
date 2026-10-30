import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CheckCheck, Flag, Hash, Inbox as InboxIcon, RotateCcw, Send, Smile } from 'lucide-react'
import { useToast } from '../components/Toast'
import { usePostActions } from '../components/usePostActions'
import { PostDrawer } from '../components/calendar/PostDrawer'
import { ContactInfo } from '../components/inbox/ContactInfo'
import { ConversationList } from '../components/inbox/ConversationList'
import { Thread } from '../components/inbox/Thread'
import type { Draft } from '../components/inbox/Thread'
import type { InboxFilters, InboxView } from '../data/inbox'
import { NO_INBOX_FILTERS, byActivity, inView, inboxStats, matchesInboxFilters, matchesSearch, tagSuggestions } from '../data/inbox'
import { useWorkspace } from '../data/store'
import type { Conversation, Message, Sentiment } from '../data/types'
import { cn } from '../components/ui'

const EMPTY_DRAFT: Draft = { text: '', note: false }

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const on = () => setMatches(mql.matches)
    mql.addEventListener('change', on)
    return () => mql.removeEventListener('change', on)
  }, [query])
  return matches
}

const go = (id?: string) => {
  window.location.hash = id ? `#/inbox/${id}` : '#/inbox'
}

/**
 * #/inbox and #/inbox/:id — every comment, DM, mention and review in one
 * chat-style workspace: conversation list, thread with composer, and an
 * optional contact panel. Shortcuts: J/K move, E done, R reply, / search.
 */
export function Inbox({ now, hash }: { now: Date; hash: string }) {
  const { ws, dispatch } = useWorkspace()
  const toast = useToast()
  const [view, setView] = useState<InboxView>('all')
  const [filters, setFilters] = useState<InboxFilters>(NO_INBOX_FILTERS)
  const [query, setQuery] = useState('')
  const [infoOpen, setInfoOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [stampId, setStampId] = useState<string | null>(null)
  const [openPostId, setOpenPostId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const isMobile = useMediaQuery('(width < 761px)')

  const brands = useMemo(() => new Map(ws.brands.map((b) => [b.id, b])), [ws.brands])
  const team = useMemo(() => new Map(ws.team.map((m) => [m.id, m])), [ws.team])
  const me = team.get(ws.currentUserId)!

  const stats = inboxStats(ws.conversations, me.id)
  const rows = ws.conversations
    .filter((c) => inView(c, view, me.id) && matchesInboxFilters(c, filters) && matchesSearch(c, query))
    .sort(byActivity)
  const currentId = hash.split('/')[2] || null
  const current = currentId ? ws.conversations.find((c) => c.id === currentId) : undefined
  // Only teammates who work on the conversation's brand can take it; you come first.
  const assignable = current ? [me, ...ws.team.filter((m) => m.id !== me.id && (m.brands === 'all' || m.brands.includes(current.brandId)))] : []

  // On wide screens a conversation is always open, as in the reference, unless one was just marked unread.
  const parked = useRef(false)
  const firstRow = rows[0]?.id
  useEffect(() => {
    if (currentId) parked.current = false
    else if (!isMobile && firstRow && !parked.current) window.location.replace(`#/inbox/${firstRow}`)
  }, [isMobile, currentId, firstRow])

  // Opening a conversation reads it.
  useEffect(() => {
    if (current?.unread) dispatch({ type: 'conversation', id: current.id, patch: { unread: false } })
    setTagOpen(false)
    // Only when the selection changes; "Mark as unread" must stick.
  }, [currentId])

  /* ── actions ── */

  const patch = (id: string, p: Partial<Conversation>) => dispatch({ type: 'conversation', id, patch: p })
  const undoTo = (before: Conversation[], id?: string) => () => {
    dispatch({ type: 'restoreConversations', conversations: before })
    if (id) go(id)
  }
  const nextAfter = (id: string) => {
    const i = rows.findIndex((r) => r.id === id)
    const rest = rows.filter((r) => r.id !== id)
    return rest[Math.min(Math.max(i, 0), rest.length - 1)]?.id
  }
  const firstName = (c: Conversation) => c.contact.name.split(' ')[0]

  const done = (c: Conversation) => {
    const before = ws.conversations
    if (c.status === 'done') {
      patch(c.id, { status: 'open' })
      toast({ text: `Reopened ${firstName(c)}’s ${c.kind}`, icon: RotateCcw, undo: undoTo(before, c.id) })
      return
    }
    const next = nextAfter(c.id)
    setStampId(c.id)
    window.setTimeout(() => {
      setStampId(null)
      patch(c.id, { status: 'done', unread: false })
      toast({ text: `Done · ${firstName(c)}’s ${c.kind} closed`, icon: CheckCheck, undo: undoTo(before, c.id) })
      if (view !== 'done') go(next)
    }, 450)
  }

  const send = (c: Conversation, draft: Draft, close = false) => {
    const before = ws.conversations
    const message: Message = {
      id: `${c.id}-m${Date.now()}`,
      from: 'us',
      authorId: me.id,
      text: draft.text.trim(),
      at: now.toISOString(),
      ...(draft.note && { note: true }),
      ...(draft.image && { image: draft.image }),
    }
    const closing = close && !draft.note
    dispatch({ type: 'send', id: c.id, message, close: closing })
    setDrafts((d) => ({ ...d, [c.id]: EMPTY_DRAFT }))
    if (closing) {
      toast({ text: `Sent to ${firstName(c)} · conversation closed`, icon: Send, undo: undoTo(before, c.id) })
      if (view !== 'done') go(nextAfter(c.id))
    }
  }

  const markAllRead = () => {
    const before = ws.conversations
    const n = stats.unread
    dispatch({ type: 'readAll' })
    toast({ text: `Marked ${n} as read`, icon: CheckCheck, undo: undoTo(before) })
  }

  // The reference confirms assignment in place (avatar on the row and header), without a toast.
  const assign = (c: Conversation, memberId: string | null) => patch(c.id, { assigneeId: memberId ?? undefined })

  const priority = (c: Conversation) => {
    const before = ws.conversations
    patch(c.id, { priority: !c.priority })
    toast({ text: c.priority ? 'Priority removed' : 'Marked as priority', icon: Flag, undo: undoTo(before) })
  }

  const sentiment = (c: Conversation, s: Sentiment) => {
    if (c.sentiment === s) return
    const before = ws.conversations
    patch(c.id, { sentiment: s })
    toast({ text: `Marked ${s}`, icon: Smile, undo: undoTo(before) })
  }

  const addTag = (c: Conversation, tag: string) => {
    if (c.tags.includes(tag)) return
    patch(c.id, { tags: [...c.tags, tag] })
    // With the contact panel open the new chip is confirmation enough.
    if (!showInfo) toast({ text: `Tagged ${tag}`, icon: Hash })
  }

  const removeTag = (c: Conversation, tag: string) => {
    const before = ws.conversations
    patch(c.id, { tags: c.tags.filter((t) => t !== tag) })
    toast({ text: `Removed ${tag}`, icon: Hash, undo: undoTo(before) })
  }

  // "Mark as unread" puts the conversation back and parks the inbox on its empty state.
  const markUnread = (c: Conversation) => {
    patch(c.id, { unread: true })
    parked.current = true
    window.location.replace('#/inbox')
    toast({ text: 'Marked as unread', icon: Bell })
  }

  const { publish, duplicate, remove } = usePostActions(now, () => setOpenPostId(null))

  /* ── keyboard: J/K next/previous, E done, R reply, / search ── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('dialog[open], [role="dialog"]')) return
      const key = e.key.toLowerCase()
      if (key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (key === 'j' || key === 'k') {
        const i = rows.findIndex((r) => r.id === currentId)
        const next = rows[Math.min(rows.length - 1, Math.max(0, i + (key === 'j' ? 1 : -1)))]
        if (next) go(next.id)
      } else if (key === 'e' && current) {
        done(current)
      } else if (key === 'r' && current) {
        e.preventDefault()
        composerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const brand = current ? brands.get(current.brandId)! : undefined
  const post = current?.postId ? ws.posts.find((p) => p.id === current.postId) : undefined
  const library = current ? ws.media.filter((m) => m.brandId === current.brandId) : []
  const drawerPost = openPostId ? ws.posts.find((p) => p.id === openPostId) ?? null : null
  const showInfo = infoOpen && !!current

  return (
    <>
      <h1 className="sr-only" tabIndex={-1}>
        Inbox
      </h1>
      <div
        className={cn(
          'relative grid h-[max(560px,calc(100dvh-120px))] overflow-hidden rounded-card border border-rim bg-glass shadow-card max-[999px]:grid-cols-[minmax(270px,300px)_minmax(0,1fr)] max-mobile:block max-mobile:h-auto max-mobile:overflow-visible',
          showInfo
            ? 'grid-cols-[clamp(300px,27vw,376px)_minmax(0,1fr)] desk:grid-cols-[clamp(320px,25vw,376px)_minmax(0,1fr)_320px]'
            : 'grid-cols-[clamp(300px,27vw,376px)_minmax(0,1fr)]',
        )}
      >
        <ConversationList
          all={ws.conversations}
          rows={rows}
          currentId={currentId}
          view={view}
          setView={setView}
          stats={stats}
          filters={filters}
          setFilters={setFilters}
          query={query}
          setQuery={setQuery}
          searchRef={searchRef}
          brands={brands}
          team={team}
          now={now}
          stampId={stampId}
          onMarkAllRead={markAllRead}
        />

        {current && brand ? (
          <Thread
            c={current}
            brand={brand}
            post={post}
            team={team}
            assignable={assignable}
            me={me}
            now={now}
            infoOpen={showInfo}
            savedReplies={ws.savedReplies}
            library={library}
            draft={drafts[current.id] ?? EMPTY_DRAFT}
            setDraft={(d) => setDrafts((all) => ({ ...all, [current.id]: d }))}
            composerRef={composerRef}
            mobileOpen={isMobile}
            onToggleInfo={() => setInfoOpen((v) => !v)}
            onAssign={(id) => assign(current, id)}
            onPriority={() => priority(current)}
            onDone={() => done(current)}
            onMarkUnread={() => markUnread(current)}
            onSentiment={(s) => sentiment(current, s)}
            tagSuggestions={tagSuggestions(ws.conversations, current)}
            onAddTag={(t) => addTag(current, t)}
            onOpenPost={() => current.postId && setOpenPostId(current.postId)}
            onCopyHandle={() => {
              navigator.clipboard?.writeText(`@${current.contact.handle}`).catch(() => {})
              toast({ text: `Copied @${current.contact.handle}` })
            }}
            onSend={(d, close) => send(current, d, close)}
          />
        ) : (
          <Hello />
        )}

        {showInfo && current && brand && (
          <ContactInfo
            c={current}
            brand={brand}
            post={post}
            team={team}
            assignable={assignable}
            me={me}
            now={now}
            tagSuggestions={tagSuggestions(ws.conversations, current)}
            tagOpen={tagOpen}
            setTagOpen={setTagOpen}
            onClose={() => setInfoOpen(false)}
            onSentiment={(s) => sentiment(current, s)}
            onAddTag={(t) => addTag(current, t)}
            onRemoveTag={(t) => removeTag(current, t)}
            onAssign={(id) => assign(current, id)}
            onPriority={() => priority(current)}
            onDone={() => done(current)}
            onOpenPost={() => current.postId && setOpenPostId(current.postId)}
          />
        )}
      </div>

      <PostDrawer
        post={drawerPost}
        brand={drawerPost ? brands.get(drawerPost.brandId) : undefined}
        author={drawerPost ? team.get(drawerPost.authorId) : undefined}
        now={now}
        onClose={() => setOpenPostId(null)}
        onPublish={publish}
        onDuplicate={duplicate}
        onDelete={remove}
      />
    </>
  )
}

const KEYS: [string[], string][] = [
  [['J', 'K'], 'Next / previous'],
  [['E'], 'Mark done'],
  [['R'], 'Reply'],
  [['/'], 'Search'],
  [['Enter'], 'Send'],
]

/** Thread placeholder when nothing is selected (".ib-hello"). */
function Hello() {
  return (
    <section aria-label="Conversation" className="grid min-h-0 place-items-center bg-ib-wall p-6 max-mobile:hidden">
      <div className="grid max-w-[360px] justify-items-center gap-2 rounded-[22px] bg-ib-bar px-6 pb-[18px] pt-[26px] text-center shadow-[0_1px_2px_color-mix(in_srgb,var(--text)_8%,transparent)]">
        <span className="mb-1 grid size-[58px] place-items-center rounded-full bg-sea text-on-sea">
          <InboxIcon size={26} aria-hidden />
        </span>
        <h2 className="text-[21px] font-bold tracking-[-0.02em]">Pick a conversation</h2>
        <p className="text-xs text-muted">Every comment, message, mention and review from all your networks lands in one list.</p>
        <dl className="mt-2.5 grid w-full">
          {KEYS.map(([keys, label]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-line px-0.5 py-[7px] text-2xs last:border-b-0">
              <dt className="flex gap-1">
                {keys.map((k) => (
                  <kbd key={k} className="rounded-md border border-line-2 bg-float px-1.5 font-[inherit] text-[12.5px] font-semibold">
                    {k}
                  </kbd>
                ))}
              </dt>
              <dd className="text-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
