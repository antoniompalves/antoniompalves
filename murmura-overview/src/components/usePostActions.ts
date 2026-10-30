import { Send } from 'lucide-react'
import { NETWORK_LABEL } from '../data/selectors'
import { useWorkspace } from '../data/store'
import { useToast } from './Toast'

/** Undoable post actions shared by every place that opens the post drawer. */
export function usePostActions(now: Date, afterChange: () => void) {
  const { ws, dispatch } = useWorkspace()
  const toast = useToast()

  const undoable = (text: string, run: () => void, icon?: typeof Send) => {
    const before = ws.posts
    run()
    toast({ text, icon, undo: () => dispatch({ type: 'restore', posts: before }) })
  }

  return {
    publish: (id: string) => {
      const p = ws.posts.find((x) => x.id === id)
      undoable(`Published to ${p?.networks.map((n) => NETWORK_LABEL[n]).join(', ')}`, () => dispatch({ type: 'publish', id, at: now.toISOString() }), Send)
      afterChange()
    },
    duplicate: (id: string) => undoable('Duplicated as a draft', () => dispatch({ type: 'duplicate', id, newId: `p${Date.now()}` })),
    remove: (id: string) => {
      undoable('Post deleted', () => dispatch({ type: 'delete', id }))
      afterChange()
    },
  }
}
