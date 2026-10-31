import { useState } from 'react'
import { Lock, Plus, Unlink } from 'lucide-react'
import { Modal } from '../Modal'
import { Badge, BrandMark, Button, Card, IconButton, NetIcon, cn } from '../ui'
import { lockTitle } from '../../data/permissions'
import { brandsFor } from '../../data/scope'
import { useWorkspace } from '../../data/store'
import type { InboxAccount, Workspace } from '../../data/types'
import { useI18n } from '../../i18n'

type Source = 'whatsapp' | 'google'

/**
 * "Messaging & reviews": where the inbox's WhatsApp, Messenger and Google
 * conversations come from. WhatsApp numbers and Google locations are
 * connected per brand here; Messenger comes with each brand's Facebook Page.
 */
export function InboxSourcesCard({ ws, me, onConnect, onDisconnect }: { ws: Workspace; me: string; onConnect: (source: Source, brandId: string) => void; onDisconnect: (a: InboxAccount) => void }) {
  const { t } = useI18n()
  const c = t.channels.inboxCard
  const lock = lockTitle(t, ws, me, 'channels.manage')
  const row = 'flex min-w-0 items-center gap-2.5 py-1.5'
  const section = (source: Source | 'messenger', what: string) => {
    const name = c[source]
    const count = source === 'messenger' ? ws.channels.filter((x) => x.network === 'facebook' && x.status !== 'disconnected').length : ws.inboxAccounts.filter((a) => a.source === source).length
    return (
      <li key={source} className="border-b border-line py-2.5 last:border-b-0">
        <div className="flex items-start gap-3">
          <NetIcon network={source} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <b className="font-bold">{name}</b>
              <Badge tone={count ? 'pine' : 'plain'} size="tight">
                {count ? c.connected(count) : c.notConnected}
              </Badge>
            </div>
            <small className="mt-0.5 block text-[12.5px] text-muted">{what}</small>
            <ul className="mt-1.5 grid">
              {ws.brands.map((b) => {
                if (source === 'messenger') {
                  const page = ws.channels.find((x) => x.brandId === b.id && x.network === 'facebook')
                  return (
                    <li key={b.id} className={row}>
                      <BrandMark brand={b} size="xs" />
                      <span title={page && page.status !== 'disconnected' ? `${page.handle} · ${c.viaPage}` : undefined} className={cn('min-w-0 flex-1 truncate text-2xs', page && page.status !== 'disconnected' ? 'font-semibold' : 'text-muted')}>
                        {page && page.status !== 'disconnected' ? `${page.handle} · ${c.viaPage}` : c.notConnected}
                      </span>
                    </li>
                  )
                }
                const acc = ws.inboxAccounts.find((a) => a.brandId === b.id && a.source === source)
                return (
                  <li key={b.id} className={row}>
                    <BrandMark brand={b} size="xs" />
                    <span className={cn('min-w-0 flex-1 truncate text-2xs', acc ? 'font-semibold tabular-nums' : 'text-muted')} title={acc?.label}>
                      {acc ? acc.label : c.notConnected}
                    </span>
                    {acc ? (
                      <IconButton label={c.disconnect(name, b.name)} icon={lock ? Lock : Unlink} size="sm" disabled={!!lock} title={lock ?? c.disconnect(name, b.name)} onClick={() => onDisconnect(acc)} className="-my-1" />
                    ) : (
                      <IconButton label={c.connect(name, b.name)} icon={lock ? Lock : Plus} size="sm" disabled={!!lock} title={lock ?? c.connect(name, b.name)} onClick={() => onConnect(source, b.id)} className="-my-1" />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </li>
    )
  }
  return (
    <Card title={c.title} sub={c.sub} className="animate-rise">
      <ul className="grid">
        {section('whatsapp', c.whatsappWhat)}
        {section('messenger', c.messengerWhat)}
        {section('google', c.googleWhat)}
      </ul>
    </Card>
  )
}

/** "Connect WhatsApp Business" / "Connect Google Business Profile": the brand, and the number or the location. */
export function InboxConnectDialog({ source, brandId, onConnect, onClose }: { source: Source; brandId: string; onConnect: (brandId: string, label: string) => void; onClose: () => void }) {
  const { t } = useI18n()
  const { all } = useWorkspace()
  const d = t.channels.inboxDialog
  const name = t.channels.inboxCard[source]
  const brands = brandsFor(all)
  const [brand, setBrand] = useState(brandId)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const submit = () => {
    const b = all.brands.find((x) => x.id === brand)
    if (!b) return
    if (all.inboxAccounts.some((a) => a.brandId === b.id && a.source === source)) return setError(d.already(b.name, name))
    const v = value.trim()
    if (source === 'whatsapp' && !/^\+\d[\d\s-]{6,}$/.test(v)) return setError(d.badPhone)
    if (source === 'google' && v.length < 4) return setError(d.noLocation)
    onConnect(b.id, v)
  }
  const field = 'h-[46px] w-full min-w-0 rounded-[14px] border border-line-2 bg-glass-2 px-3 text-sm text-text outline-none focus-visible:border-text'
  const label = 'mb-1.5 block px-0.5 text-2xs font-semibold text-muted'
  return (
    <Modal
      open
      onClose={onClose}
      title={d.title(name)}
      sub={source === 'whatsapp' ? d.whatsappSub : d.googleSub}
      onSubmit={submit}
      error={error}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {d.cancel}
          </Button>
          <Button type="submit">{d.submit}</Button>
        </>
      }
    >
      <label>
        <span className={label}>{d.brand}</span>
        <select value={brand} onChange={(e) => (setBrand(e.target.value), setError(''))} className={cn(field, 'cursor-pointer')}>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={label}>{source === 'whatsapp' ? d.phone : d.location}</span>
        <input
          autoFocus
          value={value}
          inputMode={source === 'whatsapp' ? 'tel' : undefined}
          autoComplete="off"
          onChange={(e) => (setValue(e.target.value), setError(''))}
          placeholder={source === 'whatsapp' ? d.phonePlaceholder : d.locationPlaceholder}
          aria-invalid={!!error}
          className={cn(field, error && 'border-coral')}
        />
      </label>
    </Modal>
  )
}
