import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Bell, CalendarDays, CalendarPlus, ChevronDown, Inbox, Layers, Link, PenLine, Plus, ShieldCheck, TrendingUp, Unlink, UserPlus } from 'lucide-react'
import { MenuDivider, MenuItem, Popover } from '../Popover'
import { useToast } from '../Toast'
import { BrandMark, Button, NetStack, PostStatusPill } from '../ui'
import { can } from '../../data/permissions'
import { noticesFor } from '../../data/notices'
import { brandsFor } from '../../data/scope'
import { NETWORK_LABEL } from '../../data/selectors'
import { useWorkspace } from '../../data/store'
import { useI18n } from '../../i18n'

const DAY = 86_400_000

/** "All brands" or the picked brand: everything brand-related follows it (scope.ts). */
export function BrandSwitcher() {
  const { t } = useI18n()
  const { all, dispatch } = useWorkspace()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const mine = brandsFor(all)
  const picked = all.brands.find((b) => b.id === all.brandScope) ?? null

  const pick = (id: string | null) => {
    setOpen(false)
    if (id === all.brandScope) return
    dispatch({ type: 'scope', brandId: id })
    toast({ text: id ? t.shell.showing(all.brands.find((b) => b.id === id)?.name ?? '') : t.shell.showingAll, icon: Layers })
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={t.shell.brandSwitcher(picked?.name ?? null)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-[46px] max-w-60 cursor-pointer items-center gap-[9px] rounded-full border border-rim bg-glass-2 pl-1.5 pr-3.5 text-sm font-semibold max-mobile:w-[46px] max-mobile:justify-center max-mobile:p-0"
      >
        {picked ? (
          <BrandMark brand={picked} size="md" />
        ) : (
          <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-pill text-on-pill">
            <Layers size={17} aria-hidden />
          </span>
        )}
        <span className="truncate max-mobile:hidden">{picked?.name ?? t.shell.allBrands}</span>
        <ChevronDown size={16} className="shrink-0 text-muted max-mobile:hidden" aria-hidden />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={ref} placement="bottom-end" label={t.shell.brandSwitcher(picked?.name ?? null)}>
        <div role="menu">
          <MenuItem icon={Layers} checked={!picked} onClick={() => pick(null)}>
            {mine.length === all.brands.length ? t.shell.allBrands : t.shell.allMyBrands}
          </MenuItem>
          <MenuDivider />
          {mine.map((b) => (
            <MenuItem key={b.id} lead={<BrandMark brand={b} size="xs" className="-my-[3px]" />} checked={picked?.id === b.id} onClick={() => pick(b.id)}>
              {b.name}
            </MenuItem>
          ))}
        </div>
      </Popover>
    </>
  )
}

const noticeIcon = (href: string): LucideIcon =>
  href.includes('approvals') ? ShieldCheck : href.includes('channels') ? Unlink : href.includes('analytics') ? TrendingUp : href.includes('inbox') ? Inbox : href.includes('calendar') ? CalendarDays : Bell

const popHead = 'flex items-center justify-between gap-2.5 px-2.5 pb-1.5 pt-2'
const popRow = 'flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-[9px] text-left outline-none hover:bg-well focus-visible:bg-well pointer-coarse:min-h-[46px] [@media(hover:none)]:hover:bg-transparent'
const popEmpty = 'px-4 py-9 text-center text-muted'

/** The bell: notifications for everyone and for me, newest first; opening one marks it read. */
export function Notifications({ now }: { now: Date }) {
  const { t } = useI18n()
  const { all, dispatch } = useWorkspace()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const list = noticesFor(all, all.currentUserId)
  const unread = list.filter((n) => !n.read)
  const n = t.notices
  const brand = (id: string) => all.brands.find((b) => b.id === id)?.name ?? ''
  const person = (id: string) => all.team.find((m) => m.id === id)?.name.split(' ')[0] ?? ''

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={unread.length ? t.shell.notificationsUnread(unread.length) : t.shell.notifications}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={t.shell.notifications}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-grid size-[46px] cursor-pointer place-items-center rounded-full border border-rim bg-glass-2 hover:bg-glass-3 pointer-coarse:size-11"
      >
        <Bell size={20} aria-hidden />
        {unread.length > 0 && <span className="absolute right-2.5 top-[9px] size-[9px] rounded-full bg-coral shadow-[0_0_0_2px_var(--bg)]" />}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchor={ref} placement="bottom-end" label={n.title} className="w-[360px]">
        <div className={popHead}>
          <span className="text-sm font-bold">{n.title}</span>
          <Button size="sm" variant="ghost" disabled={!unread.length} onClick={() => dispatch({ type: 'readNotices', ids: unread.map((x) => x.id) })}>
            {n.markAll}
          </Button>
        </div>
        {list.length ? (
          <div className="grid gap-0.5">
            {list.map((x) => {
              const Icon = noticeIcon(x.href)
              return (
                <a
                  key={x.id}
                  href={x.href}
                  onClick={() => {
                    if (!x.read) dispatch({ type: 'readNotices', ids: [x.id] })
                    setOpen(false)
                  }}
                  className={popRow}
                >
                  <span className="relative grid size-[34px] shrink-0 place-items-center rounded-full border border-line-2 pointer-coarse:size-11">
                    <Icon size={17} aria-hidden />
                    {!x.read && <span className="absolute -right-px -top-px size-[9px] rounded-full bg-coral shadow-[0_0_0_2px_var(--float)]" />}
                  </span>
                  <span className="min-w-0">
                    <b className="text-xs font-semibold">{n.text(x.event, brand, (id) => NETWORK_LABEL[id], person)}</b>
                    <small className="block text-2xs text-muted">{t.dates.ago(x.at, now)}</small>
                  </span>
                </a>
              )
            })}
          </div>
        ) : (
          <p className={popEmpty}>{n.empty}</p>
        )}
      </Popover>
    </>
  )
}

/** Today's queue: what goes out today (not drafts), with the calendar and a new post a click away. */
export function TodayPopover({ anchor, open, onClose, onOpenPost, now }: { anchor: RefObject<HTMLElement | null>; open: boolean; onClose: () => void; onOpenPost: (id: string) => void; now: Date }) {
  const { t } = useI18n()
  const { ws } = useWorkspace()
  const d = t.today
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const posts = ws.posts
    .filter((p) => p.status !== 'draft' && Date.parse(p.scheduledAt) >= start && Date.parse(p.scheduledAt) < start + DAY)
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))

  return (
    <Popover open={open} onClose={onClose} anchor={anchor} placement="bottom-start" label={t.shell.todaysQueue} className="w-[360px]">
      <div className={popHead}>
        <span className="text-sm font-bold">{d.title}</span>
        <span className="text-2xs text-muted">{d.date(now)}</span>
      </div>
      {posts.length ? (
        <div className="grid gap-0.5">
          {posts.map((p) => {
            const brand = ws.brands.find((b) => b.id === p.brandId)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onClose()
                  onOpenPost(p.id)
                }}
                className={popRow}
              >
                {brand && <BrandMark brand={brand} size="sm" />}
                <span className="min-w-0">
                  <b className="text-xs font-semibold">{p.text.length > 42 ? `${p.text.slice(0, 42)}…` : p.text}</b>
                  <small className="flex items-center gap-1 text-2xs text-muted">
                    {t.dates.time(new Date(p.scheduledAt))} · <NetStack networks={p.networks} />
                  </small>
                </span>
                <PostStatusPill status={p.status} size="md" />
              </button>
            )
          })}
        </div>
      ) : (
        <p className={popEmpty}>{d.empty}</p>
      )}
      <div className={popHead}>
        <Button size="sm" variant="ghost" href="#/calendar" onClick={onClose}>
          {d.openCalendar}
        </Button>
        {can(ws, ws.currentUserId, 'post.create') && (
          <Button size="sm" icon={Plus} href="#/compose" onClick={onClose}>
            {d.newPost}
          </Button>
        )}
      </div>
    </Popover>
  )
}

/** The dock's + : write, schedule for tomorrow morning, connect a channel, invite someone. */
export function CreateMenu({ anchor, open, onClose, now }: { anchor: RefObject<HTMLElement | null>; open: boolean; onClose: () => void; now: Date }) {
  const { t } = useI18n()
  const { ws } = useWorkspace()
  const c = t.createMenu
  const me = ws.currentUserId
  const go = (hash: string) => {
    onClose()
    window.location.hash = hash
  }
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 9))
  return (
    <Popover open={open} onClose={onClose} anchor={anchor} placement="bottom-start" label={t.shell.create}>
      <div role="menu">
        <MenuItem icon={PenLine} disabled={!can(ws, me, 'post.create')} onClick={() => go('#/compose')}>
          {c.newPost}
        </MenuItem>
        <MenuItem icon={CalendarPlus} disabled={!can(ws, me, 'post.create')} onClick={() => go(`#/compose?at=${tomorrow.getTime()}`)}>
          {c.tomorrow}
        </MenuItem>
        <MenuDivider />
        <MenuItem icon={Link} disabled={!can(ws, me, 'channels.manage')} onClick={() => go('#/channels?connect')}>
          {c.connect}
        </MenuItem>
        <MenuItem icon={UserPlus} disabled={!can(ws, me, 'team.manage')} onClick={() => go('#/team?invite')}>
          {c.invite}
        </MenuItem>
      </div>
    </Popover>
  )
}
