import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useToast } from '../Toast'
import { Button } from '../ui'
import { api } from '../../data/server'
import { useI18n } from '../../i18n'
import { CodeField, ErrorLine, QrCode, RecoveryCodes, errorText } from './parts'

/**
 * Turning on two-step verification: scan the QR code (or type the key),
 * confirm with a first code, then save the recovery codes.
 */
export function TotpSetup({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const s = t.auth.totp
  const [setup, setSetup] = useState<{ secret: string; url: string } | null>(null)
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ secret: string; url: string }>('POST', '/account/mfa/start').then(setSetup, (e) => setError(errorText(t, e, t.auth.network)))
  }, [t])

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      const r = await api<{ codes: string[] }>('POST', '/account/mfa/confirm', { code })
      setCodes(r.codes)
    } catch (e) {
      setError(errorText(t, e, t.auth.account.errors.code))
    } finally {
      setBusy(false)
    }
  }

  if (codes)
    return (
      <div className="grid gap-3">
        <h2 className="text-sm font-bold">{s.codesTitle}</h2>
        <p className="text-xs text-muted">{s.codesText}</p>
        <RecoveryCodes codes={codes} onCopied={() => toast({ text: s.copied, icon: ShieldCheck })} />
        <Button icon={ShieldCheck} onClick={onDone} className="w-fit">
          {s.done}
        </Button>
      </div>
    )

  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        void confirm()
      }}
    >
      <p className="text-xs text-muted">{s.scan}</p>
      {setup && (
        <div className="flex flex-wrap items-center gap-4">
          <QrCode text={setup.url} label={s.qr} />
          <div className="grid min-w-0 gap-1">
            <span className="text-2xs font-semibold text-muted">{s.key}</span>
            <code className="break-all font-mono text-sm tracking-[0.08em]" data-totp-secret>
              {setup.secret.match(/.{1,4}/g)?.join(' ')}
            </code>
          </div>
        </div>
      )}
      <CodeField label={s.code} value={code} onChange={(v) => (setCode(v), setError(''))} autoFocus={false} />
      <ErrorLine>{error}</ErrorLine>
      <Button type="submit" icon={ShieldCheck} className="w-fit" disabled={busy || code.length !== 6 || !setup}>
        {s.confirm}
      </Button>
    </form>
  )
}
