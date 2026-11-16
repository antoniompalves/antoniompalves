import { useState } from 'react'
import { ExternalLink, Globe, Link, Lock, Plus, Trash2 } from 'lucide-react'
import { Modal } from '../Modal'
import { PageTitle, Stat } from '../PageHead'
import { useToast } from '../Toast'
import { BrandMark, Button, Card, IconButton, NetIcon } from '../ui'
import { SUPPORTED } from '../../data/channels'
import { can, lockTitle } from '../../data/permissions'
import { cleanPostUrl } from '../../data/planner'
import { brandsFor } from '../../data/scope'
import { NETWORK_LABEL } from '../../data/selectors'
import { useWorkspace } from '../../data/store'
import type { Channel, NetworkId } from '../../data/types'
import { useI18n } from '../../i18n'

const field = 'h-[46px] w-full min-w-0 rounded-[14px] border border-line-2 bg-glass-2 px-3 text-sm text-text outline-none focus-visible:border-text'

/**
 * #/channels in planner mode: each brand's profiles on the networks, kept by
 * hand. Nothing is connected; the profiles are what posts can be planned
 * for, with a link to open each one.
 */
export function Profiles({ now }: { now: Date }) {
  const { t } = useI18n()
  const p = t.planner.profiles
  const { ws, undoable } = useWorkspace()
  const toast = useToast()
  const me = ws.currentUserId
  const manage = can(ws, me, 'channels.manage')
  const lock = lockTitle(t, ws, me, 'channels.manage')
  const [adding, setAdding] = useState<string | null>(null)
  const brands = brandsFor(ws)
  const networks = new Set(ws.channels.map((c) => c.network))

  const remove = (c: Channel) => toast({ text: p.removed, icon: Trash2, undo: undoable({ type: 'removeChannel', id: c.id }) })

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center gap-x-[clamp(28px,4vw,72px)] gap-y-[18px] max-mobile:mb-[18px] max-mobile:gap-y-3">
        <PageTitle lines={[p.title]} label={p.title} />
        <dl className="flex flex-wrap gap-x-[clamp(24px,3.2vw,56px)] gap-y-3.5 max-mobile:grid max-mobile:w-full max-mobile:grid-cols-2 max-mobile:gap-x-3.5 max-mobile:gap-y-2.5">
          <Stat icon={Link} value={t.numbers.int(ws.channels.length)} label={p.title} />
          <Stat icon={Globe} value={t.numbers.int(networks.size)} label={t.channels.stats.networks(SUPPORTED.length)} />
        </dl>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 max-mobile:ml-0 max-mobile:w-full">
          <Button icon={manage ? Plus : Lock} disabled={!manage} title={lock} onClick={() => setAdding(brands[0]?.id ?? null)} className="max-mobile:flex-1">
            {p.add}
          </Button>
        </div>
      </header>
      <p className="mb-4 max-w-[720px] text-xs text-muted">{p.sub}</p>
      <div className="grid gap-4 tablet:grid-cols-2 desk:grid-cols-3">
        {brands.map((b) => {
          const list = ws.channels.filter((c) => c.brandId === b.id).sort((x, y) => SUPPORTED.indexOf(x.network) - SUPPORTED.indexOf(y.network))
          return (
            <Card
              key={b.id}
              title={
                <span className="inline-flex min-w-0 items-center gap-2.5">
                  <BrandMark brand={b} size="sm" />
                  <span className="truncate">{b.name}</span>
                </span>
              }
              tools={manage ? <IconButton label={p.add} icon={Plus} onClick={() => setAdding(b.id)} /> : undefined}
            >
              {list.length === 0 ? (
                <div className="grid gap-1 rounded-[18px] border border-dashed border-line-2 p-5 text-center">
                  <b className="text-xs font-semibold">{p.none}</b>
                  <small className="text-2xs text-muted">{p.noneSub}</small>
                </div>
              ) : (
                <ul className="grid gap-1.5">
                  {list.map((c) => (
                    <li key={c.id} className="flex min-w-0 items-center gap-2.5 rounded-[16px] border border-line bg-glass-2 py-1.5 pl-2 pr-1.5">
                      <NetIcon network={c.network} size="md" />
                      <span className="grid min-w-0 flex-1">
                        <b className="truncate text-xs font-semibold">{c.handle}</b>
                        <small className="truncate text-2xs text-muted">{NETWORK_LABEL[c.network]}</small>
                      </span>
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noreferrer noopener" aria-label={p.open} title={p.open} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-well hover:text-text">
                          <ExternalLink size={17} aria-hidden />
                        </a>
                      )}
                      {manage && <IconButton label={p.remove(`${NETWORK_LABEL[c.network]} ${c.handle}`)} icon={Trash2} onClick={() => remove(c)} />}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )
        })}
      </div>
      {adding && <AddProfileDialog brandId={adding} now={now} onClose={() => setAdding(null)} />}
    </>
  )
}

function AddProfileDialog({ brandId: first, now, onClose }: { brandId: string; now: Date; onClose: () => void }) {
  const { t } = useI18n()
  const p = t.planner.profiles
  const { ws, dispatch } = useWorkspace()
  const toast = useToast()
  const brands = brandsFor(ws)
  const [brandId, setBrandId] = useState(first)
  const taken = (b: string) => new Set(ws.channels.filter((c) => c.brandId === b).map((c) => c.network))
  const [network, setNetwork] = useState<NetworkId>(() => SUPPORTED.find((n) => !taken(first).has(n)) ?? 'instagram')
  const [handle, setHandle] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    if (!handle.trim()) return setError(p.needHandle)
    if (taken(brandId).has(network)) return setError(p.exists)
    const link = url.trim() ? cleanPostUrl(url) : null
    if (url.trim() && !link) return setError(t.planner.badLink)
    const at = new Date(Math.floor(now.getTime() / 60_000) * 60_000).toISOString()
    dispatch({
      type: 'saveChannel',
      channel: {
        id: `ch-${brandId}-${network}`,
        brandId,
        network,
        handle: handle.trim().slice(0, 80),
        followers: 0,
        status: 'connected',
        tokenExpiresAt: at,
        connectedById: ws.currentUserId,
        connectedAt: at,
        lastSyncAt: at,
        manual: true,
        ...(link && { url: link }),
      },
    })
    toast({ text: p.added, icon: Plus })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={p.addTitle}
      onSubmit={submit}
      error={error}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.planner.cancel}
          </Button>
          <Button type="submit" icon={Plus}>
            {p.add}
          </Button>
        </>
      }
    >
      <label className="grid gap-1.5">
        <span className="px-0.5 text-2xs font-semibold text-muted">{p.brand}</span>
        <select value={brandId} onChange={(e) => (setBrandId(e.target.value), setError(''))} className={field}>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="px-0.5 text-2xs font-semibold text-muted">{p.network}</span>
        <select value={network} onChange={(e) => (setNetwork(e.target.value as NetworkId), setError(''))} className={field}>
          {SUPPORTED.map((n) => (
            <option key={n} value={n} disabled={taken(brandId).has(n)}>
              {NETWORK_LABEL[n]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="px-0.5 text-2xs font-semibold text-muted">{p.handle}</span>
        <input value={handle} onChange={(e) => (setHandle(e.target.value), setError(''))} placeholder="@" className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className="px-0.5 text-2xs font-semibold text-muted">{p.url}</span>
        <input type="url" inputMode="url" value={url} onChange={(e) => (setUrl(e.target.value), setError(''))} placeholder="https://" className={field} />
      </label>
    </Modal>
  )
}
