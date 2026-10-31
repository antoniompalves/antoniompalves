import { useState } from 'react'
import { Modal } from '../Modal'
import { Button, NetIcon, cn } from '../ui'
import { SUPPORTED } from '../../data/channels'
import { brandsFor } from '../../data/scope'
import { NETWORK_LABEL } from '../../data/selectors'
import { useWorkspace } from '../../data/store'
import type { NetworkId } from '../../data/types'
import { useI18n } from '../../i18n'

/**
 * "Connect a channel": pick the network and the brand, then sign in to the
 * network (the authorise step). A brand already connected there is refused;
 * one that dropped off is signed in again.
 */
export function ConnectDialog({ network, brandId, onContinue, onClose }: { network?: NetworkId; brandId?: string; onContinue: (brandId: string, network: NetworkId) => void; onClose: () => void }) {
  const { t } = useI18n()
  const { all } = useWorkspace()
  const d = t.channels.connectDialog
  const brands = brandsFor(all)
  const [net, setNet] = useState<NetworkId>(network ?? 'instagram')
  const [brand, setBrand] = useState(brandId ?? brands[0]?.id ?? '')
  const [error, setError] = useState('')

  const submit = () => {
    const b = all.brands.find((x) => x.id === brand)
    if (!b) return
    const existing = all.channels.find((c) => c.brandId === b.id && c.network === net)
    if (existing?.status === 'connected') return setError(d.already(b.name, NETWORK_LABEL[net]))
    onContinue(b.id, net)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={d.title}
      sub={d.sub}
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
      <div role="radiogroup" aria-label={d.network} className="grid grid-cols-4 gap-2 max-[481px]:grid-cols-2">
        {SUPPORTED.map((n) => (
          <label
            key={n}
            className={cn(
              'relative grid cursor-pointer justify-items-center gap-1.5 rounded-[18px] border-[1.5px] px-1.5 pb-3 pt-3.5 text-center text-2xs font-semibold has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-text',
              net === n ? 'border-text bg-glass-3' : 'border-line bg-glass-2',
            )}
          >
            <input
              type="radio"
              name="net"
              value={n}
              checked={net === n}
              onChange={() => {
                setNet(n)
                setError('')
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            <NetIcon network={n} size="md" />
            <span>{NETWORK_LABEL[n]}</span>
          </label>
        ))}
      </div>
      <label>
        <span className="mb-1.5 block px-0.5 text-2xs font-semibold text-muted">{d.brand}</span>
        <select
          name="brandId"
          value={brand}
          onChange={(e) => {
            setBrand(e.target.value)
            setError('')
          }}
          className="h-[46px] w-full min-w-0 cursor-pointer rounded-[14px] border border-line-2 bg-glass-2 px-3 text-sm text-text outline-none focus-visible:border-text"
        >
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
    </Modal>
  )
}
