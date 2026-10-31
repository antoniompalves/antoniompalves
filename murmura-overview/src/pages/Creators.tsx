import { useState } from 'react'
import { BarChart3, Check, Download, Handshake, Lock, Megaphone, Plus, Radio, Search, Trash2, UserPlus, Users, Wallet } from 'lucide-react'
import { ConfirmDialog } from '../components/Modal'
import { PageTitle, Stat } from '../components/PageHead'
import { useToast } from '../components/Toast'
import { download } from '../components/analytics/exportCsv'
import { CampaignCard, CreatorCard } from '../components/creators/Cards'
import type { CampaignHandlers } from '../components/creators/Cards'
import { CampaignDialog, CreatorDialog, DeliverableDialog, ResultsDialog, deliverableWhere } from '../components/creators/Dialogs'
import { Button, Segmented, cn } from '../components/ui'
import { creatorStats, deliverablesOf, matchesCreator, resultsRows, sortedCampaigns } from '../data/creators'
import { can, lockTitle } from '../data/permissions'
import { NETWORK_LABEL } from '../data/selectors'
import { useWorkspace } from '../data/store'
import type { AuditAction, Creator, CreatorCampaign, CreatorStatus, Deliverable, DeliverableStatus, NetworkId } from '../data/types'
import { useI18n } from '../i18n'

type Dialog =
  | { kind: 'creator'; creator?: Creator }
  | { kind: 'campaign'; campaign?: CreatorCampaign }
  | { kind: 'deliverable'; deliverable?: Deliverable; campaignId?: string; creatorId?: string }
  | { kind: 'results'; deliverable: Deliverable }
  | { kind: 'deleteCampaign'; campaign: CreatorCampaign }
  | { kind: 'removeCreator'; creator: Creator }

const quote = (v: string | number, sep: string) => {
  const s = String(v)
  return s.includes(sep) || /["\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * Creators (#/creators), not in the reference: creator campaigns tracked by
 * hand. Each campaign has a brand, dates, a budget and a goal; each
 * deliverable a creator, a network and format, a due date and a fee, and the
 * results the team copies from the creator's insights. Nothing is read from
 * the creators' accounts.
 */
export function Creators({ now }: { now: Date }) {
  const { ws, all, dispatch } = useWorkspace()
  const { t } = useI18n()
  const toast = useToast()
  const c = t.creators
  const me = ws.currentUserId
  const nowMs = Math.floor(now.getTime() / 60_000) * 60_000
  const manage = can(ws, me, 'creators.manage')
  const lock = lockTitle(t, ws, me, 'creators.manage')
  const money = (n: number, digits = 0) => t.numbers.money(n, all.settings.currency, digits)

  const [tab, setTab] = useState<'campaigns' | 'roster'>('campaigns')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<CreatorStatus | 'all'>('all')
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const stats = creatorStats(ws)
  const campaigns = sortedCampaigns(ws, nowMs)
  const roster = all.creators.filter((x) => (status === 'all' || x.status === status) && matchesCreator(x, query))
  const creatorName = (id: string) => all.creators.find((x) => x.id === id)?.name ?? ''
  const firstName = (id: string) => creatorName(id).split(' ')[0]

  const audit = (action: AuditAction) => dispatch({ type: 'audit', event: { id: `au-${Date.now().toString(36)}`, actorId: me, kind: 'creator', action, at: new Date(nowMs).toISOString() } })
  const snapshot = () => {
    const before = { creators: all.creators, creatorCampaigns: all.creatorCampaigns, deliverables: all.deliverables }
    return () => dispatch({ type: 'restoreCreators', ...before })
  }
  const guard = (run: () => void) => (manage ? run() : toast({ text: c.toast.cant, icon: Lock }))

  /* ───── saving ───── */

  const saveCreator = (x: Creator) => {
    const isNew = !all.creators.some((y) => y.id === x.id)
    setDialog(null)
    dispatch({ type: 'saveCreator', creator: x })
    if (isNew) audit({ type: 'addedCreator', name: x.name })
    toast({ text: isNew ? c.toast.creatorAdded(x.name) : c.toast.creatorSaved, icon: UserPlus })
  }

  const saveCampaign = (x: CreatorCampaign) => {
    const isNew = !all.creatorCampaigns.some((y) => y.id === x.id)
    setDialog(null)
    dispatch({ type: 'saveCreatorCampaign', campaign: x })
    if (isNew) audit({ type: 'createdCreatorCampaign', name: x.name, brandId: x.brandId })
    toast({ text: isNew ? c.toast.campaignCreated(x.name) : c.toast.campaignSaved, icon: Megaphone })
    if (isNew) setTab('campaigns')
  }

  const saveDeliverable = (d: Deliverable) => {
    const isNew = !all.deliverables.some((y) => y.id === d.id)
    setDialog(null)
    dispatch({ type: 'saveDeliverable', deliverable: d })
    toast({ text: isNew ? c.toast.deliverableAdded : c.toast.deliverableSaved, icon: Handshake })
    if (isNew) setTab('campaigns')
  }

  const saveResults = (d: Deliverable) => {
    setDialog(null)
    const undo = snapshot()
    dispatch({ type: 'saveDeliverable', deliverable: d })
    audit({ type: 'loggedResults', creator: creatorName(d.creatorId), network: d.network })
    toast({ text: c.toast.resultsLogged(firstName(d.creatorId)), icon: BarChart3, undo })
  }

  const setDeliverableStatus = (d: Deliverable, s: DeliverableStatus) => {
    const undo = snapshot()
    dispatch({ type: 'saveDeliverable', deliverable: { ...d, status: s } })
    toast({ text: c.toast.status(c.status[s]), icon: Check, undo })
    // Going live is the moment to log what it did.
    if (s === 'live' && !d.results) window.setTimeout(() => setDialog({ kind: 'results', deliverable: { ...d, status: s } }), 250)
  }

  const togglePaid = (d: Deliverable) => {
    const undo = snapshot()
    dispatch({ type: 'saveDeliverable', deliverable: { ...d, paid: !d.paid } })
    toast({ text: d.paid ? c.toast.unpaid(firstName(d.creatorId)) : c.toast.paid(firstName(d.creatorId), money(d.fee)), icon: Wallet, undo })
  }

  const deleteDeliverable = (d: Deliverable) => {
    const undo = snapshot()
    dispatch({ type: 'deleteDeliverable', id: d.id })
    toast({ text: c.toast.deliverableDeleted, icon: Trash2, undo })
  }

  const exportCampaign = (x: CreatorCampaign) => {
    const rows = resultsRows(all, x.id, {
      header: c.csv.header,
      status: c.status,
      network: (n) => NETWORK_LABEL[n as NetworkId],
      format: (d) => deliverableWhere(t, d.network, d.format).split(' · ')[1],
      yes: c.csv.yes,
      no: c.csv.no,
      pct: (f) => t.numbers.decimal(Math.round(f * 10_000) / 100),
    })
    download(c.csv.file(slug(x.name)), rows.map((r) => r.map((v) => quote(v, c.csv.separator)).join(c.csv.separator)).join('\r\n'))
    toast({ text: c.toast.exported, icon: Download })
  }

  const confirmDelete = () => {
    if (!dialog) return
    const undo = snapshot()
    if (dialog.kind === 'deleteCampaign') {
      dispatch({ type: 'deleteCreatorCampaign', id: dialog.campaign.id })
      toast({ text: c.toast.campaignDeleted(dialog.campaign.name), icon: Trash2, undo })
    } else if (dialog.kind === 'removeCreator') {
      dispatch({ type: 'deleteCreator', id: dialog.creator.id })
      toast({ text: c.toast.creatorRemoved(dialog.creator.name), icon: Trash2, undo })
    }
    setDialog(null)
  }

  const handlers: CampaignHandlers = {
    manage,
    lock,
    money,
    onAddDeliverable: (x) => guard(() => setDialog({ kind: 'deliverable', campaignId: x.id })),
    onEditCampaign: (x) => guard(() => setDialog({ kind: 'campaign', campaign: x })),
    onDeleteCampaign: (x) => guard(() => setDialog({ kind: 'deleteCampaign', campaign: x })),
    onExport: exportCampaign,
    onStatus: (d, s) => guard(() => setDeliverableStatus(d, s)),
    onPaid: (d) => guard(() => togglePaid(d)),
    onResults: (d) => guard(() => setDialog({ kind: 'results', deliverable: d })),
    onEditDeliverable: (d) => guard(() => setDialog({ kind: 'deliverable', deliverable: d })),
    onDeleteDeliverable: (d) => guard(() => deleteDeliverable(d)),
  }

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center gap-x-[clamp(28px,4vw,72px)] gap-y-[18px] max-mobile:mb-[18px] max-mobile:gap-y-3">
        <PageTitle lines={[c.title]} label={c.title} />
        <dl className="flex flex-wrap gap-x-[clamp(24px,3.2vw,56px)] gap-y-3.5 max-mobile:grid max-mobile:w-full max-mobile:grid-cols-2 max-mobile:gap-x-3.5 max-mobile:gap-y-2.5">
          <Stat icon={Users} value={t.numbers.int(stats.active)} label={c.stats.active} />
          <Stat icon={Radio} value={t.numbers.int(stats.live)} label={c.stats.live(stats.count)} />
          <Stat icon={Wallet} value={money(stats.paid)} label={`${c.stats.paid} · ${c.stats.agreed(money(stats.agreed))}`} />
          <Stat icon={BarChart3} value={stats.cpe === null ? '—' : money(stats.cpe, 2)} label={c.stats.cpe} />
        </dl>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 max-mobile:ml-0 max-mobile:w-full">
          <Button variant="ghost" icon={manage ? Megaphone : Lock} disabled={!manage} title={lock} onClick={() => setDialog({ kind: 'campaign' })} className="max-mobile:flex-1">
            {c.newCampaign}
          </Button>
          <Button icon={manage ? UserPlus : Lock} disabled={!manage} title={lock} onClick={() => setDialog({ kind: 'creator' })} className="max-mobile:flex-1">
            {c.addCreator}
          </Button>
        </div>
      </header>

      {!manage && (
        <p className="mb-4 flex items-center gap-2.5 rounded-2xl bg-well px-3.5 py-[11px] text-2xs font-semibold text-muted">
          <Lock size={17} aria-hidden className="shrink-0 text-text" />
          <span>{c.readOnly}</span>
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Segmented
          label={c.show}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'campaigns', label: `${c.tabs.campaigns} · ${campaigns.length}` },
            { value: 'roster', label: `${c.tabs.roster} · ${all.creators.length}` },
          ]}
        />
        {tab === 'roster' && (
          <>
            <Segmented
              label={c.roster.search}
              value={status}
              onChange={setStatus}
              options={(['all', 'active', 'prospect', 'past'] as const).map((s) => ({ value: s, label: c.roster.filter[s] }))}
            />
            <label className="ml-auto inline-flex h-11 min-w-0 max-w-[340px] flex-[1_1_220px] items-center gap-2 rounded-full border border-line-2 bg-glass-2 px-4 text-muted focus-within:border-text max-mobile:ml-0 max-mobile:max-w-none max-mobile:basis-full">
              <Search size={20} aria-hidden className="shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={c.roster.searchPlaceholder}
                aria-label={c.roster.search}
                autoComplete="off"
                className="h-full w-full min-w-0 bg-transparent text-text outline-none placeholder:text-muted max-mobile:text-[16px]"
              />
            </label>
          </>
        )}
      </div>

      {tab === 'campaigns' ? (
        <div className="grid gap-4">
          {campaigns.map((x) => (
            <CampaignCard key={x.id} campaign={x} ws={ws} now={nowMs} h={handlers} />
          ))}
          {!campaigns.length && (
            <div className="grid justify-items-center gap-1.5 rounded-card border border-rim bg-glass px-4 py-12 text-center shadow-card">
              <Megaphone size={30} aria-hidden className="text-muted opacity-70" />
              <p className="text-md font-semibold">{c.campaign.emptyTitle}</p>
              <p className="max-w-[340px] text-xs text-muted">{c.dialogs.campaign.sub}</p>
              <Button size="sm" icon={manage ? Plus : Lock} disabled={!manage} title={lock} onClick={() => setDialog({ kind: 'campaign' })} className="mt-2">
                {c.newCampaign}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className={cn('grid gap-3', roster.length > 0 && 'grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))]')}>
          {roster.map((x) => (
            <CreatorCard
              key={x.id}
              creator={x}
              ws={ws}
              h={{
                manage,
                lock,
                money,
                onEdit: (cr) => guard(() => setDialog({ kind: 'creator', creator: cr })),
                onBook: (cr) => guard(() => setDialog({ kind: 'deliverable', creatorId: cr.id })),
                onRemove: (cr) => guard(() => setDialog({ kind: 'removeCreator', creator: cr })),
              }}
            />
          ))}
          {!roster.length && (
            <div className="grid justify-items-center gap-1.5 rounded-card border border-rim bg-glass px-4 py-12 text-center shadow-card">
              <Search size={30} aria-hidden className="text-muted opacity-70" />
              <p className="text-md font-semibold">{c.roster.emptyTitle(query.trim())}</p>
              <p className="max-w-[340px] text-xs text-muted">{c.roster.emptyText}</p>
            </div>
          )}
        </div>
      )}

      {dialog?.kind === 'creator' && <CreatorDialog creator={dialog.creator} onSave={saveCreator} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'campaign' && <CampaignDialog campaign={dialog.campaign} onSave={saveCampaign} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'deliverable' && <DeliverableDialog deliverable={dialog.deliverable} campaignId={dialog.campaignId} creatorId={dialog.creatorId} onSave={saveDeliverable} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'results' && <ResultsDialog deliverable={dialog.deliverable} creator={firstName(dialog.deliverable.creatorId)} onSave={saveResults} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={dialog?.kind === 'deleteCampaign' || dialog?.kind === 'removeCreator'}
        title={dialog?.kind === 'deleteCampaign' ? c.dialogs.deleteCampaign.title(dialog.campaign.name) : dialog?.kind === 'removeCreator' ? c.dialogs.removeCreator.title(dialog.creator.name) : ''}
        text={
          dialog?.kind === 'deleteCampaign'
            ? c.dialogs.deleteCampaign.text(deliverablesOf(all, dialog.campaign.id).length)
            : dialog?.kind === 'removeCreator'
              ? c.dialogs.removeCreator.text(all.deliverables.filter((d) => d.creatorId === dialog.creator.id).length)
              : ''
        }
        confirm={dialog?.kind === 'removeCreator' ? c.dialogs.removeCreator.confirm : c.dialogs.deleteCampaign.confirm}
        cancel={c.dialogs.cancel}
        onConfirm={confirmDelete}
        onClose={() => setDialog(null)}
      />
    </>
  )
}
