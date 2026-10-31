import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  ChartNoAxesColumn,
  Clock,
  Ear,
  House,
  Image,
  Inbox,
  Languages,
  LayoutGrid,
  Link,
  Moon,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react'
import type { RouteId } from '../data/routes'
import { roleName } from '../data/permissions'
import { useWorkspace } from '../data/store'
import type { NavItem, TeamMember } from '../data/types'
import { LOCALES, useI18n } from '../i18n'
import { KataruMark } from './Logo'
import { ConfirmDialog } from './Modal'
import { MenuDivider, MenuItem, Popover } from './Popover'
import { BrandSwitcher, CreateMenu, Notifications, TodayPopover } from './shell/Menus'
import { useToast } from './Toast'
import { Avatar, IconButton, cn } from './ui'

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
  now: Date
}

export function TopBar({ tabs, activeTab, user, now }: TopBarProps) {
  const { t } = useI18n()
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
      {/* On wide screens the brand keeps the reference's 165px so the centred tab bar stays where it was measured. */}
      <a
        href="#/overview"
        aria-label={t.shell.home}
        className="inline-flex items-center gap-3 text-[26px] font-bold tracking-[-0.02em] max-mobile:gap-2.5 max-mobile:text-[23px] wide:min-w-[165px]"
      >
        <span className="grid size-12 place-items-center rounded-[15px] bg-pill text-on-pill max-mobile:size-11 max-mobile:rounded-[13px]">
          <KataruMark />
        </span>
        <span className="max-[359px]:hidden">kataru</span>
      </a>

      <nav
        aria-label={t.shell.mainNav}
        className="col-span-full row-start-2 min-w-0 max-w-full justify-self-start overflow-x-auto rounded-full [scrollbar-width:none] max-mobile:hidden wide:col-span-1 wide:col-start-2 wide:row-start-1 wide:justify-self-center"
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
        {/* Phones have no dock, so search moves up here (as in the reference). */}
        <button
          type="button"
          aria-label={t.shell.search}
          title={t.shell.search}
          className="inline-grid size-[46px] cursor-pointer place-items-center rounded-full border border-rim bg-glass-2 pointer-coarse:size-11 mobile:hidden"
        >
          <Search size={20} aria-hidden />
        </button>
        <BrandSwitcher />
        <Notifications now={now} />
        <AccountButton user={user} />
      </div>
    </header>
  )
}

/** Avatar button; its menu holds the account's preferences (the interface language) and resetting the demo. */
function AccountButton({ user }: { user: TeamMember }) {
  const { t, locale, setLocale } = useI18n()
  const [open, setOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const { ws, reset } = useWorkspace()
  const toast = useToast()
  const role = roleName(t, ws, user.role)
  const r = t.shell.reset
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={t.shell.account(user.name, role)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-12 cursor-pointer items-center gap-2.5 rounded-full border border-rim bg-glass-2 p-0.5"
      >
        <Avatar src={user.avatar} name={user.name} size="lg" />
        <span className="hidden pr-3.5 text-left leading-[1.15] min-[1500px]:block">
          <b className="block text-xs font-bold">{user.name}</b>
          <small className="block text-[12.5px] text-muted">{role}</small>
        </span>
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={ref} placement="bottom-end" label={t.shell.accountMenu}>
        <p className="px-3 pb-1 pt-2 text-[12.5px] font-bold uppercase tracking-[0.06em] text-muted" id="account-language">
          {t.shell.language}
        </p>
        <div role="menu" aria-label={t.shell.accountMenu}>
          <div role="group" aria-labelledby="account-language">
            {LOCALES.map((l) => (
              <MenuItem
                key={l.id}
                icon={Languages}
                lang={l.id}
                checked={locale === l.id}
                onClick={() => {
                  setLocale(l.id)
                  setOpen(false)
                }}
              >
                {l.name}
              </MenuItem>
            ))}
          </div>
          <MenuDivider />
          <MenuItem
            icon={RefreshCw}
            onClick={() => {
              setOpen(false)
              setResetting(true)
            }}
          >
            {r.item}
          </MenuItem>
        </div>
      </Popover>
      <ConfirmDialog
        open={resetting}
        title={r.title}
        text={r.text}
        confirm={r.confirm}
        cancel={r.cancel}
        onClose={() => setResetting(false)}
        onConfirm={() => {
          setResetting(false)
          reset()
          toast({ text: r.done, icon: RefreshCw })
        }}
      />
    </>
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

function DockButton({ entry, current, buttonRef, expanded }: { entry: DockEntry; current: boolean; buttonRef?: RefObject<HTMLButtonElement | null>; expanded?: boolean }) {
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
    <button
      ref={buttonRef}
      type="button"
      aria-label={entry.label}
      aria-haspopup={expanded === undefined ? undefined : entry.id === 'new' ? 'menu' : 'dialog'}
      aria-expanded={expanded}
      onClick={entry.onClick}
      className={cls}
    >
      {body}
    </button>
  )
}

interface DockProps {
  route: string
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  channelsNeedAttention: boolean
  now: Date
  onOpenPost: (id: string) => void
}

export function Dock({ route, theme, onToggleTheme, channelsNeedAttention, now, onOpenPost }: DockProps) {
  const { t } = useI18n()
  const [menu, setMenu] = useState<'new' | 'today' | null>(null)
  const newRef = useRef<HTMLButtonElement>(null)
  const todayRef = useRef<HTMLButtonElement>(null)
  const toggle = (id: 'new' | 'today') => setMenu((m) => (m === id ? null : id))
  const top: DockEntry[] = [
    { id: 'search', label: t.shell.search, kbd: '⌘K', icon: Search },
    { id: 'new', label: t.shell.create, kbd: 'N', icon: Plus, primary: true, onClick: () => toggle('new') },
    { id: 'today', label: t.shell.todaysQueue, icon: Clock, onClick: () => toggle('today') },
    { id: 'library', label: t.routes.library.label, icon: Image, href: '#/library' },
  ]
  const bottom: DockEntry[] = [
    { id: 'channels', label: t.routes.channels.label, icon: Link, href: '#/channels', dot: channelsNeedAttention },
    { id: 'team', label: t.routes.team.label, icon: ShieldCheck, href: '#/team' },
    { id: 'settings', label: t.routes.settings.label, icon: Settings, href: '#/settings' },
    {
      id: 'theme',
      label: theme === 'dark' ? t.shell.toLight : t.shell.toDark,
      tip: t.shell.theme,
      icon: theme === 'dark' ? Sun : Moon,
      onClick: onToggleTheme,
    },
  ]
  return (
    <nav
      aria-label={t.shell.dock}
      className="fixed inset-y-0 left-[var(--dock-x)] z-30 my-auto flex h-fit flex-col gap-1 rounded-full bg-dock p-2 text-on-dock shadow-[0_20px_40px_-18px_rgb(0_0_0/0.45)] max-mobile:hidden dark:border dark:border-line"
    >
      {top.map((e) => (
        <DockButton
          key={e.id}
          entry={e}
          current={route === e.id}
          buttonRef={e.id === 'new' ? newRef : e.id === 'today' ? todayRef : undefined}
          expanded={e.id === 'new' || e.id === 'today' ? menu === e.id : undefined}
        />
      ))}
      <span aria-hidden className="mx-2.5 my-1 h-px bg-white/14" />
      {bottom.map((e) => (
        <DockButton key={e.id} entry={e} current={route === e.id} />
      ))}
      <CreateMenu anchor={newRef} open={menu === 'new'} onClose={() => setMenu(null)} now={now} />
      <TodayPopover anchor={todayRef} open={menu === 'today'} onClose={() => setMenu(null)} onOpenPost={onOpenPost} now={now} />
    </nav>
  )
}

interface MobileNavProps {
  route: string
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  inboxUnread: number
  approvals: number
  now: Date
  onOpenPost: (id: string) => void
}

/** Pages reached from the "More" sheet on phones, in the reference's order. */
const MORE_PAGES: { id: RouteId; icon: LucideIcon }[] = [
  { id: 'compose', icon: PenLine },
  { id: 'approvals', icon: ShieldCheck },
  { id: 'analytics', icon: ChartNoAxesColumn },
  { id: 'listening', icon: Ear },
  { id: 'library', icon: Image },
  { id: 'channels', icon: Link },
  { id: 'team', icon: Users },
  { id: 'settings', icon: Settings },
]

/** Below 761px the dock collapses into a bottom bar, as in the reference: four destinations plus "More". */
export function MobileNav({ route, theme, onToggleTheme, inboxUnread, approvals, now, onOpenPost }: MobileNavProps) {
  const { t } = useI18n()
  const [sheet, setSheet] = useState(false)
  const [menu, setMenu] = useState<'new' | 'today' | null>(null)
  const newRef = useRef<HTMLButtonElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const items: { id: string; label: string; icon: LucideIcon; href: string; count?: number }[] = [
    { id: 'overview', label: t.shell.mobileHome, icon: House, href: '#/overview' },
    { id: 'calendar', label: t.routes.calendar.label, icon: CalendarDays, href: '#/calendar' },
    { id: 'inbox', label: t.shell.mobileInbox, icon: Inbox, href: '#/inbox', count: inboxUnread },
  ]
  const onMore = MORE_PAGES.some((p) => p.id === route)
  const item = (current: boolean) =>
    cn(
      'relative flex flex-col items-center justify-center gap-[3px] text-[11.5px] font-semibold',
      current ? 'text-text before:absolute before:left-1/2 before:top-0 before:h-[3px] before:w-[26px] before:-translate-x-1/2 before:rounded-b-full before:bg-text' : 'text-muted',
    )
  const link = ({ id, label, icon: Icon, href, count }: (typeof items)[number]) => (
    <a key={id} href={href} className={item(route === id)} aria-current={route === id ? 'page' : undefined}>
      <Icon size={23} aria-hidden />
      {label}
      {count ? (
        <b className="absolute left-[calc(50%+6px)] top-[5px] grid h-[18px] min-w-5 place-items-center rounded-full bg-coral px-[5px] text-[11px] font-bold text-on-coral shadow-[0_0_0_2px_var(--float)]">
          {count}
        </b>
      ) : null}
    </a>
  )
  return (
    <>
      <nav
        aria-label={t.shell.mobileNav}
        className="fixed inset-x-0 bottom-0 z-30 grid h-[calc(64px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-line bg-float/92 px-1.5 pb-[env(safe-area-inset-bottom)] backdrop-blur-[16px] backdrop-saturate-150 mobile:hidden"
      >
        {link(items[0])}
        {link(items[1])}
        <button
          ref={newRef}
          type="button"
          aria-label={t.shell.create}
          aria-haspopup="menu"
          aria-expanded={menu === 'new'}
          onClick={() => setMenu((m) => (m === 'new' ? null : 'new'))}
          className={cn(item(false), 'gap-0.5')}
        >
          <span className="grid h-8 w-11 place-items-center rounded-xl bg-butter text-[#16191d]">
            <Plus size={21} aria-hidden />
          </span>
          {t.shell.create}
        </button>
        {link(items[2])}
        <button ref={moreRef} type="button" aria-haspopup="dialog" aria-expanded={sheet} onClick={() => setSheet(true)} className={item(onMore)}>
          <LayoutGrid size={23} aria-hidden />
          {t.shell.more}
        </button>
      </nav>
      <MoreSheet
        open={sheet}
        onClose={() => setSheet(false)}
        route={route}
        theme={theme}
        onToggleTheme={onToggleTheme}
        approvals={approvals}
        onToday={() => {
          setSheet(false)
          // After the sheet has slid away, as in the reference.
          window.setTimeout(() => setMenu('today'), 260)
        }}
      />
      <CreateMenu anchor={newRef} open={menu === 'new'} onClose={() => setMenu(null)} now={now} />
      <TodayPopover anchor={moreRef} open={menu === 'today'} onClose={() => setMenu(null)} onOpenPost={onOpenPost} now={now} />
    </>
  )
}

interface SheetTileProps {
  href: string
  icon: LucideIcon
  label: string
  count: number
  current: boolean
  onClick: () => void
}

/**
 * One page in the More sheet. A count sits after the label, as in the
 * reference; when the label is too long for that (e.g. "Aprovações"), the
 * count moves onto the icon's corner instead of squeezing the word.
 */
function SheetTile({ href, icon: Icon, label, count, current, onClick }: SheetTileProps) {
  const labelRef = useRef<HTMLSpanElement>(null)
  const [corner, setCorner] = useState(false)

  // Measured once the sheet is on screen (the observer fires when the label gets a size).
  // English "Approvals" overhangs its box by a few pixels, as in the reference; only a
  // label that would run into the count moves it.
  useLayoutEffect(() => {
    const el = labelRef.current
    if (!el || !count || corner) return
    const check = () => {
      if (el.clientWidth && el.scrollWidth - el.clientWidth > 12) setCorner(true)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [count, corner])

  const badge = 'inline-grid shrink-0 place-items-center rounded-full bg-butter font-bold text-[#16191d]'
  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'flex h-[58px] min-w-0 items-center gap-3 rounded-[18px] border px-3 py-2.5 text-sm font-semibold',
        current ? 'border-transparent bg-pill text-on-pill' : 'border-line bg-glass-2',
      )}
    >
      <span className={cn('relative grid size-9 shrink-0 place-items-center rounded-xl', current ? 'bg-white/14 dark:bg-black/10' : 'bg-well')}>
        <Icon size={20} aria-hidden />
        {count > 0 && corner && (
          <b className={cn(badge, 'absolute -right-2 -top-2 h-[19px] min-w-[19px] px-1 text-[11px] shadow-[0_0_0_2px_var(--solid)]')}>{count}</b>
        )}
      </span>
      <span ref={labelRef} className={cn('min-w-0 leading-[1.2] [overflow-wrap:normal]', count > 0 && !corner && 'whitespace-nowrap')}>
        {label}
      </span>
      {count > 0 && !corner && <b className={cn(badge, 'ml-auto h-[21px] min-w-[21px] px-1.5 text-[12.5px]')}>{count}</b>}
    </a>
  )
}

/** Bottom sheet behind "More" (".msheet" in a ".drawer"): every other page, then search, today and the theme. */
interface MoreSheetProps extends Pick<MobileNavProps, 'route' | 'theme' | 'onToggleTheme' | 'approvals'> {
  open: boolean
  onClose: () => void
  onToday: () => void
}

function MoreSheet({ open, onClose, route, theme, onToggleTheme, approvals, onToday }: MoreSheetProps) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const ghost = 'inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-line-2 bg-glass px-2.5 text-sm font-semibold'
  return (
    <dialog
      ref={ref}
      aria-label={t.shell.more}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-auto overscroll-contain rounded-t-[28px] border border-b-0 border-rim bg-solid p-0 text-text shadow-pop backdrop:bg-[rgb(16_18_20/0.26)] backdrop:backdrop-blur-[6px] open:animate-sheet dark:backdrop:bg-black/60"
    >
      <span aria-hidden className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-line-2" />
      <div className="relative grid gap-[18px] px-[18px] pb-[calc(22px+env(safe-area-inset-bottom))] pt-[41px]">
        <span className="absolute right-[18px] top-4">
          <IconButton label={t.common.close} icon={X} onClick={onClose} size="lg" />
        </span>
        <h2 className="pr-[52px] text-[23px] font-bold leading-[1.4] tracking-[-0.02em]">{t.shell.more}</h2>
        <nav aria-label={t.shell.morePages} className="grid grid-cols-2 gap-2">
          {MORE_PAGES.map(({ id, icon }) => (
            <SheetTile
              key={`${id}-${t.routes[id].label}`}
              href={`#/${id}`}
              icon={icon}
              label={t.routes[id].label}
              count={id === 'approvals' ? approvals : 0}
              current={route === id}
              onClick={onClose}
            />
          ))}
        </nav>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className={ghost}>
            <Search size={18} aria-hidden />
            {t.shell.search}
          </button>
          <button type="button" onClick={onToday} className={ghost}>
            <Clock size={18} aria-hidden />
            {t.common.today}
          </button>
          <button type="button" onClick={onToggleTheme} className={ghost}>
            {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
            {theme === 'dark' ? t.shell.light : t.shell.dark}
          </button>
        </div>
      </div>
    </dialog>
  )
}

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-clip pb-12 pl-[calc(var(--dock-x)+var(--dock-w)+var(--gutter))] pr-[var(--gutter)] pt-[22px] max-mobile:px-3.5 max-mobile:pb-[92px] max-mobile:pt-3.5">
      {children}
    </div>
  )
}
