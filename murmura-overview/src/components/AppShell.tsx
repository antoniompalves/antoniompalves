import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Clock,
  Image,
  Inbox,
  LayoutGrid,
  Layers,
  Link,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Waves,
} from 'lucide-react'
import type { NavItem, TeamMember } from '../data/types'
import { Avatar, cn } from './ui'

/* ───────────────────────── background ───────────────────────── */

/** Three blurred radial blobs fixed behind the app (".mesh" in the reference). */
export function Mesh() {
  const blob = 'absolute rounded-full opacity-95 blur-[60px]'
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <i
        className={cn(blob, 'left-[-18vmax] top-[-24vmax] size-[62vmax]')}
        style={{ background: 'radial-gradient(closest-side, var(--mesh-a), transparent)', transform: 'translate3d(55px, 37px, 0) scale(1.074)' }}
      />
      <i
        className={cn(blob, 'bottom-[-30vmax] right-[-24vmax] size-[70vmax]')}
        style={{ background: 'radial-gradient(closest-side, var(--mesh-b), transparent)', transform: 'translate3d(-39px, -47px, 0) scale(0.953)' }}
      />
      <i
        className={cn(blob, 'right-[8vmax] top-[-16vmax] size-[46vmax]')}
        style={{ background: 'radial-gradient(closest-side, var(--mesh-c), transparent)', transform: 'translate3d(10px, 13px, 0) scale(1.026)' }}
      />
    </div>
  )
}

/* ───────────────────────── top bar ───────────────────────── */

interface TopBarProps {
  tabs: NavItem[]
  activeTab: string
  user: TeamMember
  unreadNotifications: number
}

export function TopBar({ tabs, activeTab, user, unreadNotifications }: TopBarProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)

  // The ink pill slides between tabs instead of each tab owning a background.
  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () => {
      const el = track.querySelector<HTMLElement>('[aria-current="page"]')
      setPill(el ? { left: el.offsetLeft, width: el.offsetWidth } : null)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [activeTab])

  return (
    <header className="mb-[26px] grid grid-cols-[auto_1fr] items-center gap-5 max-mobile:mb-[18px] max-mobile:gap-x-3 max-mobile:gap-y-2.5 wide:grid-cols-[auto_1fr_auto]">
      <a
        href="#/overview"
        aria-label="Murmura — overview"
        className="inline-flex items-center gap-3 text-[26px] font-bold tracking-[-0.02em] max-mobile:gap-2.5 max-mobile:text-[23px]"
      >
        <span className="grid size-12 place-items-center rounded-[15px] bg-pill text-on-pill max-mobile:size-11 max-mobile:rounded-[13px]">
          <Waves size={28} strokeWidth={2.1} aria-hidden />
        </span>
        <span className="max-[480px]:hidden">murmura</span>
      </a>

      <nav
        aria-label="Main"
        className="col-span-full row-start-2 min-w-0 max-w-full justify-self-start overflow-x-auto rounded-full [scrollbar-width:none] max-mobile:-mx-3.5 max-mobile:w-[calc(100%+28px)] max-mobile:max-w-none max-mobile:rounded-none max-mobile:px-2.5 wide:col-span-1 wide:col-start-2 wide:row-start-1 wide:justify-self-center"
      >
        <div ref={trackRef} className="relative flex w-max gap-0.5 p-1">
          <span
            aria-hidden
            className="absolute bottom-1 top-1 rounded-full bg-pill transition-[left,width,opacity] duration-500 ease-soft"
            style={{ left: pill?.left ?? 0, width: pill?.width ?? 0, opacity: pill ? 1 : 0 }}
          />
          {tabs.map((t) => {
            const current = t.id === activeTab
            return (
              <a
                key={t.id}
                href={t.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'relative z-10 inline-flex items-center gap-[7px] whitespace-nowrap rounded-full px-[17px] py-[11px] text-sm font-semibold transition-colors duration-300',
                  current ? 'text-on-pill' : 'text-text hover:bg-well',
                )}
              >
                {t.label}
                {t.badge ? (
                  <span className="inline-grid h-[21px] min-w-[21px] place-items-center rounded-full bg-butter px-1.5 text-[12.5px] font-bold text-[#16191d]">
                    {t.badge}
                  </span>
                ) : null}
              </a>
            )
          })}
        </div>
      </nav>

      <div className="col-start-2 row-start-1 flex items-center gap-2.5 justify-self-end wide:col-start-3">
        <button
          type="button"
          aria-label="Brand: all brands"
          aria-haspopup="menu"
          className="inline-flex h-[46px] max-w-60 cursor-pointer items-center gap-[9px] rounded-full border border-rim bg-glass-2 pl-1.5 pr-3.5 text-sm font-semibold max-mobile:w-[46px] max-mobile:justify-center max-mobile:p-0"
        >
          <span className="grid size-[34px] place-items-center rounded-full bg-pill text-on-pill">
            <Layers size={17} aria-hidden />
          </span>
          <span className="truncate max-mobile:hidden">All brands</span>
          <ChevronDown size={16} className="text-muted max-mobile:hidden" aria-hidden />
        </button>

        <button
          type="button"
          aria-label={`Notifications, ${unreadNotifications} unread`}
          title="Notifications"
          className="relative inline-grid size-[46px] cursor-pointer place-items-center rounded-full border border-rim bg-glass-2 hover:bg-glass-3"
        >
          <Bell size={20} aria-hidden />
          {unreadNotifications > 0 && (
            <span className="absolute right-2.5 top-[9px] size-[9px] rounded-full bg-coral shadow-[0_0_0_2px_var(--bg)]" />
          )}
        </button>

        <button
          type="button"
          aria-label={`Account: ${user.name}, ${user.role}`}
          className="inline-flex h-12 cursor-pointer items-center gap-2.5 rounded-full border border-rim bg-glass-2 p-0.5"
        >
          <Avatar src={user.avatar} name={user.name} size="lg" />
          <span className="hidden pr-3.5 text-left leading-[1.15] min-[1500px]:block">
            <b className="block text-xs font-bold">{user.name}</b>
            <small className="block text-[12.5px] text-muted">{user.role}</small>
          </span>
        </button>
      </div>
    </header>
  )
}

/* ───────────────────────── dock ───────────────────────── */

interface DockEntry {
  id: string
  label: string
  /** Tooltip text when it differs from the accessible label. */
  tip?: string
  icon: LucideIcon
  href?: string
  kbd?: string
  dot?: boolean
  primary?: boolean
  onClick?: () => void
}

function DockButton({ entry, current }: { entry: DockEntry; current: boolean }) {
  const Icon = entry.icon
  const cls = cn(
    'group relative grid size-[52px] place-items-center rounded-full transition-[opacity,background-color] duration-150 [@media(height<=820px)]:size-12',
    entry.primary
      ? 'bg-butter text-[#16191d] hover:bg-[#f5c562] focus-visible:bg-[#f5c562]'
      : 'opacity-74 hover:bg-white/12 hover:opacity-100 focus-visible:bg-white/12 focus-visible:opacity-100 focus-visible:outline-on-dock',
    current && 'bg-white/12 opacity-100',
  )
  const body = (
    <>
      <Icon size={22} aria-hidden />
      {entry.dot && <span className="absolute right-[9px] top-[9px] size-2 rounded-full bg-coral shadow-[0_0_0_2px_var(--dock)]" />}
      {current && <span className="absolute right-[3px] top-1/2 -mt-[2.5px] size-[5px] rounded-full bg-butter" />}
      <span className="pointer-events-none absolute inset-y-0 left-[calc(100%+14px)] my-auto h-fit whitespace-nowrap rounded-[10px] bg-float px-[11px] py-[7px] text-2xs font-semibold text-text opacity-0 shadow-pop transition-opacity duration-200 ease-soft group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:hidden">
        {entry.tip ?? entry.label}
        {entry.kbd && <kbd className="ml-1 font-[inherit] text-muted">{entry.kbd}</kbd>}
      </span>
    </>
  )
  return entry.href ? (
    <a href={entry.href} aria-label={entry.label} aria-current={current ? 'page' : undefined} className={cls}>
      {body}
    </a>
  ) : (
    <button type="button" aria-label={entry.label} onClick={entry.onClick} className={cls}>
      {body}
    </button>
  )
}

interface DockProps {
  route: string
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  channelsNeedAttention: boolean
}

export function Dock({ route, theme, onToggleTheme, channelsNeedAttention }: DockProps) {
  const top: DockEntry[] = [
    { id: 'search', label: 'Search', kbd: '⌘K', icon: Search },
    { id: 'new', label: 'Create', kbd: 'N', icon: Plus, primary: true },
    { id: 'today', label: 'Today’s queue', icon: Clock },
    { id: 'library', label: 'Library', icon: Image, href: '#/library' },
  ]
  const bottom: DockEntry[] = [
    { id: 'channels', label: 'Channels', icon: Link, href: '#/channels', dot: channelsNeedAttention },
    { id: 'team', label: 'Team & roles', icon: ShieldCheck, href: '#/team' },
    { id: 'settings', label: 'Settings', icon: Settings, href: '#/settings' },
    {
      id: 'theme',
      label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
      tip: 'Theme',
      icon: theme === 'dark' ? Sun : Moon,
      onClick: onToggleTheme,
    },
  ]
  return (
    <nav
      aria-label="Quick actions"
      className="fixed inset-y-0 left-[var(--dock-x)] z-30 my-auto flex h-fit flex-col gap-1 rounded-full bg-dock p-2 text-on-dock shadow-[0_20px_40px_-18px_rgb(0_0_0/0.45)] max-mobile:hidden dark:border dark:border-line"
    >
      {top.map((e) => (
        <DockButton key={e.id} entry={e} current={route === e.id} />
      ))}
      <span aria-hidden className="mx-2.5 my-1 h-px bg-white/14" />
      {bottom.map((e) => (
        <DockButton key={e.id} entry={e} current={route === e.id} />
      ))}
    </nav>
  )
}

/** Below 761px the dock collapses into a bottom bar, as in the reference. */
export function MobileNav({ route, onToggleTheme, theme }: { route: string; onToggleTheme: () => void; theme: 'light' | 'dark' }) {
  const items: { id: string; label: string; icon: LucideIcon; href?: string }[] = [
    { id: 'overview', label: 'Home', icon: LayoutGrid, href: '#/overview' },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays, href: '#/calendar' },
    { id: 'new', label: 'Create', icon: Plus },
    { id: 'inbox', label: 'Inbox', icon: Inbox, href: '#/inbox' },
  ]
  const item = 'flex flex-col items-center justify-center gap-1 text-[11.5px] font-semibold'
  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-30 grid h-[calc(64px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-line bg-float/92 px-1.5 pb-[env(safe-area-inset-bottom)] backdrop-blur-[16px] backdrop-saturate-150 mobile:hidden"
    >
      {items.map(({ id, label, icon: Icon, href }) =>
        id === 'new' ? (
          <button key={id} type="button" aria-label={label} className="grid place-items-center">
            <span className="grid size-11 place-items-center rounded-full bg-butter text-[#16191d]">
              <Icon size={22} aria-hidden />
            </span>
          </button>
        ) : (
          <a key={id} href={href} className={cn(item, route === id ? 'text-text' : 'text-muted')} aria-current={route === id ? 'page' : undefined}>
            <Icon size={21} aria-hidden />
            {label}
          </a>
        ),
      )}
      <button type="button" onClick={onToggleTheme} className={cn(item, 'text-muted')}>
        {theme === 'dark' ? <Sun size={21} aria-hidden /> : <Moon size={21} aria-hidden />}
        Theme
      </button>
    </nav>
  )
}

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-clip pb-12 pl-[calc(var(--dock-x)+var(--dock-w)+var(--gutter))] pr-[var(--gutter)] pt-[22px] max-mobile:px-3.5 max-mobile:pb-[100px] max-mobile:pt-3.5">
      {children}
    </div>
  )
}
