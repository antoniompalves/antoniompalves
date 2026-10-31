import { useEffect, useMemo, useState } from 'react'
import { LucideProvider } from 'lucide-react'
import { AppFrame, Dock, Mesh, MobileNav, TopBar } from './components/AppShell'
import { Card } from './components/ui'
import { ShortcutsDrawer } from './components/Drawer'
import type { ThemePref } from './components/shell/Account'
import { Finder } from './components/shell/Finder'
import { SignIn } from './components/shell/SignIn'
import { ToastProvider } from './components/Toast'
import { PostDrawer } from './components/calendar/PostDrawer'
import { usePostActions } from './components/usePostActions'
import { I18nProvider, useI18n } from './i18n'
import { workspace } from './data/mock'
import { loadSetting, saveSetting } from './storage'
import { matchRoute, tabRoutes } from './data/routes'
import type { RouteId } from './data/routes'
import { selectOverview } from './data/selectors'
import { WorkspaceProvider, useWorkspace } from './data/store'
import type { ClockOrigin } from './data/store'
import { Ga4Provider, withSavedWebsites } from './data/ga4Store'
import type { NavItem } from './data/types'
import { Analytics } from './pages/Analytics'
import { Approvals } from './pages/Approvals'
import { Calendar } from './pages/Calendar'
import { Channels } from './pages/Channels'
import { Compose } from './pages/Compose'
import { Inbox } from './pages/Inbox'
import { Listening } from './pages/Listening'
import { Overview } from './pages/Overview'

type Theme = 'light' | 'dark'

/** Pages behind "G then …", as in the reference. */
const GO: Record<string, RouteId> = { o: 'overview', c: 'compose', l: 'calendar', i: 'inbox', a: 'analytics', n: 'listening', s: 'settings', p: 'approvals', t: 'team' }

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash || '#/overview')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/overview')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

/** Light, dark or the system's; the dock's toggle sets the opposite of what shows. */
function useTheme() {
  const [pref, setPref] = useState<ThemePref>(() => (loadSetting('theme') as ThemePref) || 'light')
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setSystemDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const theme: Theme = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => saveSetting('theme', pref), [pref])
  return { theme, pref, setPref, toggle: () => setPref(theme === 'dark' ? 'light' : 'dark') }
}

/** Mock "now": the workspace clock, ticking along with real time in whole seconds. */
function useMockNow(origin: ClockOrigin) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 15_000)
    return () => clearInterval(id)
  }, [])
  return new Date(origin.mock + Math.floor((Date.now() - origin.real) / 1000) * 1000)
}

export default function App() {
  return (
    <I18nProvider>
      <WorkspaceProvider seed={workspace} withSettings={withSavedWebsites}>
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
  const { ws, all, clock } = useWorkspace()
  const { t } = useI18n()
  const hash = useHash()
  const { theme, pref, setPref, toggle: toggleTheme } = useTheme()
  const [finder, setFinder] = useState(false)
  const [shortcuts, setShortcuts] = useState(false)

  // ⌘K / Ctrl+K anywhere; elsewhere single keys, not while typing or with a dialog open, and not when a page already used the key.
  useEffect(() => {
    if (!ws.signedIn) return
    let g = 0
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setFinder((v) => !v)
        return
      }
      const typing = (e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]')
      if (e.defaultPrevented || typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return
      const k = e.key.toLowerCase()
      if (g && Date.now() - g < 1200 && GO[k]) {
        window.location.hash = `#/${GO[k]}`
        g = 0
        return
      }
      g = 0
      if (k === 'g') g = Date.now()
      else if (e.key === '/') {
        e.preventDefault()
        setFinder(true)
      } else if (k === 'n') {
        e.preventDefault()
        window.location.hash = '#/compose'
      } else if (e.key === '?') setShortcuts(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ws.signedIn])
  const now = useMockNow(clock)
  const minuteKey = Math.floor(now.getTime() / 60_000)
  // Recompute once a minute (or when the data changes): countdowns and "x min ago" only change that often.
  const model = useMemo(() => selectOverview(ws, new Date(minuteKey * 60_000), t, all.brands), [ws, all.brands, minuteKey, t])

  // Posts opened from the shell (Today's queue, search) show in the same drawer as on the calendar.
  const [openPost, setOpenPost] = useState<string | null>(null)

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

  if (!ws.signedIn)
    return (
      <>
        <Mesh />
        <SignIn />
      </>
    )

  return (
    <>
      <Mesh />
      <AppFrame>
        <TopBar tabs={tabs} activeTab={routeId} user={model.user} now={now} theme={pref} onTheme={setPref} onSearch={() => setFinder(true)} onShortcuts={() => setShortcuts(true)} />
        <main id="main" className="relative">
          {routeId === 'overview' ? (
            <Overview model={model} now={now} />
          ) : routeId === 'calendar' ? (
            <Calendar now={now} />
          ) : routeId === 'inbox' ? (
            <Inbox now={now} hash={hash} />
          ) : routeId === 'analytics' ? (
            <Analytics now={now} hash={hash} />
          ) : routeId === 'approvals' ? (
            <Approvals now={now} />
          ) : routeId === 'compose' ? (
            <Compose now={now} hash={hash} />
          ) : routeId === 'listening' ? (
            <Listening now={now} />
          ) : routeId === 'channels' ? (
            <Channels now={now} hash={hash} />
          ) : (
            <Card title={page.title} className="max-w-3xl">
              <p className="text-sm text-muted">
                {t.shell.notRecreated(
                  ['#/overview', '#/compose', '#/calendar', '#/inbox', '#/approvals', '#/analytics', '#/listening', '#/channels'].map((r) => (
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
      <Dock route={routeId} theme={theme} onToggleTheme={toggleTheme} channelsNeedAttention={model.badges.channelsNeedAttention} now={now} onOpenPost={setOpenPost} onSearch={() => setFinder(true)} />
      <MobileNav
        route={routeId}
        theme={theme}
        onToggleTheme={toggleTheme}
        inboxUnread={model.badges.inbox}
        approvals={model.badges.approvals}
        now={now}
        onOpenPost={setOpenPost}
        onSearch={() => setFinder(true)}
      />
      <PostDrawerHost id={openPost} now={now} onClose={() => setOpenPost(null)} />
      <Finder open={finder} onClose={() => setFinder(false)} onOpenPost={setOpenPost} />
      <ShortcutsDrawer open={shortcuts} onClose={() => setShortcuts(false)} />
    </>
  )
}

/** The post drawer for posts opened outside a page. */
function PostDrawerHost({ id, now, onClose }: { id: string | null; now: Date; onClose: () => void }) {
  const { ws } = useWorkspace()
  const { publish, duplicate, remove } = usePostActions(now, onClose)
  const post = id ? (ws.posts.find((p) => p.id === id) ?? null) : null
  return (
    <PostDrawer
      post={post}
      brand={post ? ws.brands.find((b) => b.id === post.brandId) : undefined}
      author={post ? ws.team.find((m) => m.id === post.authorId) : undefined}
      now={now}
      onClose={onClose}
      onPublish={publish}
      onDuplicate={duplicate}
      onDelete={remove}
    />
  )
}
