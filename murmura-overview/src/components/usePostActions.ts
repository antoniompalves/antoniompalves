import { Send } from 'lucide-react'
import { isPlanner } from '../data/planner'
import { NETWORK_LABEL } from '../data/selectors'
import { useWorkspace } from '../data/store'
import type { WorkspaceAction } from '../data/store'
import { useI18n } from '../i18n'
import { useToast } from './Toast'

/** Undoable post actions shared by every place that opens the post drawer. */
export function usePostActions(now: Date, afterChange: () => void) {
  const { ws, undoable } = useWorkspace()
  const toast = useToast()
  const { t } = useI18n()

  const change = (text: string, action: WorkspaceAction, icon?: typeof Send) => toast({ text, icon, undo: undoable(action) })

  return {
    /** In planner mode this marks a post someone published by hand, with the link to it when given. */
    publish: (id: string, url?: string) => {
      const p = ws.posts.find((x) => x.id === id)
      const text = isPlanner(ws) ? t.planner.marked : t.postActions.published(p?.networks.map((n) => NETWORK_LABEL[n]) ?? [])
      change(text, { type: 'publish', id, at: now.toISOString(), ...(url && { url }) }, Send)
      afterChange()
    },
    duplicate: (id: string) => change(t.postActions.duplicated, { type: 'duplicate', id, newId: `p${Date.now()}`, at: now.toISOString() }),
    remove: (id: string) => {
      change(t.postActions.deleted, { type: 'delete', id })
      afterChange()
    },
  }
}
