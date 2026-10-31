import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Dispatch, ReactNode } from 'react'
import { STORAGE_KEY, fingerprint, loadWorkspace, parseSaved, saveWorkspace } from './persist'
import { scopeView } from './scope'
import type { AuditEvent, Channel, Conversation, Keyword, Mention, Message, Notice, Post, ScheduledReport, Website, Workspace } from './types'

/**
 * Single workspace shared by every view, so rescheduling a post on the
 * calendar is immediately reflected on the overview (and vice versa). It is
 * saved per browser after each change (see persist.ts) and follows changes
 * made in other tabs.
 */

export type WorkspaceAction =
  | { type: 'move'; id: string; to: string }
  | { type: 'restore'; posts: Post[] }
  | { type: 'publish'; id: string; at: string }
  | { type: 'duplicate'; id: string; newId: string; at: string }
  | { type: 'delete'; id: string }
  /** Insert a post, or replace the one with its id (the composer's saves). */
  | { type: 'savePost'; post: Post }
  | { type: 'conversation'; id: string; patch: Partial<Conversation> }
  | { type: 'send'; id: string; message: Message; close?: boolean }
  /** Marks these open conversations read (the ones on screen). */
  | { type: 'readAll'; ids: string[] }
  | { type: 'restoreConversations'; conversations: Conversation[] }
  | { type: 'addReport'; report: ScheduledReport }
  | { type: 'restoreReports'; reports: ScheduledReport[] }
  | { type: 'setWebsites'; websites: Website[] }
  | { type: 'channel'; id: string; patch: Partial<Channel> }
  /** Add a channel, or replace the one with its id. */
  | { type: 'saveChannel'; channel: Channel }
  | { type: 'audit'; event: AuditEvent }
  /** Take an activity entry back out (an undone action). */
  | { type: 'unaudit'; id: string }
  /** `index` puts a keyword back where it was (undoing "Stop tracking"). */
  | { type: 'track'; keyword: Keyword; mentions: Mention[]; index?: number }
  | { type: 'untrack'; id: string }
  | { type: 'mentionArrived'; mention: Mention }
  | { type: 'mention'; id: string; patch: Partial<Mention> }
  | { type: 'mentionToInbox'; id: string; conversation: Conversation }
  /** Replace everything: a reset, or a save from another tab. */
  | { type: 'load'; ws: Workspace }
  | { type: 'scope'; brandId: string | null }
  | { type: 'notify'; notices: Notice[] }
  | { type: 'readNotices'; ids: string[] }
  | { type: 'signIn'; userId: string }
  | { type: 'signOut' }

function reducer(ws: Workspace, action: WorkspaceAction): Workspace {
  const update = (id: string, patch: (p: Post) => Post) => ({
    ...ws,
    posts: ws.posts.map((p) => (p.id === id ? patch(p) : p)),
  })
  switch (action.type) {
    case 'move':
      return update(action.id, (p) => ({ ...p, scheduledAt: action.to }))
    case 'restore':
      return { ...ws, posts: action.posts }
    case 'publish':
      return update(action.id, (p) => ({ ...p, status: 'published', scheduledAt: action.at, failure: undefined }))
    case 'duplicate': {
      const source = ws.posts.find((p) => p.id === action.id)
      if (!source) return ws
      return { ...ws, posts: [...ws.posts, { ...source, id: action.newId, status: 'draft', createdAt: action.at, reviews: [], metrics: undefined, failure: undefined }] }
    }
    case 'delete':
      return { ...ws, posts: ws.posts.filter((p) => p.id !== action.id) }
    case 'savePost': {
      const exists = ws.posts.some((p) => p.id === action.post.id)
      return { ...ws, posts: exists ? ws.posts.map((p) => (p.id === action.post.id ? action.post : p)) : [...ws.posts, action.post] }
    }
    case 'conversation':
      return { ...ws, conversations: ws.conversations.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) }
    case 'send':
      return {
        ...ws,
        conversations: ws.conversations.map((c) =>
          c.id === action.id
            ? { ...c, unread: false, messages: [...c.messages, action.message], ...(action.close && { status: 'done' as const }) }
            : c,
        ),
      }
    case 'readAll':
      return { ...ws, conversations: ws.conversations.map((c) => (action.ids.includes(c.id) && c.status === 'open' && c.unread ? { ...c, unread: false } : c)) }
    case 'restoreConversations':
      return { ...ws, conversations: action.conversations }
    case 'addReport':
      return { ...ws, reports: [...ws.reports, action.report] }
    case 'restoreReports':
      return { ...ws, reports: action.reports }
    case 'setWebsites':
      return { ...ws, websites: action.websites }
    case 'channel':
      return { ...ws, channels: ws.channels.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) }
    case 'saveChannel':
      return ws.channels.some((c) => c.id === action.channel.id)
        ? { ...ws, channels: ws.channels.map((c) => (c.id === action.channel.id ? action.channel : c)) }
        : { ...ws, channels: [...ws.channels, action.channel] }
    case 'audit':
      return { ...ws, audit: [action.event, ...ws.audit] }
    case 'unaudit':
      return { ...ws, audit: ws.audit.filter((e) => e.id !== action.id) }
    case 'track': {
      const keywords = [...ws.keywords]
      keywords.splice(action.index ?? keywords.length, 0, action.keyword)
      return { ...ws, keywords, mentions: newestFirst([...ws.mentions, ...action.mentions]) }
    }
    case 'untrack':
      return { ...ws, keywords: ws.keywords.filter((k) => k.id !== action.id), mentions: ws.mentions.filter((m) => m.keywordId !== action.id) }
    case 'mentionArrived':
      return { ...ws, mentions: [action.mention, ...ws.mentions] }
    case 'mention':
      return { ...ws, mentions: ws.mentions.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)) }
    case 'mentionToInbox':
      return {
        ...ws,
        conversations: [action.conversation, ...ws.conversations],
        mentions: ws.mentions.map((m) => (m.id === action.id ? { ...m, conversationId: action.conversation.id } : m)),
      }
    case 'load':
      return action.ws
    case 'scope':
      return { ...ws, brandScope: action.brandId }
    case 'notify':
      // Newest first, and only the latest 40 are kept.
      return { ...ws, notices: [...action.notices, ...ws.notices].slice(0, 40) }
    case 'readNotices':
      return { ...ws, notices: ws.notices.map((n) => (action.ids.includes(n.id) ? { ...n, read: true } : n)) }
    case 'signIn': {
      const who = ws.team.find((m) => m.id === action.userId)
      // A brand they can't see falls back to every brand.
      const keep = !ws.brandScope || !who || who.brands === 'all' || who.brands.includes(ws.brandScope)
      return { ...ws, currentUserId: action.userId, signedIn: true, brandScope: keep ? ws.brandScope : null }
    }
    case 'signOut':
      return { ...ws, signedIn: false }
  }
}

const newestFirst = (mentions: Mention[]) => [...mentions].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))

/** Where the mock clock starts: `mock` (ms) at the real moment `real`. */
export interface ClockOrigin {
  mock: number
  real: number
}

interface WorkspaceContextValue {
  /** What pages show: the brands the signed-in person sees, narrowed by the brand switcher (scope.ts). */
  ws: Workspace
  /** Everything, for undo snapshots and settings that span every brand. */
  all: Workspace
  dispatch: Dispatch<WorkspaceAction>
  clock: ClockOrigin
  /** Back to the starting data, keeping who is signed in. */
  reset: () => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

interface ProviderProps {
  seed: Workspace
  /** Per-browser settings laid over the data (GA4 websites); they survive a reset. */
  withSettings?: (ws: Workspace) => Workspace
  children: ReactNode
}

export function WorkspaceProvider({ seed, withSettings = (ws) => ws, children }: ProviderProps) {
  const seedKey = useMemo(() => fingerprint(seed), [seed])
  const [boot] = useState(() => {
    const saved = loadWorkspace(seedKey)
    const ws = withSettings(saved?.workspace ?? seed)
    // A save made later in mock time resumes from there, so "5 min ago" never turns into the future.
    const mock = Math.max(Date.parse(seed.now), saved ? Date.parse(saved.clock) : 0)
    return { ws, clock: { mock, real: Date.now() } }
  })
  const [ws, dispatch] = useReducer(reducer, boot.ws)
  const [clock, setClock] = useState<ClockOrigin>(boot.clock)
  // The state as loaded (from the seed, a save or another tab) needn't be written back.
  const clean = useRef<Workspace>(boot.ws)

  useEffect(() => {
    if (ws === clean.current) return
    const save = () => saveWorkspace(ws, seedKey, clock.mock + Date.now() - clock.real)
    const id = window.setTimeout(save, 250)
    window.addEventListener('pagehide', save)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('pagehide', save)
    }
  }, [ws, clock, seedKey])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const saved = parseSaved(e.newValue, seedKey)
      if (!saved) return
      clean.current = withSettings(saved.workspace)
      dispatch({ type: 'load', ws: clean.current })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [seedKey, withSettings])

  const me = ws.currentUserId
  const reset = useCallback(() => {
    const fresh = withSettings(seed)
    dispatch({ type: 'load', ws: fresh.team.some((m) => m.id === me) ? { ...fresh, currentUserId: me } : fresh })
    setClock({ mock: Date.parse(seed.now), real: Date.now() })
  }, [seed, withSettings, me])

  const view = useMemo(() => scopeView(ws), [ws])
  return <WorkspaceContext.Provider value={{ ws: view, all: ws, dispatch, clock, reset }}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return ctx
}
