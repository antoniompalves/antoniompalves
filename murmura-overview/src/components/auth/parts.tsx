import { useId, useMemo, useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { Copy, Download, Eye, EyeOff } from 'lucide-react'
import { encode } from 'uqr'
import { KataruMark } from '../Logo'
import { Button, NetIcon, cn } from '../ui'
import { NETWORK_ORDER } from '../../data/selectors'
import { ApiError } from '../../data/server'
import { useI18n } from '../../i18n'
import type { Messages } from '../../i18n'

/** The sign-in screens' building blocks: the ink panel, fields, SSO buttons, QR code, recovery codes. */

/** The fan of photos on the ink panel: tilted (degrees) and offset like the reference's. */
const FAN = [
  { left: 0, top: 26, turn: -9 },
  { left: 44, top: 4, turn: 4 },
  { left: 88, top: 34, turn: 13 },
]

/** The ink panel beside every sign-in form: logo, promise, networks, and a foot line. */
export function AuthAside({ photos, foot }: { photos: (string | undefined)[]; foot: string }) {
  const { t } = useI18n()
  return (
    <section className="relative grid min-h-[520px] content-between gap-7 overflow-hidden rounded-[30px] bg-ink p-[30px] text-on-ink max-tablet:min-h-0 max-mobile:gap-[18px] max-mobile:rounded-[26px] max-mobile:p-[22px]">
      <span className="relative z-[1] inline-flex items-center gap-3 text-[26px] font-bold tracking-[-0.02em] max-mobile:gap-2.5">
        <span className="grid size-12 place-items-center rounded-[15px] bg-butter text-[#16191d] max-mobile:size-11 max-mobile:rounded-[13px]">
          <KataruMark />
        </span>
        kataru
      </span>
      <div aria-hidden className="pointer-events-none absolute right-[-26px] top-[18px] h-[200px] w-[210px] max-tablet:hidden">
        {FAN.map((f, i) =>
          photos[i] ? (
            <img
              key={i}
              src={photos[i]}
              alt=""
              className="absolute h-[148px] w-[118px] origin-bottom rounded-[18px] border-[3px] border-white/90 object-cover shadow-[0_20px_40px_-16px_rgb(0_0_0/0.6)]"
              style={{ left: f.left, top: f.top, transform: `rotate(${f.turn}deg)` }}
            />
          ) : null,
        )}
      </div>
      <p className="relative z-[1] text-[clamp(30px,3.4vw,44px)] font-semibold leading-[1.04] tracking-[-0.03em] max-mobile:text-[28px]">
        {t.signIn.lede((w) => (
          <em className="not-italic">{w}</em>
        ))}
      </p>
      <div className="relative z-[1] flex flex-wrap gap-2">
        {NETWORK_ORDER.map((n) => (
          <NetIcon key={n} network={n} size="md" surface="on-ink-soft" />
        ))}
      </div>
      <p className="relative z-[1] text-2xs opacity-72">{foot}</p>
    </section>
  )
}

/** The two columns: the ink panel, then the form's card. */
export function AuthLayout({ aside, children, label }: { aside: ReactNode; children: ReactNode; label?: string }) {
  return (
    <main aria-label={label} className="fixed inset-0 z-40 grid place-items-center overflow-auto px-4 py-7 max-mobile:place-items-start">
      <div className="grid w-[min(980px,100%)] grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 max-tablet:grid-cols-1">
        {aside}
        <section className="grid content-start gap-4 rounded-[26px] border border-rim bg-glass p-5 shadow-card max-mobile:p-4">{children}</section>
      </div>
    </main>
  )
}

export const fieldCls = 'h-[46px] w-full min-w-0 rounded-[14px] border border-line-2 bg-glass-2 px-3.5 text-[16px] text-text outline-none focus-visible:border-text aria-invalid:border-coral'
const captionCls = 'px-0.5 text-2xs font-semibold text-muted'

export function CardTitle({ title, text }: { title: string; text?: ReactNode }) {
  return (
    <>
      <h1 className="text-[30px] font-bold leading-[1.45] tracking-[-0.025em] max-mobile:text-[26px]">{title}</h1>
      {text && <p className="text-muted">{text}</p>}
    </>
  )
}

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: ReactNode
}

export function TextField({ label, value, onChange, hint, className, id, ...rest }: FieldProps) {
  const auto = useId()
  const inputId = id ?? auto
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <label htmlFor={inputId} className={captionCls}>
        {label}
      </label>
      <input id={inputId} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${inputId}-hint` : undefined} className={fieldCls} {...rest} />
      {hint && (
        <small id={`${inputId}-hint`} className="px-0.5 text-[12.5px] leading-[1.4] text-muted">
          {hint}
        </small>
      )}
    </div>
  )
}

/** A password with a show/hide eye. */
export function PasswordField({ label, value, onChange, hint, className, id, ...rest }: FieldProps) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)
  const auto = useId()
  const inputId = id ?? auto
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <label htmlFor={inputId} className={captionCls}>
        {label}
      </label>
      <span className="relative block">
        <input id={inputId} type={shown ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${inputId}-hint` : undefined} className={cn(fieldCls, 'pr-12')} {...rest} />
        <button
          type="button"
          aria-label={shown ? t.auth.hidePassword : t.auth.showPassword}
          aria-pressed={shown}
          onClick={() => setShown(!shown)}
          className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted hover:bg-well hover:text-text"
        >
          {shown ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </span>
      {hint && (
        <small id={`${inputId}-hint`} className="px-0.5 text-[12.5px] leading-[1.4] text-muted">
          {hint}
        </small>
      )}
    </div>
  )
}

/** A 6-digit code from an authenticator app (or a recovery code when `recovery`). */
export function CodeField({ label, value, onChange, recovery = false, autoFocus = true }: { label: string; value: string; onChange: (v: string) => void; recovery?: boolean; autoFocus?: boolean }) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={(v) => onChange(recovery ? v.slice(0, 12) : v.replace(/\D/g, '').slice(0, 6))}
      name={recovery ? 'recovery' : 'otp'}
      inputMode={recovery ? 'text' : 'numeric'}
      autoComplete="one-time-code"
      autoCapitalize="off"
      spellCheck={false}
      autoFocus={autoFocus}
      className="[&_input]:font-mono [&_input]:tracking-[0.2em]"
    />
  )
}

export function ErrorLine({ children }: { children?: ReactNode }) {
  return (
    <p role="alert" className="min-h-[18px] text-xs text-bad">
      {children}
    </p>
  )
}

export function Notice({ tone = 'plain', children }: { tone?: 'plain' | 'good' | 'bad'; children: ReactNode }) {
  return (
    <p role="status" className={cn('rounded-[16px] border px-3.5 py-3 text-xs leading-[1.45]', tone === 'good' ? 'border-pine/30 bg-pine/10' : tone === 'bad' ? 'border-coral/40 bg-coral/10' : 'border-line bg-glass-2')}>
      {children}
    </p>
  )
}

export function OrLine({ children }: { children: ReactNode }) {
  return <p className="flex items-center gap-3 text-2xs font-semibold text-muted before:h-px before:flex-1 before:bg-line-2 after:h-px after:flex-1 after:bg-line-2">{children}</p>
}

/** "Continue with Google", one per configured provider. */
export function SsoButtons({ providers, href, label }: { providers: { id: string; name: string }[]; href: (id: string) => string; label: (name: string) => string }) {
  if (!providers.length) return null
  return (
    <div className="grid gap-2">
      {providers.map((p) => (
        <a key={p.id} href={href(p.id)} className="flex h-11 items-center justify-center gap-2.5 rounded-full border border-line-2 bg-glass text-sm font-semibold hover:bg-glass-2">
          <SsoGlyph id={p.id} />
          {label(p.name)}
        </a>
      ))}
    </div>
  )
}

function SsoGlyph({ id }: { id: string }) {
  if (id === 'google')
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
      </svg>
    )
  if (id === 'microsoft')
    return (
      <svg width="16" height="16" viewBox="0 0 22 22" aria-hidden>
        <path fill="#F25022" d="M0 0h10.5v10.5H0z" />
        <path fill="#7FBA00" d="M11.5 0H22v10.5H11.5z" />
        <path fill="#00A4EF" d="M0 11.5h10.5V22H0z" />
        <path fill="#FFB900" d="M11.5 11.5H22V22H11.5z" />
      </svg>
    )
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

/** The QR code an authenticator app scans, drawn as one SVG path. */
export function QrCode({ text, label }: { text: string; label: string }) {
  const { path, size } = useMemo(() => {
    const qr = encode(text, { border: 2, ecc: 'M' })
    let d = ''
    qr.data.forEach((row, y) => row.forEach((on, x) => on && (d += `M${x} ${y}h1v1h-1z`)))
    return { path: d, size: qr.size }
  }, [text])
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" className="size-[172px] rounded-[14px] bg-white p-1">
      <path d={path} fill="#16191d" />
    </svg>
  )
}

/** Recovery codes in two columns, with copy and download. */
export function RecoveryCodes({ codes, onCopied }: { codes: string[]; onCopied: () => void }) {
  const { t } = useI18n()
  const text = codes.join('\n')
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([`${text}\n`], { type: 'text/plain' }))
    a.download = t.auth.totp.file
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return (
    <div className="grid gap-3">
      <ol aria-label={t.auth.totp.codesTitle} className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-[16px] border border-line bg-glass-2 p-4 font-mono text-sm tracking-[0.06em]">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" icon={Copy} onClick={() => void navigator.clipboard?.writeText(text).then(onCopied, onCopied)}>
          {t.auth.totp.copy}
        </Button>
        <Button variant="ghost" size="sm" icon={Download} onClick={download}>
          {t.auth.totp.download}
        </Button>
      </div>
    </div>
  )
}

/** What to tell people when a request fails. */
export function errorText(t: Messages, e: unknown, fallback: string): string {
  if (!(e instanceof ApiError)) return fallback
  if (e.status === 0) return t.auth.network
  if (e.status === 429) return t.auth.slow
  if (e.code === 'password') return t.auth.password[(e.data.problem as 'short' | 'long' | 'weak') ?? 'weak'] ?? fallback
  return fallback
}
