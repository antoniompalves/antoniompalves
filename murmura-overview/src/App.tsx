import { useEffect, useMemo, useState } from 'react'
import { LucideProvider } from 'lucide-react'
import { AppFrame, Dock, Mesh, MobileNav, TopBar } from './components/AppShell'
import { Card } from './components/ui'
import { ToastProvider } from './components/Toast'
import { I18nProvider, useI18n } from './i18n'
import { workspace } from './data/mock'
import { matchRoute, tabRoutes } from './data/routes'
import { selectOverview } from './data/selectors'
import { WorkspaceProvider, useWorkspace } from './data/store'
import { Ga4Provider, withSavedWebsites } from './data/ga4Store'
import type { NavItem } from './data/types'
import { Analytics } from './pages/Analytics'
import { Calendar } from './pages/Calendar'
import { Inbox } from './pages/Inbox'
import { Overview } from './pages/Overview'

type Theme = 'light' | 'dark'

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash || '#/overview')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/overview')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('murmura-theme') as Theme) || 'light'
    } catch {
      return 'light'
    }
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('murmura-theme', theme)
    } catch {
      /* storage unavailable: theme still applies for this session */
    }
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))] as const
}

/** Mock "now" that keeps ticking from the frozen workspace timestamp. */
function useMockNow(start: string) {
  const [mountedAt] = useState(() => Date.now())
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 15_000)
    return () => clearInterval(id)
  }, [])
  return new Date(Date.parse(start) + (Date.now() - mountedAt))
}

export default function App() {
  return (
    <I18nProvider>
      <WorkspaceProvider initial={withSavedWebsites(workspace)}>
        <Ga4Provider>
          <ToastProvider>
            <LucideProvider size={20} strokeWidth={1.7}>
              <Shell />
            </LucideProvider>
          </ToastProvider>
        </Ga4Provider>
      </WorkspaceProvider>
    </I18nProvider>
  )
}

function Shell() {
  const { ws } = useWorkspace()
  const { t } = useI18n()
  const hash = useHash()
  const [theme, toggleTheme] = useTheme()
  const now = useMockNow(ws.now)
  const minuteKey = Math.floor(now.getTime() / 60_000)
  // Recompute once a minute (or when the data changes): countdowns and "x min ago" only change that often.
  const model = useMemo(() => selectOverview(ws, new Date(minuteKey * 60_000), t), [ws, minuteKey, t])

  const route = matchRoute(hash)
  const routeId = route.id
  const page = t.routes[routeId]

  const openContact = routeId === 'inbox' ? ws.conversations.find((c) => c.id === hash.split('/')[2])?.contact.name : undefined

  useEffect(() => {
    document.title = t.shell.documentTitle(page.label, openContact)
  }, [t, page, openContact])

  const tabs: NavItem[] = tabRoutes.map((r) => ({
    id: r.id,
    label: t.routes[r.id].label,
    href: r.path,
    badge: r.path === '#/inbox' ? model.badges.inbox : r.path === '#/approvals' ? model.badges.approvals : undefined,
  }))

  return (
    <>
      <Mesh />
      <AppFrame>
        <TopBar tabs={tabs} activeTab={routeId} user={model.user} unreadNotifications={model.badges.notifications} />
        <main id="main" className="relative">
          {routeId === 'overview' ? (
            <Overview model={model} now={now} />
          ) : routeId === 'calendar' ? (
            <Calendar now={now} />
          ) : routeId === 'inbox' ? (
            <Inbox now={now} hash={hash} />
          ) : routeId === 'analytics' ? (
            <Analytics now={now} hash={hash} />
          ) : (
            <Card title={page.title} className="max-w-3xl">
              <p className="text-sm text-muted">
                {t.shell.notRecreated(
                  ['#/overview', '#/calendar', '#/inbox', '#/analytics'].map((r) => (
                    <code key={r} className="font-semibold text-text">
                      {r}
                    </code>
                  )),
                )}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {page.sections.map((s) => (
                  <li key={s} className="rounded-full border border-line bg-glass-2 px-3 py-1.5 text-2xs font-semibold">
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </main>
      </AppFrame>
      <Dock route={routeId} theme={theme} onToggleTheme={toggleTheme} channelsNeedAttention={model.badges.channelsNeedAttention} />
      <MobileNav
        route={routeId}
        theme={theme}
        onToggleTheme={toggleTheme}
        inboxUnread={model.badges.inbox}
        approvals={model.badges.approvals}
      />
    </>
  )
}
