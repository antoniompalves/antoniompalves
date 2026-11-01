import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Dispatch, ReactNode } from 'react'
import { STORAGE_KEY, fingerprint, loadWorkspace, parseSaved, saveWorkspace } from './persist'
import { reduce, revertOf } from './reducer'
import type { WorkspaceAction } from './reducer'
import { scopeView } from './scope'
import type { Workspace } from './types'

export type { WorkspaceAction } from './reducer'

/**
 * Single workspace shared by every view, so rescheduling a post on the
 * calendar is immediately reflected on the overview (and vice versa). It is
 * saved per browser after each change (see persist.ts) and follows changes
 * made in other tabs.
 */

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
  /**
   * Makes these changes and returns what undoes them: only the items they
   * touched go back, so a teammate's changes in the meantime stay.
   */
  undoable: (...actions: WorkspaceAction[]) => () => void
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
  const [ws, dispatch] = useReducer(reduce, boot.ws)
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

  // The latest state, ahead of React when several changes are made in one go.
  const latest = useRef(ws)
  latest.current = ws
  const undoable = useCallback((...actions: WorkspaceAction[]) => {
    const { after, undo } = revertOf(latest.current, actions)
    latest.current = after
    actions.forEach(dispatch)
    return () => dispatch(undo)
  }, [])

  const view = useMemo(() => scopeView(ws), [ws])
  return <WorkspaceContext.Provider value={{ ws: view, all: ws, dispatch, undoable, clock, reset }}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return ctx
}
