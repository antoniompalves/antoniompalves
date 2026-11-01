import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { revertOf } from './reducer'
import type { WorkspaceAction } from './reducer'
import { scopeView } from './scope'
import type { SessionInfo, SessionUser, Snapshot } from './server'
import { WorkspaceContext } from './store'
import type { ClockOrigin, ServerLink } from './store'
import { SyncEngine } from './syncEngine'
import type { SyncEvents } from './syncEngine'

interface Props {
  first: Snapshot
  user: SessionUser
  session: SessionInfo
  events: SyncEvents
  signOut: () => Promise<void>
  children: ReactNode
}

/**
 * The shared workspace on a Kataru server, offered to the pages exactly as the
 * demo's (useWorkspace), so every page works the same: changes are applied
 * at once and sent to the server, and everyone's changes stream back in
 * (syncEngine.ts). The brand switcher stays in this browser.
 */
export function ServerWorkspaceProvider({ first, user, session, events, signOut, children }: Props) {
  // The engine calls back through refs, so it lives as long as the session.
  const handlers = useRef(events)
  handlers.current = events
  const [engine] = useState(
    () =>
      new SyncEngine(first, {
        refused: (m, c) => handlers.current.refused(m, c),
        signedOut: (c) => handlers.current.signedOut(c),
        mfaRequired: () => handlers.current.mfaRequired(),
      }),
  )
  useEffect(() => {
    engine.connect()
    return () => engine.close()
  }, [engine])

  const shared = useSyncExternalStore(engine.subscribe, engine.view)
  const status = useSyncExternalStore(engine.subscribe, () => engine.status)
  const settled = useSyncExternalStore(engine.subscribe, () => engine.settled)
  const [brandScope, setBrandScope] = useState<string | null>(null)

  // Leaving with changes still on their way: the browser asks first.
  useEffect(() => {
    if (settled) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [settled])

  const all = useMemo(() => {
    // A brand they no longer see (access changed) falls back to every brand.
    const scope = brandScope && shared.brands.some((b) => b.id === brandScope) ? brandScope : null
    return { ...shared, currentUserId: user.memberId, brandScope: scope, signedIn: true }
  }, [shared, brandScope, user.memberId])

  const dispatch = useCallback(
    (a: WorkspaceAction) => {
      if (a.type === 'scope') setBrandScope(a.brandId)
      else if (a.type === 'signOut') void signOut()
      else engine.dispatch(a)
    },
    [engine, signOut],
  )

  // The workspace started requiring two-step verification and this person has none yet.
  const mine = all.team.find((m) => m.id === user.memberId)
  const mustEnroll = all.settings.requireMfa && !mine?.mfa && !user.method.startsWith('sso:')
  useEffect(() => {
    if (mustEnroll) handlers.current.mfaRequired()
  }, [mustEnroll])

  const latest = useRef(all)
  latest.current = all
  const undoable = useCallback(
    (...actions: WorkspaceAction[]) => {
      const { after, undo } = revertOf(latest.current, actions)
      latest.current = after
      actions.forEach(dispatch)
      return () => dispatch(undo)
    },
    [dispatch],
  )

  // Real time: the server's clock is the clock.
  const [clock] = useState<ClockOrigin>(() => ({ mock: Date.now(), real: Date.now() }))
  const reset = useCallback(() => undefined, [])
  const server: ServerLink = useMemo(() => ({ status, settled, user, company: all.settings.name, sso: session.sso, mail: session.mail, signOut }), [status, settled, user, all.settings.name, session.sso, session.mail, signOut])
  const view = useMemo(() => scopeView(all), [all])
  return <WorkspaceContext.Provider value={{ ws: view, all, dispatch, undoable, clock, reset, mode: 'server', server }}>{children}</WorkspaceContext.Provider>
}
