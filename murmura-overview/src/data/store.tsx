import { createContext, useContext, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { Conversation, Message, Post, Workspace } from './types'

/**
 * Single in-memory workspace shared by every view, so rescheduling a post on
 * the calendar is immediately reflected on the overview (and vice versa).
 */

export type WorkspaceAction =
  | { type: 'move'; id: string; to: string }
  | { type: 'restore'; posts: Post[] }
  | { type: 'publish'; id: string; at: string }
  | { type: 'duplicate'; id: string; newId: string }
  | { type: 'delete'; id: string }
  | { type: 'conversation'; id: string; patch: Partial<Conversation> }
  | { type: 'send'; id: string; message: Message; close?: boolean }
  | { type: 'readAll' }
  | { type: 'restoreConversations'; conversations: Conversation[] }

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
      return { ...ws, posts: [...ws.posts, { ...source, id: action.newId, status: 'draft', metrics: undefined, failure: undefined }] }
    }
    case 'delete':
      return { ...ws, posts: ws.posts.filter((p) => p.id !== action.id) }
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
  }
}

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
