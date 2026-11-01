import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowLeft, ArrowUpRight, Building2, KeyRound, LogOut, Mail, Plus, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react'
import { Mesh } from '../AppShell'
import { useToast } from '../Toast'
import { Button, IconButton, cn } from '../ui'
import { photo } from '../../data/assets'
import { isSystemRole } from '../../data/permissions'
import { ApiError, api, detect, ssoUrl } from '../../data/server'
import type { SessionInfo, Snapshot } from '../../data/server'
import { ServerWorkspaceProvider } from '../../data/serverStore'
import type { Workspace } from '../../data/types'
import { useI18n } from '../../i18n'
import { AuthAside, AuthLayout, CardTitle, CodeField, ErrorLine, Notice, OrLine, PasswordField, SsoButtons, TextField, errorText } from './parts'
import { TotpSetup } from './TotpSetup'

/**
 * In server mode, everything before the workspace: first-run setup, signing in
 * (password, single sign-on, the second step), forgotten passwords, invitation
 * and reset links, and turning on two-step verification when the workspace
 * requires it. Once signed in, the app runs inside ServerWorkspaceProvider.
 */

type Screen =
  | { name: 'setup' }
  | { name: 'signin'; notice?: string }
  | { name: 'mfa' }
  | { name: 'forgot'; email?: string }
  | { name: 'reset'; token: string }
  | { name: 'invite'; token: string }
  | { name: 'enroll' }
  | { name: 'opening' }
  | { name: 'app'; first: Snapshot; session: SessionInfo }

/** Placeholder photos for the ink panel (no workspace to borrow from before signing in). */
const PHOTOS = [photo('cover-living', 320), photo('cover-roastery', 320), photo('cover-night', 320)]

const linkOf = (hash: string): Screen | null => {
  const m = hash.match(/^#\/(invite|reset)\/([\w-]{20,100})/)
  return m ? ({ name: m[1] as 'invite' | 'reset', token: m[2]! } as Screen) : null
}

export function AuthGate({ initial, sample, children }: { initial: SessionInfo; sample: () => Promise<Workspace>; children: ReactNode }) {
  const { t } = useI18n()
  const toast = useToast()
  const [session, setSession] = useState(initial)
  const [screen, setScreen] = useState<Screen>(() => linkOf(window.location.hash) ?? { name: 'opening' })

  /** Where to go from what the server says about this browser's session. */
  const route = useCallback(
    async (s: SessionInfo, notice?: string) => {
      setSession(s)
      if (s.setup) return setScreen({ name: 'setup' })
      if (!s.user) return setScreen({ name: 'signin', notice })
      if (s.user.stage === 'mfa') return setScreen({ name: 'mfa' })
      if (s.user.mustEnroll) return setScreen({ name: 'enroll' })
      setScreen({ name: 'opening' })
      try {
        const first = await api<Snapshot>('GET', '/workspace')
        if (/^#\/(invite|reset|signin|setup)/.test(window.location.hash)) window.history.replaceState(null, '', '#/overview')
        setScreen({ name: 'app', first, session: s })
      } catch (e) {
        const err = e as ApiError
        if (err.code === 'mfa_required') setScreen({ name: 'enroll' })
        else setScreen({ name: 'signin', notice: err.code === 'suspended' ? t.auth.signIn.errors.suspended : undefined })
      }
    },
    [t],
  )

  const refresh = useCallback(async (notice?: string) => route(await api<SessionInfo>('GET', '/session'), notice), [route])

  useEffect(() => {
    if (screen.name !== 'opening') return
    // Back from single sign-on with a problem: "#/signin?sso=unknown".
    const sso = window.location.hash.match(/^#\/signin\?sso=(\w+)/)?.[1]
    void route(initial, sso ? (t.auth.signIn.ssoErrors[sso] ?? t.auth.signIn.ssoErrors.failed) : undefined)
    // Only on the first render.
  }, [])

  // An invitation or reset link opened while the app is already open.
  useEffect(() => {
    const onHash = () => {
      const link = linkOf(window.location.hash)
      if (link) setScreen(link)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const signOut = useCallback(async () => {
    await api('POST', '/auth/logout').catch(() => undefined)
    window.history.replaceState(null, '', '#/overview')
    toast({ text: t.auth.signedOut, icon: LogOut })
    await refresh()
  }, [refresh, t, toast])

  if (screen.name === 'app')
    return (
      <ServerWorkspaceProvider
        key={screen.session.user!.id}
        first={screen.first}
        user={screen.session.user!}
        session={screen.session}
        signOut={signOut}
        events={{
          refused: (message, code) => toast({ text: code === 'forbidden' ? (/brand/.test(message) ? t.auth.sync.refusedBrand : t.auth.sync.refusedRole) : t.auth.sync.refused(message), icon: X }),
          signedOut: (code) => void refresh(code === 'suspended' ? t.auth.signIn.errors.suspended : t.auth.signIn.errors.ended),
          mfaRequired: () => setScreen({ name: 'enroll' }),
        }}
      >
        {children}
      </ServerWorkspaceProvider>
    )

  const aside = <AuthAside photos={PHOTOS} foot={t.auth.foot(session.company)} />
  return (
    <>
      <Mesh />
      <AuthLayout aside={aside}>
        {screen.name === 'opening' ? (
          <p className="py-10 text-center text-muted" role="status">
            {t.auth.loading}
          </p>
        ) : screen.name === 'setup' ? (
          <Setup sample={sample} onDone={() => void refresh()} />
        ) : screen.name === 'signin' ? (
          <SignInForm session={session} notice={screen.notice} onDone={() => void refresh()} onMfa={() => setScreen({ name: 'mfa' })} onForgot={(email) => setScreen({ name: 'forgot', email })} />
        ) : screen.name === 'mfa' ? (
          <SecondStep onDone={(left) => (left !== null && toast({ text: t.auth.mfa.recoveryLeft(left), icon: KeyRound }), void refresh())} onBack={() => void signOut()} />
        ) : screen.name === 'forgot' ? (
          <Forgot email={screen.email} mail={session.mail} onBack={() => setScreen({ name: 'signin' })} />
        ) : screen.name === 'reset' ? (
          <Reset token={screen.token} onDone={() => void refresh()} onAgain={() => setScreen({ name: 'forgot' })} />
        ) : screen.name === 'invite' ? (
          <Invite token={screen.token} sso={session.sso} onDone={() => void refresh()} />
        ) : (
          <Enroll company={session.company ?? ''} onDone={() => void refresh()} onSignOut={() => void signOut()} />
        )}
      </AuthLayout>
    </>
  )
}

/** Shown when VITE_KATARU_API points at a server that doesn't answer. */
export function Unreachable({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <AuthLayout aside={<AuthAside photos={PHOTOS} foot={t.auth.foot(null)} />}>
      <CardTitle title={t.auth.unreachable.title} text={t.auth.unreachable.text} />
      <Button icon={RefreshCw} onClick={onRetry} className="w-fit">
        {t.auth.unreachable.retry}
      </Button>
    </AuthLayout>
  )
}

/** Runs a form's request, with its busy state and error line. */
function useSubmit() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (fn: () => Promise<void>, fail: (e: unknown) => string) => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(fail(e))
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, setError, run }
}

const Form = ({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) => (
  <form
    noValidate
    className="grid gap-3"
    onSubmit={(e: FormEvent) => {
      e.preventDefault()
      onSubmit()
    }}
  >
    {children}
  </form>
)

const LinkButton = ({ onClick, children, icon: Icon }: { onClick: () => void; children: ReactNode; icon?: typeof ArrowLeft }) => (
  <button type="button" onClick={onClick} className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md text-2xs font-semibold text-muted underline-offset-4 hover:text-text hover:underline">
    {Icon && <Icon size={15} aria-hidden />}
    {children}
  </button>
)

/* ───────────── first run ───────────── */

function Setup({ sample, onDone }: { sample: () => Promise<Workspace>; onDone: () => void }) {
  const { t } = useI18n()
  const s = t.auth.setup
  const [code, setCode] = useState('')
  const [company, setCompany] = useState('')
  const [start, setStart] = useState<'empty' | 'sample'>('empty')
  const [brands, setBrands] = useState<string[]>([''])
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'GBP'>('EUR')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { busy, error, setError, run } = useSubmit()

  const submit = () => {
    const named = brands.map((b) => b.trim()).filter(Boolean)
    if (!company.trim() || !name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()) || (start === 'empty' && !named.length)) return setError(s.errors.missing)
    void run(
      async () => {
        await api('POST', '/setup', {
          code,
          company,
          brands: named,
          name,
          email,
          password,
          currency,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...(start === 'sample' && { sample: await sample() }),
        })
        onDone()
      },
      (e) => ((e as ApiError).code === 'code' ? s.errors.code : (e as ApiError).code === 'exists' ? s.errors.exists : errorText(t, e, s.errors.missing)),
    )
  }

  const choice = (id: 'empty' | 'sample', label: string, hint: string, Icon: typeof Building2) => (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-[18px] border-[1.5px] px-3.5 py-3 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-text',
        start === id ? 'border-text bg-glass-3' : 'border-line bg-glass-2',
      )}
    >
      <input type="radio" name="start" value={id} checked={start === id} onChange={() => setStart(id)} className="sr-only" />
      <Icon size={18} aria-hidden className="mt-0.5 shrink-0" />
      <span className="grid gap-0.5">
        <b className="text-xs font-bold">{label}</b>
        <small className="text-[12.5px] leading-[1.4] text-muted">{hint}</small>
      </span>
    </label>
  )

  return (
    <>
      <CardTitle title={s.title} text={s.text} />
      <Form onSubmit={submit}>
        <TextField label={s.code} value={code} onChange={setCode} name="setup-code" autoComplete="off" spellCheck={false} hint={s.codeHint} autoFocus />
        <TextField label={s.company} value={company} onChange={setCompany} name="organization" autoComplete="organization" placeholder={s.companyPlaceholder} />
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 px-0.5 text-2xs font-semibold text-muted">{s.start}</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2 max-mobile:grid-cols-1">
            {choice('empty', s.empty, s.emptyHint, Building2)}
            {choice('sample', s.sample, s.sampleHint, Sparkles)}
          </div>
        </fieldset>
        {start === 'empty' && (
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 px-0.5 text-2xs font-semibold text-muted">{s.brands}</legend>
            {brands.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                <input
                  aria-label={`${s.brands} ${i + 1}`}
                  value={b}
                  placeholder={s.brandPlaceholder(i)}
                  onChange={(e) => setBrands(brands.map((x, j) => (j === i ? e.target.value : x)))}
                  className="h-[46px] w-full min-w-0 rounded-[14px] border border-line-2 bg-glass-2 px-3.5 text-[16px] text-text outline-none focus-visible:border-text"
                />
                {brands.length > 1 && <IconButton label={s.removeBrand(b)} icon={X} size="sm" onClick={() => setBrands(brands.filter((_, j) => j !== i))} />}
              </span>
            ))}
            <span className="flex flex-wrap items-center justify-between gap-2">
              <small className="px-0.5 text-[12.5px] text-muted">{s.brandsHint}</small>
              {brands.length < 30 && (
                <Button variant="ghost" size="sm" icon={Plus} onClick={() => setBrands([...brands, ''])}>
                  {s.addBrand}
                </Button>
              )}
            </span>
          </fieldset>
        )}
        <label className="grid gap-1.5">
          <span className="px-0.5 text-2xs font-semibold text-muted">{s.currency}</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as 'EUR')} className="h-[46px] w-full rounded-[14px] border border-line-2 bg-glass-2 px-3 text-[16px] text-text outline-none focus-visible:border-text">
            <option value="EUR">EUR €</option>
            <option value="USD">USD $</option>
            <option value="GBP">GBP £</option>
          </select>
        </label>
        <p className="mt-1 text-xs font-bold">{s.you}</p>
        <div className="grid grid-cols-2 gap-3 max-mobile:grid-cols-1">
          <TextField label={s.name} value={name} onChange={setName} name="name" autoComplete="name" />
          <TextField label={s.email} value={email} onChange={setEmail} name="email" type="email" autoComplete="username" />
        </div>
        <PasswordField label={t.auth.signIn.password} value={password} onChange={setPassword} name="new-password" autoComplete="new-password" hint={t.auth.password.hint} />
        <ErrorLine>{error}</ErrorLine>
        <Button type="submit" icon={ArrowUpRight} className="w-full" disabled={busy}>
          {s.submit}
        </Button>
      </Form>
    </>
  )
}

/* ───────────── signing in ───────────── */

function SignInForm({ session, notice, onDone, onMfa, onForgot }: { session: SessionInfo; notice?: string; onDone: () => void; onMfa: () => void; onForgot: (email: string) => void }) {
  const { t } = useI18n()
  const s = t.auth.signIn
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { busy, error, setError, run } = useSubmit()

  const submit = () => {
    if (!email.trim() || !password) return setError(s.errors.empty)
    void run(
      async () => {
        const r = await api<{ mfa?: boolean }>('POST', '/auth/login', { email, password })
        if (r.mfa) onMfa()
        else onDone()
      },
      (e) => ((e as ApiError).code === 'invalid' ? s.errors.invalid : (e as ApiError).code === 'suspended' ? s.errors.suspended : errorText(t, e, s.errors.invalid)),
    )
  }

  return (
    <>
      <CardTitle title={s.title} text={s.text(session.company)} />
      {notice && <Notice tone="bad">{notice}</Notice>}
      <Form onSubmit={submit}>
        <TextField label={s.email} value={email} onChange={(v) => (setEmail(v), setError(''))} name="email" type="email" autoComplete="username" autoFocus />
        <PasswordField label={s.password} value={password} onChange={(v) => (setPassword(v), setError(''))} name="password" autoComplete="current-password" />
        <ErrorLine>{error}</ErrorLine>
        <Button type="submit" icon={ArrowUpRight} className="w-full" disabled={busy}>
          {s.submit}
        </Button>
      </Form>
      <LinkButton onClick={() => onForgot(email)}>{s.forgot}</LinkButton>
      {session.sso.length > 0 && (
        <>
          <OrLine>{s.or}</OrLine>
          <SsoButtons providers={session.sso} href={(id) => ssoUrl(id)} label={s.sso} />
        </>
      )}
    </>
  )
}

function SecondStep({ onDone, onBack }: { onDone: (recoveryLeft: number | null) => void; onBack: () => void }) {
  const { t } = useI18n()
  const s = t.auth.mfa
  const [recovery, setRecovery] = useState(false)
  const [code, setCode] = useState('')
  const { busy, error, setError, run } = useSubmit()
  const submit = () =>
    void run(
      async () => {
        const r = await api<{ usedRecovery: boolean; recoveryLeft: number }>('POST', '/auth/mfa', { code })
        onDone(r.usedRecovery ? r.recoveryLeft : null)
      },
      (e) => ((e as ApiError).status === 401 && (e as ApiError).code === 'signed_out' ? t.auth.signIn.errors.ended : errorText(t, e, s.wrong)),
    )
  return (
    <>
      <CardTitle title={s.title} text={recovery ? s.recoveryText : s.text} />
      <Form onSubmit={submit}>
        <CodeField key={String(recovery)} label={recovery ? s.recovery : s.code} value={code} onChange={(v) => (setCode(v), setError(''))} recovery={recovery} />
        <ErrorLine>{error}</ErrorLine>
        <Button type="submit" icon={ShieldCheck} className="w-full" disabled={busy || code.length < 6}>
          {s.submit}
        </Button>
      </Form>
      <div className="flex flex-wrap justify-between gap-3">
        <LinkButton onClick={() => (setRecovery(!recovery), setCode(''), setError(''))}>{recovery ? s.useApp : s.useRecovery}</LinkButton>
        <LinkButton icon={ArrowLeft} onClick={onBack}>
          {s.back}
        </LinkButton>
      </div>
    </>
  )
}

/* ───────────── links ───────────── */

function Forgot({ email: initial = '', mail, onBack }: { email?: string; mail: boolean; onBack: () => void }) {
  const { t, locale } = useI18n()
  const s = t.auth.forgot
  const [email, setEmail] = useState(initial)
  const [sent, setSent] = useState('')
  const { busy, error, setError, run } = useSubmit()
  const submit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(s.invalid)
    void run(
      async () => {
        await api('POST', '/auth/forgot', { email, locale })
        setSent(email.trim())
      },
      (e) => errorText(t, e, t.auth.network),
    )
  }
  return (
    <>
      <CardTitle title={s.title} text={s.text} />
      {!mail && <Notice>{s.noMail}</Notice>}
      {sent ? (
        <Notice tone="good">{s.sent(sent)}</Notice>
      ) : (
        <Form onSubmit={submit}>
          <TextField label={t.auth.signIn.email} value={email} onChange={(v) => (setEmail(v), setError(''))} name="email" type="email" autoComplete="username" autoFocus />
          <ErrorLine>{error}</ErrorLine>
          <Button type="submit" icon={Mail} className="w-full" disabled={busy}>
            {s.submit}
          </Button>
        </Form>
      )}
      <LinkButton icon={ArrowLeft} onClick={onBack}>
        {s.back}
      </LinkButton>
    </>
  )
}

interface LinkInfo {
  email: string
  name: string
  company: string
  role: string
}

/** Who a link is for (the server checks it hasn't expired), or false when it has. */
function useLink(kind: 'invite' | 'reset', token: string) {
  const [info, setInfo] = useState<LinkInfo | null | false>(null)
  useEffect(() => {
    api<LinkInfo>('GET', `/auth/link/${kind}/${token}`).then(setInfo, () => setInfo(false))
  }, [kind, token])
  return info
}

function Reset({ token, onDone, onAgain }: { token: string; onDone: () => void; onAgain: () => void }) {
  const { t } = useI18n()
  const s = t.auth.reset
  const info = useLink('reset', token)
  const [password, setPassword] = useState('')
  const { busy, error, run } = useSubmit()
  if (info === null) return <p className="py-10 text-center text-muted">{t.auth.loading}</p>
  if (info === false)
    return (
      <>
        <CardTitle title={s.title} />
        <Notice tone="bad">{s.expired}</Notice>
        <Button variant="ghost" icon={Mail} onClick={onAgain} className="w-fit">
          {s.again}
        </Button>
      </>
    )
  const submit = () =>
    void run(
      async () => {
        await api('POST', '/auth/reset', { token, password })
        window.history.replaceState(null, '', '#/overview')
        onDone()
      },
      (e) => ((e as ApiError).code === 'expired' ? s.expired : errorText(t, e, s.expired)),
    )
  return (
    <>
      <CardTitle title={s.title} text={s.text(info.email)} />
      <Form onSubmit={submit}>
        <input type="email" name="email" autoComplete="username" value={info.email} readOnly hidden />
        <PasswordField label={s.password} value={password} onChange={setPassword} name="new-password" autoComplete="new-password" hint={t.auth.password.hint} autoFocus />
        <ErrorLine>{error}</ErrorLine>
        <Button type="submit" icon={KeyRound} className="w-full" disabled={busy}>
          {s.submit}
        </Button>
      </Form>
    </>
  )
}

function Invite({ token, sso, onDone }: { token: string; sso: SessionInfo['sso']; onDone: () => void }) {
  const { t } = useI18n()
  const s = t.auth.invite
  const info = useLink('invite', token)
  const [name, setName] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const { busy, error, run } = useSubmit()
  if (info === null) return <p className="py-10 text-center text-muted">{t.auth.loading}</p>
  if (info === false)
    return (
      <>
        <CardTitle title={t.auth.invite.title('Kataru')} />
        <Notice tone="bad">{s.expired}</Notice>
      </>
    )
  const role = isSystemRole(info.role) ? t.roles[info.role] : info.role
  const submit = () =>
    void run(
      async () => {
        await api('POST', '/auth/accept', { token, password, name: name ?? info.name })
        window.history.replaceState(null, '', '#/overview')
        onDone()
      },
      (e) => ((e as ApiError).code === 'expired' ? s.expired : errorText(t, e, s.expired)),
    )
  return (
    <>
      <CardTitle title={s.title(info.company)} text={s.text(role)} />
      <Form onSubmit={submit}>
        <TextField label={s.name} value={name ?? info.name} onChange={setName} name="name" autoComplete="name" />
        <TextField label={s.email} value={info.email} onChange={() => undefined} name="email" type="email" autoComplete="username" readOnly />
        <PasswordField label={s.password} value={password} onChange={setPassword} name="new-password" autoComplete="new-password" hint={t.auth.password.hint} autoFocus />
        <ErrorLine>{error}</ErrorLine>
        <Button type="submit" icon={ArrowUpRight} className="w-full" disabled={busy}>
          {s.submit}
        </Button>
      </Form>
      {sso.length > 0 && (
        <>
          <OrLine>{s.or}</OrLine>
          <SsoButtons providers={sso} href={(id) => `${ssoUrl(id)}?email=${encodeURIComponent(info.email)}`} label={(n) => n} />
        </>
      )}
    </>
  )
}

/* ───────────── required two-step verification ───────────── */

function Enroll({ company, onDone, onSignOut }: { company: string; onDone: () => void; onSignOut: () => void }) {
  const { t } = useI18n()
  return (
    <>
      <CardTitle title={t.auth.enroll.title} text={t.auth.enroll.text(company)} />
      <TotpSetup onDone={onDone} />
      <LinkButton icon={LogOut} onClick={onSignOut}>
        {t.auth.enroll.signOut}
      </LinkButton>
    </>
  )
}

/** Finds out whether a Kataru server is here; re-exported for App. */
export { detect }
