import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { KeyRound, Link2, LogOut, MonitorSmartphone, Save, ShieldCheck, ShieldOff, Unlink } from 'lucide-react'
import { Modal } from '../Modal'
import { useToast } from '../Toast'
import { Badge, Button, cn } from '../ui'
import { ApiError, api, ssoUrl } from '../../data/server'
import { useWorkspace } from '../../data/store'
import { useI18n } from '../../i18n'
import { CodeField, ErrorLine, PasswordField, RecoveryCodes, TextField, errorText } from './parts'
import { TotpSetup } from './TotpSetup'

interface AccountInfo {
  email: string
  name: string
  mfa: boolean
  hasPassword: boolean
  recoveryLeft: number
  identities: string[]
  sso: { id: string; name: string }[]
  sessions: { id: string; current: boolean; method: string; createdAt: string; seenAt: string; ip: string | null; agent: string | null }[]
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-[20px] border border-line bg-glass-2 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  )
}

/**
 * "Account & security" (server mode): your name and job title, password,
 * two-step verification and recovery codes, the devices you're signed in on,
 * and single sign-on links.
 */
export function AccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const a = t.auth.account
  const { all, server } = useWorkspace()
  const toast = useToast()
  const me = all.team.find((m) => m.id === all.currentUserId)
  const [info, setInfo] = useState<AccountInfo | null>(null)
  const load = useCallback(() => api<AccountInfo>('GET', '/account').then(setInfo, () => undefined), [])
  useEffect(() => {
    if (open) void load()
  }, [open, load])

  return (
    <Modal open={open} onClose={onClose} title={a.title} sub={info?.email ?? server?.user.email} size="lg">
      {open && me && <Profile name={me.name} title={me.title ?? ''} onSaved={() => toast({ text: a.saved, icon: Save })} />}
      {info && (
        <>
          <Password has={info.hasPassword} onChanged={() => (toast({ text: a.changed, icon: KeyRound }), void load())} />
          <TwoStep info={info} required={all.settings.requireMfa} onChange={load} />
          <Devices info={info} onChange={load} />
          {info.sso.length > 0 && <Sso info={info} onChange={load} />}
        </>
      )}
    </Modal>
  )
}

function Profile({ name: initialName, title: initialTitle, onSaved }: { name: string; title: string; onSaved: () => void }) {
  const { t } = useI18n()
  const a = t.auth.account
  const [name, setName] = useState(initialName)
  const [title, setTitle] = useState(initialTitle)
  const [error, setError] = useState('')
  const dirty = name.trim() !== initialName || title.trim() !== initialTitle
  const save = async () => {
    try {
      await api('PATCH', '/account', { name, title })
      onSaved()
    } catch (e) {
      setError(errorText(t, e, t.auth.network))
    }
  }
  return (
    <Section title={a.profile}>
      <form
        noValidate
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div className="grid grid-cols-2 gap-3 max-mobile:grid-cols-1">
          <TextField label={a.name} value={name} onChange={setName} name="name" autoComplete="name" />
          <TextField label={a.jobTitle} value={title} onChange={setTitle} name="organization-title" autoComplete="organization-title" />
        </div>
        {error && <ErrorLine>{error}</ErrorLine>}
        <Button type="submit" variant="ghost" size="sm" icon={Save} disabled={!dirty || !name.trim()} className="w-fit">
          {a.save}
        </Button>
      </form>
    </Section>
  )
}

function Password({ has, onChanged }: { has: boolean; onChanged: () => void }) {
  const { t } = useI18n()
  const a = t.auth.account
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState('')
  const submit = async () => {
    setError('')
    try {
      await api('POST', '/account/password', { current, next })
      setCurrent('')
      setNext('')
      onChanged()
    } catch (e) {
      setError((e as ApiError).code === 'current' ? a.errors.current : errorText(t, e, t.auth.network))
    }
  }
  return (
    <Section title={a.password}>
      {!has && <p className="text-xs text-muted">{a.noPassword}</p>}
      <form
        noValidate
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className={cn('grid gap-3', has && 'grid-cols-2 max-mobile:grid-cols-1')}>
          {has && <PasswordField label={a.current} value={current} onChange={setCurrent} name="current-password" autoComplete="current-password" />}
          <PasswordField label={a.next} value={next} onChange={setNext} name="new-password" autoComplete="new-password" hint={t.auth.password.hint} />
        </div>
        {error && <ErrorLine>{error}</ErrorLine>}
        <Button type="submit" variant="ghost" size="sm" icon={KeyRound} disabled={!next || (has && !current)} className="w-fit">
          {has ? a.change : a.setPassword}
        </Button>
      </form>
    </Section>
  )
}

function TwoStep({ info, required, onChange }: { info: AccountInfo; required: boolean; onChange: () => void }) {
  const { t } = useI18n()
  const a = t.auth.account
  const toast = useToast()
  const [mode, setMode] = useState<'idle' | 'setup' | 'off' | 'codes'>('idle')
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [error, setError] = useState('')
  const confirm = async () => {
    setError('')
    try {
      if (mode === 'off') {
        await api('POST', '/account/mfa/disable', { code })
        toast({ text: a.turnedOff, icon: ShieldOff })
        setMode('idle')
        onChange()
      } else {
        const r = await api<{ codes: string[] }>('POST', '/account/mfa/recovery', { code })
        setCodes(r.codes)
      }
      setCode('')
    } catch (e) {
      setError(errorText(t, e, a.errors.code))
    }
  }
  return (
    <Section
      title={a.mfa}
      aside={
        <span className="flex items-center gap-1.5">
          {required && (
            <Badge tone="plain" size="tight">
              {a.required}
            </Badge>
          )}
          <Badge tone={info.mfa ? 'pine' : 'coral'} size="tight">
            {info.mfa ? a.on : a.off}
          </Badge>
        </span>
      }
    >
      {mode === 'setup' ? (
        <TotpSetup onDone={() => (setMode('idle'), toast({ text: a.turnedOn, icon: ShieldCheck }), onChange())} />
      ) : codes ? (
        <>
          <RecoveryCodes codes={codes} onCopied={() => toast({ text: t.auth.totp.copied, icon: ShieldCheck })} />
          <Button size="sm" icon={ShieldCheck} className="w-fit" onClick={() => (setCodes(null), setMode('idle'), onChange())}>
            {t.auth.totp.done}
          </Button>
        </>
      ) : mode === 'off' || mode === 'codes' ? (
        <form
          noValidate
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void confirm()
          }}
        >
          <p className="text-xs text-muted">{a.confirmCode}</p>
          <CodeField label={t.auth.mfa.code} value={code} onChange={(v) => (setCode(v), setError(''))} recovery />
          <ErrorLine>{error}</ErrorLine>
          <span className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant={mode === 'off' ? 'danger' : 'ink'} disabled={code.length < 6}>
              {mode === 'off' ? a.turnOff : a.newCodes}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => (setMode('idle'), setCode(''), setError(''))}>
              {t.auth.team.cancel}
            </Button>
          </span>
        </form>
      ) : (
        <>
          <p className="text-xs text-muted">{info.mfa ? a.onText(info.recoveryLeft) : a.offText}</p>
          <span className="flex flex-wrap gap-2">
            {info.mfa ? (
              <>
                <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => setMode('codes')}>
                  {a.newCodes}
                </Button>
                {!required && (
                  <Button size="sm" variant="ghost" icon={ShieldOff} onClick={() => setMode('off')}>
                    {a.turnOff}
                  </Button>
                )}
              </>
            ) : (
              <Button size="sm" icon={ShieldCheck} onClick={() => setMode('setup')}>
                {a.turnOn}
              </Button>
            )}
          </span>
        </>
      )}
    </Section>
  )
}

function Devices({ info, onChange }: { info: AccountInfo; onChange: () => void }) {
  const { t } = useI18n()
  const a = t.auth.account
  const toast = useToast()
  const { server } = useWorkspace()
  const now = new Date()
  const end = async (id: string, current: boolean) => {
    await api('DELETE', `/account/sessions/${id}`).catch(() => undefined)
    if (current) return void server?.signOut()
    toast({ text: a.signedOutOne, icon: LogOut })
    onChange()
  }
  const others = info.sessions.filter((s) => !s.current).length
  return (
    <Section
      title={a.sessions}
      aside={
        others > 0 && (
          <Button
            size="sm"
            variant="ghost"
            icon={LogOut}
            onClick={() =>
              void api('POST', '/account/sessions/others').then(() => {
                toast({ text: a.signedOutOthers, icon: LogOut })
                onChange()
              })
            }
          >
            {a.signOutOthers}
          </Button>
        )
      }
    >
      <ul className="grid gap-1.5" aria-label={a.sessions}>
        {info.sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-[14px] px-1 py-1.5">
            <MonitorSmartphone size={20} aria-hidden className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-xs font-semibold">
                {a.device(s.agent)}
                {s.current && (
                  <Badge tone="pine" size="tight" className="ml-2 align-middle">
                    {a.thisDevice}
                  </Badge>
                )}
              </b>
              <small className="block truncate text-[12.5px] text-muted">{[a.seen(t.dates.ago(s.seenAt, now)), a.via(s.method), s.ip].filter(Boolean).join(' · ')}</small>
            </span>
            <Button size="sm" variant="ghost" onClick={() => void end(s.id, s.current)}>
              {a.signOut}
            </Button>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Sso({ info, onChange }: { info: AccountInfo; onChange: () => void }) {
  const { t } = useI18n()
  const a = t.auth.account
  const toast = useToast()
  const [error, setError] = useState('')
  const unlink = async (id: string, name: string) => {
    try {
      await api('DELETE', `/account/sso/${id}`)
      toast({ text: a.unlinked(name), icon: Unlink })
      onChange()
    } catch (e) {
      setError((e as ApiError).code === 'last' ? a.noPassword : errorText(t, e, t.auth.network))
    }
  }
  return (
    <Section title={a.sso}>
      <ul className="grid gap-1.5">
        {info.sso.map((p) => {
          const linked = info.identities.includes(p.id)
          return (
            <li key={p.id} className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold">
                {p.name}
                {linked && (
                  <Badge tone="pine" size="tight" className="ml-2 align-middle">
                    {a.linked}
                  </Badge>
                )}
              </span>
              {linked ? (
                <Button size="sm" variant="ghost" icon={Unlink} onClick={() => void unlink(p.id, p.name)}>
                  {a.unlink}
                </Button>
              ) : (
                <Button size="sm" variant="ghost" icon={Link2} href={ssoUrl(p.id, true)}>
                  {a.link}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {error && <ErrorLine>{error}</ErrorLine>}
    </Section>
  )
}
