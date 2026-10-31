import { useState } from 'react'
import type { ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { Modal } from '../Modal'
import { Button, IconButton, cn } from '../ui'
import { parseLink } from '../../data/compose'
import { engagementsOf, rateOf } from '../../data/creators'
import { FORMATS } from '../../data/formats'
import { brandsFor } from '../../data/scope'
import { NETWORK_LABEL, NETWORK_ORDER } from '../../data/selectors'
import { useWorkspace } from '../../data/store'
import type { CampaignGoal, Creator, CreatorCampaign, CreatorStatus, Deliverable, DeliverableResults, DeliverableStatus, NetworkId } from '../../data/types'
import { useI18n } from '../../i18n'
import type { Messages } from '../../i18n'
import { STATUS_ORDER } from '../../data/creators'

export const field = 'h-[46px] w-full min-w-0 rounded-[14px] border border-line-2 bg-glass-2 px-3 text-sm text-text outline-none focus-visible:border-text aria-invalid:border-coral'
const labelCls = 'mb-1.5 block px-0.5 text-2xs font-semibold text-muted'

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={cn('block min-w-0', wide && 'col-span-full')}>
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  )
}

const Grid = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-2 gap-3.5 max-mobile:grid-cols-1">{children}</div>

/** "Instagram · Reel", "Pinterest · Pin" — a deliverable's place and format, for tables and lists. */
export const deliverableWhere = (t: Messages, network: NetworkId, format: Deliverable['format']) =>
  `${NETWORK_LABEL[network]} · ${network === 'pinterest' && format === 'post' ? t.compose.formats.pin : t.compose.formats.label[format]}`

const num = (v: string) => {
  const n = Number(v.replace(/[\s,]/g, ''))
  return Number.isFinite(n) && v.trim() !== '' ? Math.max(0, n) : undefined
}

function Footer({ onClose, submit }: { onClose: () => void; submit: string }) {
  const { t } = useI18n()
  return (
    <>
      <Button variant="ghost" onClick={onClose}>
        {t.creators.dialogs.cancel}
      </Button>
      <Button type="submit">{submit}</Button>
    </>
  )
}

/* ───────────────────────── creator ───────────────────────── */

/** "Add a creator" / "Edit creator": name, contact, status, usual fee, tags, profiles and notes. */
export function CreatorDialog({ creator, onSave, onClose }: { creator?: Creator; onSave: (c: Creator) => void; onClose: () => void }) {
  const { t } = useI18n()
  const d = t.creators.dialogs.creator
  const [name, setName] = useState(creator?.name ?? '')
  const [email, setEmail] = useState(creator?.email ?? '')
  const [location, setLocation] = useState(creator?.location ?? '')
  const [status, setStatus] = useState<CreatorStatus>(creator?.status ?? 'active')
  const [rate, setRate] = useState(creator?.rate !== undefined ? String(creator.rate) : '')
  const [tags, setTags] = useState(creator?.tags.join(', ') ?? '')
  const [notes, setNotes] = useState(creator?.notes ?? '')
  const [profiles, setProfiles] = useState(creator?.profiles.map((p) => ({ ...p, followers: String(p.followers) })) ?? [{ network: 'instagram' as NetworkId, handle: '', followers: '' }])
  const [error, setError] = useState('')

  const setProfile = (i: number, patch: Partial<(typeof profiles)[number]>) => {
    setProfiles(profiles.map((p, k) => (k === i ? { ...p, ...patch } : p)))
    setError('')
  }

  const submit = () => {
    if (!name.trim()) return setError(d.needName)
    const kept = profiles.filter((p) => p.handle.trim())
    if (!kept.length) return setError(d.needProfile)
    onSave({
      id: creator?.id ?? `cr-${Date.now().toString(36)}`,
      name: name.trim(),
      ...(creator?.photo && { photo: creator.photo }),
      profiles: kept.map((p) => ({ network: p.network, handle: p.handle.trim(), followers: num(p.followers) ?? 0 })),
      ...(email.trim() && { email: email.trim() }),
      ...(location.trim() && { location: location.trim() }),
      tags: tags
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
      ...(num(rate) !== undefined && { rate: num(rate) }),
      status,
      ...(notes.trim() && { notes: notes.trim() }),
      addedAt: creator?.addedAt ?? new Date().toISOString(),
    })
  }

  return (
    <Modal open onClose={onClose} title={creator ? d.editTitle : d.addTitle} sub={d.sub} onSubmit={submit} error={error} size="lg" footer={<Footer onClose={onClose} submit={creator ? t.creators.dialogs.save : d.add} />}>
      <Grid>
        <Field label={d.name}>
          <input autoFocus value={name} onChange={(e) => (setName(e.target.value), setError(''))} aria-invalid={error === d.needName} className={field} />
        </Field>
        <Field label={d.status}>
          <select value={status} onChange={(e) => setStatus(e.target.value as CreatorStatus)} className={cn(field, 'cursor-pointer')}>
            {(['active', 'prospect', 'past'] as CreatorStatus[]).map((s) => (
              <option key={s} value={s}>
                {t.creators.roster.state[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={d.email}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </Field>
        <Field label={d.location}>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={field} />
        </Field>
        <Field label={d.rate}>
          <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className={cn(field, 'tabular-nums')} />
        </Field>
        <Field label={`${d.tags} · ${d.tagsHint}`}>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className={field} />
        </Field>
      </Grid>
      <fieldset className="grid gap-2">
        <legend className={labelCls}>{d.profiles}</legend>
        {profiles.map((p, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)_minmax(0,0.8fr)_auto] items-center gap-2 max-mobile:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <select aria-label={d.network} value={p.network} onChange={(e) => setProfile(i, { network: e.target.value as NetworkId })} className={cn(field, 'cursor-pointer')}>
              {NETWORK_ORDER.map((n) => (
                <option key={n} value={n}>
                  {NETWORK_LABEL[n]}
                </option>
              ))}
            </select>
            <input aria-label={d.handle} placeholder={d.handle} value={p.handle} onChange={(e) => setProfile(i, { handle: e.target.value })} className={cn(field, 'max-mobile:col-span-2 max-mobile:row-start-2')} />
            <input aria-label={d.followers} placeholder={d.followers} inputMode="numeric" value={p.followers} onChange={(e) => setProfile(i, { followers: e.target.value })} className={cn(field, 'tabular-nums')} />
            <IconButton label={d.removeProfile} icon={X} size="sm" disabled={profiles.length === 1} onClick={() => setProfiles(profiles.filter((_, k) => k !== i))} />
          </div>
        ))}
        <Button variant="ghost" size="sm" icon={Plus} onClick={() => setProfiles([...profiles, { network: 'tiktok', handle: '', followers: '' }])} className="justify-self-start">
          {d.addProfile}
        </Button>
      </fieldset>
      <Field label={d.notes} wide>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={cn(field, 'h-auto resize-y py-2.5')} />
      </Field>
    </Modal>
  )
}

/* ───────────────────────── campaign ───────────────────────── */

/** "New creator campaign" / "Edit campaign": brand, name, dates, budget, goal, the calendar campaign it belongs to. */
export function CampaignDialog({ campaign, onSave, onClose }: { campaign?: CreatorCampaign; onSave: (c: CreatorCampaign) => void; onClose: () => void }) {
  const { t } = useI18n()
  const { ws, all } = useWorkspace()
  const d = t.creators.dialogs.campaign
  const brands = brandsFor(all)
  const today = ws.now.slice(0, 10)
  const [brandId, setBrandId] = useState(campaign?.brandId ?? ws.brandScope ?? brands[0]?.id ?? '')
  const [name, setName] = useState(campaign?.name ?? '')
  const [start, setStart] = useState(campaign?.start ?? today)
  const [end, setEnd] = useState(campaign?.end ?? today)
  const [budget, setBudget] = useState(campaign ? String(campaign.budget) : '')
  const [goal, setGoal] = useState<CampaignGoal>(campaign?.goal ?? 'awareness')
  const [linked, setLinked] = useState(campaign?.campaignId ?? '')
  const [notes, setNotes] = useState(campaign?.notes ?? '')
  const [error, setError] = useState('')
  const calendar = all.campaigns.filter((c) => c.brandId === brandId)

  const submit = () => {
    if (!name.trim()) return setError(d.needName)
    if (end < start) return setError(d.badDates)
    onSave({
      id: campaign?.id ?? `cc-${Date.now().toString(36)}`,
      brandId,
      name: name.trim(),
      start,
      end,
      budget: num(budget) ?? 0,
      goal,
      ...(linked && calendar.some((c) => c.id === linked) && { campaignId: linked }),
      ...(notes.trim() && { notes: notes.trim() }),
    })
  }

  return (
    <Modal open onClose={onClose} title={campaign ? d.editTitle : d.addTitle} sub={d.sub} onSubmit={submit} error={error} footer={<Footer onClose={onClose} submit={campaign ? t.creators.dialogs.save : d.create} />}>
      <Grid>
        <Field label={d.brand}>
          <select value={brandId} onChange={(e) => (setBrandId(e.target.value), setLinked(''))} className={cn(field, 'cursor-pointer')}>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={d.name}>
          <input autoFocus value={name} onChange={(e) => (setName(e.target.value), setError(''))} aria-invalid={error === d.needName} className={field} />
        </Field>
        <Field label={d.start}>
          <input type="date" value={start} onChange={(e) => (setStart(e.target.value), setError(''))} className={field} />
        </Field>
        <Field label={d.end}>
          <input type="date" value={end} onChange={(e) => (setEnd(e.target.value), setError(''))} aria-invalid={error === d.badDates} className={field} />
        </Field>
        <Field label={`${d.budget} · ${all.settings.currency}`}>
          <input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} className={cn(field, 'tabular-nums')} />
        </Field>
        <Field label={d.goal}>
          <select value={goal} onChange={(e) => setGoal(e.target.value as CampaignGoal)} className={cn(field, 'cursor-pointer')}>
            {(['awareness', 'engagement', 'sales'] as CampaignGoal[]).map((g) => (
              <option key={g} value={g}>
                {t.creators.goal[g]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={d.linked} wide>
          <select value={linked} onChange={(e) => setLinked(e.target.value)} className={cn(field, 'cursor-pointer')}>
            <option value="">{d.none}</option>
            {calendar.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={d.notes} wide>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={cn(field, 'h-auto resize-y py-2.5')} />
        </Field>
      </Grid>
    </Modal>
  )
}

/* ───────────────────────── deliverable ───────────────────────── */

/** "Add a deliverable" / "Edit deliverable": campaign, creator, network and format, due date, fee, code (and status when editing). */
export function DeliverableDialog({
  deliverable,
  campaignId,
  creatorId,
  onSave,
  onClose,
}: {
  deliverable?: Deliverable
  campaignId?: string
  creatorId?: string
  onSave: (d: Deliverable) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const { ws, all } = useWorkspace()
  const d = t.creators.dialogs.deliverable
  const campaigns = ws.creatorCampaigns
  const creators = all.creators.filter((c) => c.status !== 'past' || c.id === (deliverable?.creatorId ?? creatorId))
  const [campaign, setCampaign] = useState(deliverable?.campaignId ?? campaignId ?? campaigns[0]?.id ?? '')
  const [creator, setCreator] = useState(deliverable?.creatorId ?? creatorId ?? '')
  const who = all.creators.find((c) => c.id === creator)
  const [network, setNetwork] = useState<NetworkId>(deliverable?.network ?? who?.profiles[0]?.network ?? 'instagram')
  const [format, setFormat] = useState(deliverable?.format ?? FORMATS[network][0])
  const [due, setDue] = useState(deliverable?.dueAt.slice(0, 10) ?? all.creatorCampaigns.find((c) => c.id === campaign)?.end ?? ws.now.slice(0, 10))
  const [fee, setFee] = useState(deliverable ? String(deliverable.fee) : who?.rate !== undefined ? String(who.rate) : '')
  const [code, setCode] = useState(deliverable?.code ?? '')
  const [status, setStatus] = useState<DeliverableStatus>(deliverable?.status ?? 'briefed')
  const [error, setError] = useState('')
  // The creator's own networks first.
  const nets = [...new Set([...(who?.profiles.map((p) => p.network) ?? []), ...NETWORK_ORDER])]

  const pickCreator = (id: string) => {
    setCreator(id)
    setError('')
    const c = all.creators.find((x) => x.id === id)
    if (!deliverable && c) {
      if (c.profiles[0]) {
        setNetwork(c.profiles[0].network)
        setFormat(FORMATS[c.profiles[0].network][0])
      }
      if (c.rate !== undefined && !fee) setFee(String(c.rate))
    }
  }

  const submit = () => {
    if (!campaign) return setError(d.needCampaign)
    if (!creator) return setError(d.needCreator)
    onSave({
      ...(deliverable ?? {}),
      id: deliverable?.id ?? `dl-${Date.now().toString(36)}`,
      campaignId: campaign,
      creatorId: creator,
      network,
      format: FORMATS[network].includes(format) ? format : FORMATS[network][0],
      dueAt: `${due}T12:00:00Z`,
      status,
      fee: num(fee) ?? 0,
      paid: deliverable?.paid ?? false,
      ...(code.trim() ? { code: code.trim().toUpperCase() } : { code: undefined }),
    })
  }

  return (
    <Modal open onClose={onClose} title={deliverable ? d.editTitle : d.addTitle} sub={d.sub} onSubmit={submit} error={error} footer={<Footer onClose={onClose} submit={deliverable ? t.creators.dialogs.save : d.add} />}>
      <Grid>
        <Field label={d.campaign} wide>
          <select value={campaign} onChange={(e) => (setCampaign(e.target.value), setError(''))} className={cn(field, 'cursor-pointer')}>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {`${c.name} · ${all.brands.find((b) => b.id === c.brandId)?.name ?? ''}`}
              </option>
            ))}
          </select>
        </Field>
        <Field label={d.creator}>
          <select value={creator} onChange={(e) => pickCreator(e.target.value)} aria-invalid={error === d.needCreator} className={cn(field, 'cursor-pointer')}>
            <option value="" disabled>
              {d.needCreator}
            </option>
            {creators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={d.network}>
          <select
            value={network}
            onChange={(e) => {
              const n = e.target.value as NetworkId
              setNetwork(n)
              setFormat(FORMATS[n][0])
            }}
            className={cn(field, 'cursor-pointer')}
          >
            {nets.map((n) => (
              <option key={n} value={n}>
                {NETWORK_LABEL[n]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={d.format}>
          <select value={format} onChange={(e) => setFormat(e.target.value as Deliverable['format'])} className={cn(field, 'cursor-pointer')}>
            {FORMATS[network].map((f) => (
              <option key={f} value={f}>
                {network === 'pinterest' && f === 'post' ? t.compose.formats.pin : t.compose.formats.label[f]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={d.due}>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} />
        </Field>
        <Field label={`${d.fee} · ${all.settings.currency}`}>
          <input inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} className={cn(field, 'tabular-nums')} />
        </Field>
        <Field label={d.code}>
          <input value={code} onChange={(e) => setCode(e.target.value)} className={cn(field, 'uppercase')} />
        </Field>
        {deliverable && (
          <Field label={d.status}>
            <select value={status} onChange={(e) => setStatus(e.target.value as DeliverableStatus)} className={cn(field, 'cursor-pointer')}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {t.creators.status[s]}
                </option>
              ))}
            </select>
          </Field>
        )}
      </Grid>
    </Modal>
  )
}

/* ───────────────────────── results ───────────────────────── */

const RESULT_FIELDS: (keyof DeliverableResults)[] = ['reach', 'views', 'likes', 'comments', 'shares', 'saves', 'clicks', 'conversions', 'revenue']

/** "Results · Mira, Instagram · Reel": the link, the day it went up and the numbers from the creator's insights, with a live summary. */
export function ResultsDialog({ deliverable, creator, onSave, onClose }: { deliverable: Deliverable; creator: string; onSave: (d: Deliverable) => void; onClose: () => void }) {
  const { t } = useI18n()
  const { all } = useWorkspace()
  const d = t.creators.dialogs.results
  const [url, setUrl] = useState(deliverable.url ?? '')
  const [posted, setPosted] = useState((deliverable.postedAt ?? deliverable.dueAt).slice(0, 10))
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(RESULT_FIELDS.map((k) => [k, deliverable.results?.[k] !== undefined ? String(deliverable.results[k]) : ''])))
  const [error, setError] = useState('')
  const results: DeliverableResults = Object.fromEntries(RESULT_FIELDS.map((k) => [k, num(values[k] ?? '')]).filter(([, v]) => v !== undefined))
  const eng = engagementsOf(results)
  const rate = rateOf(results)

  const submit = () => {
    if (url.trim() && !parseLink(url)) return setError(d.badUrl)
    onSave({
      ...deliverable,
      status: 'live',
      postedAt: `${posted}T12:00:00Z`,
      ...(url.trim() ? { url: parseLink(url)!.toString() } : { url: undefined }),
      results,
      resultsAt: new Date().toISOString(),
    })
  }

  return (
    <Modal open onClose={onClose} title={d.title(creator, deliverableWhere(t, deliverable.network, deliverable.format))} sub={d.sub} onSubmit={submit} error={error} size="lg" footer={<Footer onClose={onClose} submit={t.creators.dialogs.save} />}>
      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-3.5 max-mobile:grid-cols-1">
        <Field label={d.url}>
          <input type="url" autoFocus value={url} onChange={(e) => (setUrl(e.target.value), setError(''))} aria-invalid={!!error} spellCheck={false} className={field} />
        </Field>
        <Field label={d.posted}>
          <input type="date" value={posted} onChange={(e) => setPosted(e.target.value)} className={field} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3 max-mobile:grid-cols-2">
        {RESULT_FIELDS.map((k) => (
          <Field key={k} label={k === 'revenue' ? `${d.revenue} · ${all.settings.currency}` : d[k]}>
            <input inputMode="numeric" value={values[k]} onChange={(e) => setValues({ ...values, [k]: e.target.value })} className={cn(field, 'tabular-nums')} />
          </Field>
        ))}
      </div>
      <p className="rounded-2xl bg-well px-3.5 py-2.5 text-2xs font-semibold tabular-nums text-muted">
        {d.summary(t.numbers.int(eng), rate === null ? '—' : t.numbers.pct1(rate), eng ? t.numbers.money(deliverable.fee / eng, all.settings.currency, 2) : '—')}
      </p>
    </Modal>
  )
}
