import { ArrowLeftRight, Check, Link } from 'lucide-react'
import { KataruMark } from './Logo'
import { Modal } from './Modal'
import { useToast } from './Toast'
import { Button, NetIcon } from './ui'
import { newChannel } from '../data/channels'
import { NETWORK_LABEL } from '../data/selectors'
import { useWorkspace } from '../data/store'
import type { Channel } from '../data/types'
import { useI18n } from '../i18n'

/**
 * "Authorise on Facebook": the network's sign-in, as the demo plays it. Allowing
 * access connects the channel — a new one, or an existing one again — with a
 * fresh 60-day token, logs it and says so.
 */
export function AuthoriseDialog({ channel, now, onClose, onAllowed }: { channel: Channel | null; now: Date; onClose: () => void; onAllowed?: (c: Channel) => void }) {
  const { ws, all, dispatch } = useWorkspace()
  const { t } = useI18n()
  const toast = useToast()
  const a = t.authorise
  if (!channel) return null
  const brand = all.brands.find((b) => b.id === channel.brandId)!
  const net = NETWORK_LABEL[channel.network]
  const again = all.channels.some((c) => c.id === channel.id)
  const allow = () => {
    const fresh = newChannel(all, channel.brandId, channel.network, ws.currentUserId, now.getTime())
    dispatch({ type: 'saveChannel', channel: again ? { ...channel, status: 'connected', paused: channel.paused, tokenExpiresAt: fresh.tokenExpiresAt, lastSyncAt: fresh.lastSyncAt, connectedById: ws.currentUserId } : channel })
    dispatch({
      type: 'audit',
      event: { id: `au-${Date.now().toString(36)}`, actorId: ws.currentUserId, kind: 'channel', action: { type: 'connectedChannel', brandId: brand.id, network: channel.network, again }, at: now.toISOString() },
    })
    onClose()
    onAllowed?.(channel)
    toast({ text: a.connected(brand.name, net), icon: Link })
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={a.title(net)}
      sub={a.sub(brand.handle)}
      onSubmit={allow}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {a.cancel}
          </Button>
          <Button type="submit">
            {a.allow}
          </Button>
        </>
      }
    >
      <div>
        <div className="flex items-center justify-center gap-4 pb-1 pt-2.5" aria-hidden>
          <NetIcon network={channel.network} size="lg" />
          <ArrowLeftRight size={20} className="text-muted" />
          <span className="grid size-[46px] place-items-center rounded-[14px] bg-pill text-on-pill">
            <KataruMark size={26} />
          </span>
        </div>
        <ul className="mt-3.5 grid gap-2 text-xs leading-[1.45]">
          {a.scopes(brand.name).map((s) => (
            <li key={s} className="flex items-center gap-2.5">
              <Check size={18} aria-hidden className="shrink-0 text-good" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
