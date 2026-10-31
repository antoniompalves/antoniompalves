import { createContext, useContext, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { AuditEvent, Conversation, Keyword, Mention, Message, Post, ScheduledReport, Website, Workspace } from './types'

/**
 * Single in-memory workspace shared by every view, so rescheduling a post on
 * the calendar is immediately reflected on the overview (and vice versa).
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
  | { type: 'readAll' }
  | { type: 'restoreConversations'; conversations: Conversation[] }
  | { type: 'addReport'; report: ScheduledReport }
  | { type: 'restoreReports'; reports: ScheduledReport[] }
  | { type: 'setWebsites'; websites: Website[] }
  | { type: 'audit'; event: AuditEvent }
  /** `index` puts a keyword back where it was (undoing "Stop tracking"). */
  | { type: 'track'; keyword: Keyword; mentions: Mention[]; index?: number }
  | { type: 'untrack'; id: string }
  | { type: 'mentionArrived'; mention: Mention }
  | { type: 'mention'; id: string; patch: Partial<Mention> }
  | { type: 'mentionToInbox'; id: string; conversation: Conversation }

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
      return { ...ws, conversations: ws.conversations.map((c) => (c.status === 'open' && c.unread ? { ...c, unread: false } : c)) }
    case 'restoreConversations':
      return { ...ws, conversations: action.conversations }
    case 'addReport':
      return { ...ws, reports: [...ws.reports, action.report] }
    case 'restoreReports':
      return { ...ws, reports: action.reports }
    case 'setWebsites':
      return { ...ws, websites: action.websites }
    case 'audit':
      return { ...ws, audit: [action.event, ...ws.audit] }
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
  }
}

const newestFirst = (mentions: Mention[]) => [...mentions].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))

const WorkspaceContext = createContext<{ ws: Workspace; dispatch: Dispatch<WorkspaceAction> } | null>(null)

export function WorkspaceProvider({ initial, children }: { initial: Workspace; children: ReactNode }) {
  const [ws, dispatch] = useReducer(reducer, initial)
  return <WorkspaceContext.Provider value={{ ws, dispatch }}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return ctx
}
