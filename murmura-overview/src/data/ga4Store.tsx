import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Ga4Error, cleanPropertyId, fetchProperty, requestToken, revokeToken } from './ga4'
import type { Ga4Token } from './ga4'
import { useWorkspace } from './store'
import type { Website, Workspace } from './types'
import { demoHistory } from './webAnalytics'
import type { SiteEntry, SiteHistory } from './webAnalytics'

/**
 * Where the Websites section gets its numbers: generated demo traffic, or live
 * GA4 reports once someone connects. The OAuth client ID and the list of sites
 * (with their property IDs) are saved in this browser; the access token only
 * lives in memory and is gone on reload.
 */

const STORAGE_KEY = 'murmura-ga4'

interface Saved {
  clientId?: string
  websites?: Website[]
}

function readSaved(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Saved
  } catch {
    return {}
  }
}

/** The mock workspace with the sites saved in this browser, if any were edited. */
export function withSavedWebsites(ws: Workspace): Workspace {
  const saved = readSaved().websites
  return Array.isArray(saved) ? { ...ws, websites: saved } : ws
}

/** Default client ID for deployments: `VITE_GA_CLIENT_ID` at build time. */
const ENV_CLIENT_ID = (import.meta.env.VITE_GA_CLIENT_ID as string | undefined) ?? ''

export type Ga4Status = 'demo' | 'connecting' | 'live'

interface Ga4Context {
  status: Ga4Status
  clientId: string
  /** Sites with numbers to show, demo or live depending on the status. */
  entries: SiteEntry[]
  /** Sites the current mode has no numbers for and no error about: no demo traffic, or no property ID once live. */
  missing: Website[]
  /** Per-site report errors from the last sync. */
  errors: Record<string, Ga4Error>
  /** Sign-in problem from the last attempt. */
  error: Ga4Error | null
  updatedAt: Date | null
  /** Signs in and reads every site with a property ID (pass the list when it was just edited); resolves with how many loaded. */
  connect: (clientId: string, websites?: Website[]) => Promise<number>
  refresh: () => Promise<void>
  disconnect: () => void
  saveSettings: (clientId: string, websites: Website[]) => void
}

const Ctx = createContext<Ga4Context | null>(null)

export function Ga4Provider({ children }: { children: ReactNode }) {
  const { ws, dispatch } = useWorkspace()
  const [clientId, setClientId] = useState(() => readSaved().clientId ?? ENV_CLIENT_ID)
  const [status, setStatus] = useState<Ga4Status>('demo')
  const [live, setLive] = useState<Record<string, SiteHistory>>({})
  const [errors, setErrors] = useState<Record<string, Ga4Error>>({})
  const [error, setError] = useState<Ga4Error | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const token = useRef<Ga4Token | null>(null)

  // Remember the client ID and sites in this browser (never the token).
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ clientId, websites: ws.websites }))
    } catch {
      /* storage unavailable: settings last for this visit */
    }
  }, [clientId, ws.websites])

  const sync = useCallback(
    async (t: Ga4Token, sites: Website[]) => {
      const linked = sites.filter((s) => s.propertyId)
      const results = await Promise.allSettled(linked.map((s) => fetchProperty(t.value, cleanPropertyId(s.propertyId!))))
      const nextLive: Record<string, SiteHistory> = {}
      const nextErrors: Record<string, Ga4Error> = {}
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') nextLive[linked[i].id] = r.value
        else nextErrors[linked[i].id] = r.reason instanceof Ga4Error ? r.reason : new Ga4Error('api', String(r.reason))
      })
      setLive(nextLive)
      setErrors(nextErrors)
      setUpdatedAt(new Date())
      return nextLive
    },
    [],
  )

  const connect = useCallback(
    async (id: string, websites?: Website[]) => {
      setStatus('connecting')
      setError(null)
      try {
        const t = await requestToken(id)
        token.current = t
        const loaded = Object.keys(await sync(t, websites ?? ws.websites)).length
        setStatus(loaded ? 'live' : 'demo')
        return loaded
      } catch (e) {
        setError(e instanceof Ga4Error ? e : new Ga4Error('signIn', String(e)))
        setStatus('demo')
        return 0
      }
    },
    [sync, ws.websites],
  )

  const refresh = useCallback(async () => {
    if (!clientId) return
    try {
      if (!token.current || token.current.expiresAt < Date.now() + 60_000) token.current = await requestToken(clientId)
      await sync(token.current, ws.websites)
    } catch (e) {
      setError(e instanceof Ga4Error ? e : new Ga4Error('signIn', String(e)))
    }
  }, [clientId, sync, ws.websites])

  const disconnect = useCallback(() => {
    if (token.current) revokeToken(token.current.value)
    token.current = null
    setLive({})
    setErrors({})
    setError(null)
    setUpdatedAt(null)
    setStatus('demo')
  }, [])

  const saveSettings = useCallback(
    (id: string, websites: Website[]) => {
      setClientId(id.trim())
      dispatch({ type: 'setWebsites', websites })
    },
    [dispatch],
  )

  // Demo traffic is cheap to generate (6 sites × 180 days) and only changes with the workspace.
  const demo = useMemo(() => {
    const out: Record<string, SiteHistory> = {}
    for (const site of ws.websites) {
      const h = site.demo ? demoHistory(ws, site) : null
      if (h) out[site.id] = h
    }
    return out
  }, [ws])

  const value = useMemo<Ga4Context>(() => {
    const source = status === 'live' ? live : demo
    const entries = ws.websites.filter((s) => source[s.id]).map((site) => ({ site, history: source[site.id] }))
    return {
      status,
      clientId,
      entries,
      missing: ws.websites.filter((s) => !source[s.id] && !errors[s.id]),
      errors,
      error,
      updatedAt,
      connect,
      refresh,
      disconnect,
      saveSettings,
    }
  }, [status, live, demo, ws.websites, clientId, errors, error, updatedAt, connect, refresh, disconnect, saveSettings])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGa4() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useGa4 must be used inside <Ga4Provider>')
  return ctx
}
