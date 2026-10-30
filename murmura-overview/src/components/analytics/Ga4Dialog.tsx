import { useEffect, useState } from 'react'
import { Plug, Plus, Trash2, Unplug } from 'lucide-react'
import { cleanPropertyId, isPropertyId, preloadGis } from '../../data/ga4'
import { useGa4 } from '../../data/ga4Store'
import { useWorkspace } from '../../data/store'
import type { Website } from '../../data/types'
import { useI18n } from '../../i18n'
import { Modal } from '../Modal'
import { useToast } from '../Toast'
import { Button, IconButton, cn } from '../ui'

interface Row {
  id: string
  brandId: string
  domain: string
  propertyId: string
  /** The mock site this row started as, if any (keeps its demo traffic while the domain is unchanged). */
  from?: Website
}

const toRow = (s: Website): Row => ({ id: s.id, brandId: s.brandId, domain: s.domain, propertyId: s.propertyId ?? '', from: s })

/** "https://www.Example.com/shop" → "www.example.com" */
const cleanDomain = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')

/**
 * Settings behind "Connect Google Analytics": the OAuth client ID and the
 * workspace's websites — any number per brand, none at all for some — each
 * optionally linked to a GA4 property.
 */
export function Ga4Dialog({ onClose }: { onClose: () => void }) {
  const { ws } = useWorkspace()
  const { t } = useI18n()
  const toast = useToast()
  const ga = useGa4()
  const d = t.analytics.web.dialog
  const [clientId, setClientId] = useState(ga.clientId)
  const [rows, setRows] = useState<Row[]>(() => ws.websites.map(toRow))
  const [tried, setTried] = useState<'save' | 'connect' | null>(null)

  // Load Google's sign-in script now, so the popup can open straight from the button.
  useEffect(preloadGis, [])

  const rowErrors = rows.map((r) => ({
    domain: !cleanDomain(r.domain) ? d.needDomain : '',
    property: r.propertyId.trim() && !isPropertyId(r.propertyId) ? d.invalidProperty : '',
  }))
  const invalid = rowErrors.some((e) => e.domain || e.property)
  const linked = rows.filter((r) => r.propertyId.trim()).length
  const connectProblem = !clientId.trim() ? d.needClient : !linked ? d.needProperty : ''

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)))

  const websites = (): Website[] =>
    rows.map((r) => {
      const domain = cleanDomain(r.domain)
      const propertyId = r.propertyId.trim() ? cleanPropertyId(r.propertyId) : undefined
      // A demo site renamed to another domain is someone's real site now: no more made-up traffic.
      const demo = !!r.from?.demo && r.from.domain === domain && r.from.brandId === r.brandId
      return { id: r.id, brandId: r.brandId, domain, ...(propertyId && { propertyId }), ...(demo && { demo }) }
    })

  const save = (andConnect: boolean) => {
    setTried(andConnect ? 'connect' : 'save')
    if (invalid || (andConnect && connectProblem)) return
    const sites = websites()
    ga.saveSettings(clientId, sites)
    onClose()
    if (!andConnect) return toast({ text: t.analytics.web.toast.saved })
    ga.connect(clientId.trim(), sites).then((loaded) => {
      if (loaded) toast({ text: t.analytics.web.toast.connected(loaded), icon: Plug })
    })
  }

  const field = 'h-11 w-full min-w-0 rounded-[14px] border bg-glass-2 px-3 text-sm text-text outline-none focus-visible:border-text'
  const label = 'mb-1.5 block px-0.5 text-2xs font-semibold text-muted'
  const showErrors = tried !== null

  return (
    <Modal
      open
      onClose={onClose}
      title={d.title}
      sub={d.sub}
      onSubmit={() => save(true)}
      className="w-[min(680px,calc(100vw-24px))]"
      footer={
        <>
          {ga.status === 'live' && (
            <Button
              variant="ghost"
              icon={Unplug}
              className="mr-auto max-mobile:mr-0"
              onClick={() => {
                ga.disconnect()
                onClose()
                toast({ text: t.analytics.web.toast.disconnected, icon: Unplug })
              }}
            >
              {d.disconnect}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            {d.cancel}
          </Button>
          <Button variant="ghost" onClick={() => save(false)}>
            {d.save}
          </Button>
          <Button type="submit" icon={Plug}>
            {d.connect}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <label>
          <span className={label}>{d.clientId}</span>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="1234567890-abc123.apps.googleusercontent.com"
            spellCheck={false}
            autoComplete="off"
            aria-describedby="ga4-client-hint"
            className={cn(field, 'border-line-2')}
          />
          <small id="ga4-client-hint" className="mt-1.5 block px-0.5 text-[12.5px] leading-[1.4] text-muted">
            {d.clientIdHint}
          </small>
        </label>

        <fieldset className="grid min-w-0 gap-2">
          <legend className={label}>{d.sites}</legend>
          <p className="-mt-1 px-0.5 text-[12.5px] leading-[1.4] text-muted">{d.sitesHint}</p>
          <div aria-hidden className="grid grid-cols-[11.5em_minmax(0,1fr)_10em_44px] gap-2 px-0.5 text-[12.5px] font-semibold text-muted max-mobile:hidden">
            <span>{d.brand}</span>
            <span>{d.domain}</span>
            <span>{d.property}</span>
          </div>
          <ul className="grid gap-2">
            {rows.map((r, i) => {
              const err = rowErrors[i]
              return (
                <li key={r.id} className="grid grid-cols-[11.5em_minmax(0,1fr)_10em_44px] items-start gap-2 max-mobile:grid-cols-[minmax(0,1fr)_44px] max-mobile:rounded-2xl max-mobile:border max-mobile:border-line max-mobile:p-2">
                  <select aria-label={d.brand} value={r.brandId} onChange={(e) => update(i, { brandId: e.target.value })} className={cn(field, 'cursor-pointer border-line-2 max-mobile:col-span-1')}>
                    {ws.brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <span className="max-mobile:col-span-2 max-mobile:row-start-2">
                    <input
                      aria-label={d.domain}
                      value={r.domain}
                      onChange={(e) => update(i, { domain: e.target.value })}
                      placeholder="example.com"
                      spellCheck={false}
                      aria-invalid={showErrors && !!err.domain}
                      className={cn(field, showErrors && err.domain ? 'border-coral' : 'border-line-2')}
                    />
                    {showErrors && err.domain && <small className="mt-1 block text-[12.5px] font-semibold text-bad">{err.domain}</small>}
                  </span>
                  <span className="max-mobile:col-span-2 max-mobile:row-start-3">
                    <input
                      aria-label={`${d.property} · ${r.domain}`}
                      value={r.propertyId}
                      onChange={(e) => update(i, { propertyId: e.target.value })}
                      placeholder={d.propertyPlaceholder}
                      inputMode="numeric"
                      spellCheck={false}
                      aria-invalid={!!err.property}
                      className={cn(field, err.property ? 'border-coral' : 'border-line-2')}
                    />
                    {err.property && <small className="mt-1 block text-[12.5px] font-semibold text-bad">{err.property}</small>}
                  </span>
                  <IconButton
                    label={d.remove(r.domain)}
                    icon={Trash2}
                    onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))}
                    size="lg"
                    className="max-mobile:col-start-2 max-mobile:row-start-1"
                  />
                </li>
              )
            })}
          </ul>
          <div>
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onClick={() => setRows((rs) => [...rs, { id: `web-${Date.now().toString(36)}`, brandId: ws.brands[0]?.id ?? '', domain: '', propertyId: '' }])}
            >
              {d.addSite}
            </Button>
          </div>
        </fieldset>

        {tried === 'connect' && connectProblem && (
          <p role="alert" className="text-2xs font-semibold text-bad">
            {connectProblem}
          </p>
        )}
      </div>
    </Modal>
  )
}
