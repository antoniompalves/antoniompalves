import { useRef, useState } from 'react'
import { ArrowLeftRight, Command, Languages, LogOut, MonitorSmartphone, Moon, RefreshCw, ShieldCheck, Sun, UserRound } from 'lucide-react'
import { ConfirmDialog } from '../Modal'
import { MenuDivider, MenuItem, Popover } from '../Popover'
import { useToast } from '../Toast'
import { Avatar, Badge, cn } from '../ui'
import { roleName, roleOf } from '../../data/permissions'
import { useWorkspace } from '../../data/store'
import type { AuditAction, TeamMember } from '../../data/types'
import { LOCALES, useI18n } from '../../i18n'

export type ThemePref = 'light' | 'dark' | 'system'

interface Props {
  user: TeamMember
  theme: ThemePref
  onTheme: (t: ThemePref) => void
  onShortcuts: () => void
}

/**
 * The avatar's menu, as in the reference: who you are (→ settings), switch
 * account, keyboard shortcuts, the theme, then Kataru's language, resetting
 * the demo and signing out.
 */
export function AccountButton({ user, theme, onTheme, onShortcuts }: Props) {
  const { t, locale, setLocale } = useI18n()
  const { ws, all, dispatch, reset, clock } = useWorkspace()
  const toast = useToast()
  const [menu, setMenu] = useState<'menu' | 'switch' | null>(null)
  const [resetting, setResetting] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const role = roleName(t, ws, user.role)
  const s = t.shell
  const close = () => setMenu(null)
  const audit = (action: AuditAction, actorId = ws.currentUserId) =>
    dispatch({ type: 'audit', event: { id: `au-${Date.now().toString(36)}`, actorId, kind: 'auth', action, at: new Date(clock.mock + Date.now() - clock.real).toISOString() } })

  const switchTo = (m: TeamMember) => {
    close()
    if (m.id === user.id) return
    audit({ type: 'switchedAccount', to: m.name })
    dispatch({ type: 'signIn', userId: m.id })
    toast({ text: s.signedInAs(m.name.split(' ')[0], roleName(t, ws, m.role)), icon: ShieldCheck })
  }

  const themes: { id: ThemePref; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: s.themeLight, icon: Sun },
    { id: 'dark', label: s.themeDark, icon: Moon },
    { id: 'system', label: s.themeSystem, icon: MonitorSmartphone },
  ]

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={s.account(user.name, role)}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        onClick={() => setMenu((v) => (v ? null : 'menu'))}
        className="inline-flex h-12 cursor-pointer items-center gap-2.5 rounded-full border border-rim bg-glass-2 p-0.5"
      >
        <Avatar src={user.avatar} name={user.name} size="lg" />
        <span className="hidden pr-3.5 text-left leading-[1.15] min-[1500px]:block">
          <b className="block text-xs font-bold">{user.name}</b>
          <small className="block text-[12.5px] text-muted">{role}</small>
        </span>
      </button>

      <Popover open={menu === 'menu'} onClose={close} anchor={ref} placement="bottom-end" label={s.accountMenu}>
        <div role="menu" aria-label={s.accountMenu}>
          <MenuItem
            icon={UserRound}
            onClick={() => {
              close()
              window.location.hash = '#/settings'
            }}
          >
            {s.profile(user.name, role)}
          </MenuItem>
          <MenuItem icon={ArrowLeftRight} onClick={() => setMenu('switch')}>
            {s.switchAccount}
          </MenuItem>
          <MenuItem
            icon={Command}
            onClick={() => {
              close()
              onShortcuts()
            }}
          >
            {s.shortcuts}
          </MenuItem>
          <MenuDivider />
          <div role="group" aria-label={s.theme}>
            {themes.map((x) => (
              <MenuItem key={x.id} icon={x.icon} checked={theme === x.id} onClick={() => (onTheme(x.id), close())}>
                {x.label}
              </MenuItem>
            ))}
          </div>
          <MenuDivider />
          <div role="group" aria-label={s.language}>
            {LOCALES.map((l) => (
              <MenuItem key={l.id} icon={Languages} lang={l.id} checked={locale === l.id} onClick={() => (setLocale(l.id), close())}>
                {l.name}
              </MenuItem>
            ))}
          </div>
          <MenuDivider />
          <MenuItem
            icon={RefreshCw}
            onClick={() => {
              close()
              setResetting(true)
            }}
          >
            {s.reset.item}
          </MenuItem>
          <MenuItem
            icon={LogOut}
            className="text-bad"
            onClick={() => {
              close()
              audit({ type: 'signedOut' })
              dispatch({ type: 'signOut' })
            }}
          >
            {s.signOut}
          </MenuItem>
        </div>
      </Popover>

      <Popover open={menu === 'switch'} onClose={close} anchor={ref} placement="bottom-end" label={s.switcher.label} className="w-[360px]">
        <div className="flex items-center justify-between gap-2.5 px-2.5 pb-1.5 pt-2">
          <span className="text-sm font-bold">{s.switcher.title}</span>
          <span className="text-2xs text-muted">{s.switcher.sub}</span>
        </div>
        <div className="grid gap-0.5">
          {all.team
            .filter((m) => m.status === 'active')
            .map((m) => (
              <button
                key={m.id}
                type="button"
                aria-current={m.id === user.id || undefined}
                onClick={() => switchTo(m)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-[9px] text-left outline-none hover:bg-well focus-visible:bg-well pointer-coarse:min-h-[46px]',
                  m.id === user.id && 'bg-well',
                )}
              >
                <Avatar src={m.avatar} name={m.name} size="md" />
                <span className="min-w-0 flex-1">
                  <b className="text-xs font-semibold">{m.name}</b>
                  <small className="block text-2xs text-muted">{m.title}</small>
                </span>
                <Badge tone={roleOf(all, m)?.tone ?? 'plain'}>{roleName(t, all, m.role)}</Badge>
              </button>
            ))}
        </div>
      </Popover>

      <ConfirmDialog
        open={resetting}
        title={s.reset.title}
        text={s.reset.text}
        confirm={s.reset.confirm}
        cancel={s.reset.cancel}
        onClose={() => setResetting(false)}
        onConfirm={() => {
          setResetting(false)
          reset()
          toast({ text: s.reset.done, icon: RefreshCw })
        }}
      />
    </>
  )
}
