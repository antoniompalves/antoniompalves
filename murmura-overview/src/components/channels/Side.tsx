import { useState } from 'react'
import { Check, ChevronDown, Lock, Minus, Plus, Users } from 'lucide-react'
import { Card, Badge, IconButton, NetIcon, cn } from '../ui'
import { Empty } from '../analytics/parts'
import { CAPS, SUPPORTED, audienceByNetwork } from '../../data/channels'
import { lockTitle } from '../../data/permissions'
import { NETWORK_LABEL } from '../../data/selectors'
import type { NetworkId, Workspace } from '../../data/types'
import { useI18n } from '../../i18n'

const BAR: Record<NetworkId, string> = {
  instagram: 'bg-n-instagram',
  facebook: 'bg-n-facebook',
  x: 'bg-n-x',
  linkedin: 'bg-n-linkedin',
  tiktok: 'bg-n-tiktok',
  youtube: 'bg-n-youtube',
  pinterest: 'bg-n-pinterest',
  threads: 'bg-n-threads',
}

/** "Audience by network": followers per network, largest first, as bars in the network's colour. */
export function AudienceCard({ ws }: { ws: Workspace }) {
  const { t } = useI18n()
  const a = t.channels.audience
  const { rows, total, max } = audienceByNetwork(ws)
  return (
    <Card title={a.title} sub={a.sub(t.numbers.compact(total), ws.channels.length)} className="animate-rise">
      {rows.length ? (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.network} className="flex items-center gap-3">
              <NetIcon network={r.network} size="sm" />
              <span className="grid min-w-0 flex-1 gap-1.5">
                <span className="flex justify-between gap-2 text-2xs">
                  <b className="font-bold">{NETWORK_LABEL[r.network]}</b>
                  <span className="font-bold tabular-nums">
                    {t.numbers.compact(r.followers)} <small className="ml-1 font-semibold text-muted max-mobile:text-[12.5px]">{t.numbers.pct0(r.followers / total)}</small>
                  </span>
                </span>
                <span className="block h-[7px] overflow-hidden rounded-full bg-well">
                  <span className={cn('block h-full w-full origin-left rounded-full transition-transform duration-700 ease-soft', BAR[r.network])} style={{ transform: `scaleX(${r.followers / max})` }} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={Users} title={a.emptyTitle} text={a.emptyText} compact />
      )}
    </Card>
  )
}

/** "Supported networks": each network, how many accounts it has here, what it does, and + to connect one (phones show four first). */
export function NetworksCard({ ws, me, onConnect }: { ws: Workspace; me: string; onConnect: (network: NetworkId) => void }) {
  const { t } = useI18n()
  const n = t.channels.networks
  const [all, setAll] = useState(false)
  const lock = lockTitle(t, ws, me, 'channels.manage')
  const manage = !lock
  const used = new Set(ws.channels.map((c) => c.network)).size
  const cap = (on: boolean, label: string) => (
    <span title={n.capTitle(label, on)} className={cn('inline-flex items-center gap-1 rounded-full bg-well py-[3px] pl-1.5 pr-2 text-[12.5px] font-semibold', on ? 'text-text' : 'text-faint')}>
      {on ? <Check size={13} strokeWidth={2.2} aria-hidden className="text-good" /> : <Minus size={13} strokeWidth={2.2} aria-hidden />}
      {label}
    </span>
  )
  return (
    <Card title={n.title} sub={n.sub(used, SUPPORTED.length)} className="animate-rise">
      <ul className="grid gap-1">
        {SUPPORTED.map((id, i) => {
          const count = ws.channels.filter((c) => c.network === id).length
          return (
            <li key={id} className={cn('flex items-start gap-3 border-b border-line py-2.5 last:border-b-0', !all && i >= 4 && 'max-mobile:hidden', !all && i === 3 && 'max-mobile:border-b-0')}>
              <NetIcon network={id} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="font-bold">{NETWORK_LABEL[id]}</b>
                  <Badge tone={count ? 'pine' : 'plain'} size="tight">
                    {count ? n.connected(count) : n.none}
                  </Badge>
                  <IconButton
                    label={n.connect(NETWORK_LABEL[id])}
                    icon={manage ? Plus : Lock}
                    size="sm"
                    disabled={!manage}
                    title={lock ?? n.connect(NETWORK_LABEL[id])}
                    onClick={() => onConnect(id)}
                    className="-my-1.5 ml-auto"
                  />
                </div>
                <small className="mt-0.5 block text-[12.5px] text-muted">{n.what[id]}</small>
                <div className="mt-[7px] flex flex-wrap gap-1.5">
                  {cap(CAPS[id].publish, n.caps.publish)}
                  {cap(CAPS[id].inbox, n.caps.inbox)}
                  {cap(CAPS[id].analytics, n.caps.analytics)}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {!all && (
        <button type="button" onClick={() => setAll(true)} className="mt-2 hidden min-h-11 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-2xl bg-well text-2xs font-bold text-text max-mobile:inline-flex">
          <ChevronDown size={16} aria-hidden />
          {n.showAll(SUPPORTED.length)}
        </button>
      )}
    </Card>
  )
}
