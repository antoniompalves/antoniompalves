import { useState } from 'react'
import { CalendarHeart, CalendarPlus, Flag, Leaf, PenLine, Recycle, Trash2 } from 'lucide-react'
import { Modal } from '../Modal'
import { useToast } from '../Toast'
import { Badge, BrandMark, Button, Card, IconButton, cn } from '../ui'
import { datesBetween } from '../../data/editorial'
import type { CalendarDate } from '../../data/editorial'
import { can } from '../../data/permissions'
import { brandsFor } from '../../data/scope'
import { useWorkspace } from '../../data/store'
import type { Post, Tone } from '../../data/types'
import { useI18n } from '../../i18n'
import type { Messages } from '../../i18n'
import { RecycleDialog } from './Recycle'

/** The editorial calendar's side cards: the dates coming up, and evergreen posts to recycle. */

export const dateName = (t: Messages, d: CalendarDate) => d.name ?? t.collab.dates.names[d.key ?? ''] ?? d.key ?? ''

export const DATE_TONE: Record<string, Tone> = { holiday: 'coral', regional: 'coral', observance: 'sea', retail: 'butter', sector: 'pine', own: 'lilac' }

const DAY = 86_400_000
const key = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** A date as it shows in a calendar cell: a dot in its tone and its name. */
export function DateLabel({ d, className }: { d: CalendarDate; className?: string }) {
  const { t } = useI18n()
  const name = dateName(t, d)
  return (
    <span title={`${name} · ${t.collab.dates.kinds[d.kind]}`} data-key-date className={cn('flex min-w-0 items-center gap-1 text-[11.5px] font-semibold leading-4 text-muted', className)}>
      <i aria-hidden className={cn('size-1.5 shrink-0 rounded-full', d.kind === 'holiday' || d.kind === 'regional' ? 'bg-coral' : d.kind === 'retail' ? 'bg-butter' : d.kind === 'sector' ? 'bg-pine' : d.kind === 'own' ? 'bg-lilac' : 'bg-sea')} />
      <span className="truncate">{name}</span>
    </span>
  )
}

export function ComingUpCard({ now }: { now: Date }) {
  const { t, locale } = useI18n()
  const d = t.collab.dates
  const { ws, dispatch, undoable } = useWorkspace()
  const toast = useToast()
  const me = ws.currentUserId
  const [dialog, setDialog] = useState<'date' | 'theme' | null>(null)
  const today = key(now.getTime())
  const until = key(now.getTime() + 60 * DAY)
  const editor = can(ws, me, 'calendar.edit') || can(ws, me, 'settings.manage')
  const writer = can(ws, me, 'post.create')
  const list = datesBetween(ws, today, until).slice(0, 8)
  return (
    <Card
      title={d.comingUp}
      sub={d.comingUpSub}
      tools={
        editor && (
          <span className="flex gap-1.5">
            <IconButton label={d.add} icon={CalendarPlus} size="sm" onClick={() => setDialog('date')} />
            <IconButton label={d.addTheme} icon={Flag} size="sm" onClick={() => setDialog('theme')} />
          </span>
        )
      }
    >
      {list.length ? (
        <ul aria-label={d.comingUp} className="grid min-w-0 gap-1">
          {list.map((x) => {
            const at = Date.parse(`${x.date}T10:00:00Z`)
            const days = Math.round((Date.parse(`${x.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY)
            const brand = x.brandId ? ws.brands.find((b) => b.id === x.brandId) : undefined
            return (
              <li key={`${x.date}-${x.key ?? x.id}`} className="group flex min-w-0 items-center gap-2.5 rounded-[14px] px-1 py-1.5">
                <span className="grid w-[42px] shrink-0 justify-items-center rounded-[12px] border border-line bg-glass-2 py-1 leading-none">
                  <b className="text-base tabular-nums">{Number(x.date.slice(8))}</b>
                  <small className="text-[10.5px] font-semibold uppercase text-muted">{new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(new Date(at)).replace('.', '')}</small>
                </span>
                <span className="min-w-0 flex-1">
                  <b className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
                    {brand && <BrandMark brand={brand} size="2xs" />}
                    <span className="min-w-0 truncate">{dateName(t, x)}</span>
                  </b>
                  <small className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-muted">
                    <Badge tone={DATE_TONE[x.kind] ?? 'plain'} size="sm">
                      {d.kinds[x.kind]}
                    </Badge>
                    {d.inDays(days)}
                  </small>
                </span>
                {writer && at > now.getTime() && <IconButton label={`${d.plan} · ${dateName(t, x)}`} icon={PenLine} size="sm" href={`#/compose?at=${at}`} />}
                {x.kind === 'own' && editor && <IconButton label={d.dialog.remove(dateName(t, x))} icon={Trash2} size="sm" onClick={() => toast({ text: d.dialog.removed, icon: Trash2, undo: undoable({ type: 'deleteKeyDate', id: x.id! }) })} />}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted">{d.none}</p>
      )}
      {dialog === 'date' && (
        <KeyDateDialog
          now={now}
          onClose={() => setDialog(null)}
          onSave={(x) => {
            dispatch({ type: 'saveKeyDate', date: x })
            toast({ text: d.dialog.added(x.name), icon: CalendarHeart })
            setDialog(null)
          }}
        />
      )}
      {dialog === 'theme' && <ThemeDialog now={now} onClose={() => setDialog(null)} />}
    </Card>
  )
}

const field = 'h-[46px] w-full min-w-0 rounded-[14px] border border-line-2 bg-glass-2 px-3 text-sm text-text outline-none focus-visible:border-text'
const caption = 'px-0.5 text-2xs font-semibold text-muted'

function KeyDateDialog({ now, onClose, onSave }: { now: Date; onClose: () => void; onSave: (d: { id: string; date: string; yearly: boolean; name: string; brandId: string | null; note?: string }) => void }) {
  const { t } = useI18n()
  const d = t.collab.dates.dialog
  const { ws } = useWorkspace()
  const [name, setName] = useState('')
  const [date, setDate] = useState(key(now.getTime() + 7 * DAY))
  const [yearly, setYearly] = useState(false)
  const [brandId, setBrandId] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      title={d.title}
      size="sm"
      error={error}
      onSubmit={() => (name.trim() && date ? onSave({ id: `kd-${Date.now().toString(36)}`, date, yearly, name: name.trim(), brandId: brandId || null, ...(note.trim() && { note: note.trim() }) }) : setError(t.collab.ideas.missing))}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {d.cancel}
          </Button>
          <Button type="submit" icon={CalendarPlus}>
            {d.save}
          </Button>
        </>
      }
    >
      <label className="grid gap-1.5">
        <span className={caption}>{d.name}</span>
        <input value={name} onChange={(e) => (setName(e.target.value), setError(''))} autoFocus className={field} />
      </label>
      <div className="grid grid-cols-2 gap-3 max-mobile:grid-cols-1">
        <label className="grid gap-1.5">
          <span className={caption}>{d.date}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </label>
        <label className="grid gap-1.5">
          <span className={caption}>{d.brand}</span>
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={field}>
            <option value="">{d.allBrands}</option>
            {brandsFor(ws).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold">
        <input type="checkbox" checked={yearly} onChange={(e) => setYearly(e.target.checked)} className="size-4 accent-[var(--text)]" />
        {d.yearly}
      </label>
      <label className="grid gap-1.5">
        <span className={caption}>{d.note}</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} className={field} />
      </label>
    </Modal>
  )
}

/** A campaign or a theme: a ribbon across the calendar for one brand. */
function ThemeDialog({ now, onClose }: { now: Date; onClose: () => void }) {
  const { t } = useI18n()
  const d = t.collab.dates.theme
  const { ws, dispatch } = useWorkspace()
  const toast = useToast()
  const brands = brandsFor(ws)
  const [name, setName] = useState('')
  const [brandId, setBrandId] = useState(brands[0]?.id ?? '')
  const [start, setStart] = useState(key(now.getTime()))
  const [end, setEnd] = useState(key(now.getTime() + 27 * DAY))
  const [error, setError] = useState('')
  const submit = () => {
    if (!name.trim() || !brandId || end < start) return setError(d.bad)
    dispatch({ type: 'saveCampaign', campaign: { id: `cp-${Date.now().toString(36)}`, brandId, name: name.trim(), start, end } })
    toast({ text: d.created(name.trim()), icon: Flag })
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={d.title}
      size="sm"
      error={error}
      onSubmit={submit}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.collab.dates.dialog.cancel}
          </Button>
          <Button type="submit" icon={Flag}>
            {d.save}
          </Button>
        </>
      }
    >
      <label className="grid gap-1.5">
        <span className={caption}>{d.name}</span>
        <input value={name} onChange={(e) => (setName(e.target.value), setError(''))} autoFocus className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className={caption}>{d.brand}</span>
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={field}>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5">
          <span className={caption}>{d.start}</span>
          <input type="date" value={start} onChange={(e) => (setStart(e.target.value), setError(''))} className={field} />
        </label>
        <label className="grid gap-1.5">
          <span className={caption}>{d.end}</span>
          <input type="date" value={end} min={start} onChange={(e) => (setEnd(e.target.value), setError(''))} className={field} />
        </label>
      </div>
    </Modal>
  )
}

/** Evergreen posts: published ones worth posting again, the longest-rested first. */
export function EvergreenCard({ now }: { now: Date }) {
  const { t } = useI18n()
  const e = t.collab.evergreen
  const { ws } = useWorkspace()
  const [recycling, setRecycling] = useState<Post | null>(null)
  const list = ws.posts.filter((p) => p.evergreen && p.status === 'published').sort((a, b) => (a.evergreen!.lastAt ?? a.scheduledAt).localeCompare(b.evergreen!.lastAt ?? b.scheduledAt))
  const writer = can(ws, ws.currentUserId, 'post.create')
  return (
    <Card title={e.card} sub={e.cardSub}>
      {list.length ? (
        <ul aria-label={e.card} className="grid min-w-0 gap-1">
          {list.slice(0, 6).map((p) => {
            const brand = ws.brands.find((b) => b.id === p.brandId)
            return (
              <li key={p.id} className="flex min-w-0 items-center gap-2.5 rounded-[14px] px-1 py-1.5">
                {brand && <BrandMark brand={brand} size="sm" />}
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-xs font-semibold">{p.text.split('\n')[0]}</b>
                  <small className="block text-[12px] text-muted">{e.last(t.dates.ago(p.evergreen!.lastAt ?? p.scheduledAt, now))}</small>
                </span>
                {writer && <IconButton label={`${e.recycle} · ${p.text.slice(0, 30)}`} icon={Recycle} size="sm" onClick={() => setRecycling(p)} />}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="flex items-start gap-2 text-xs text-muted">
          <Leaf size={16} aria-hidden className="mt-px shrink-0" />
          {e.empty}
        </p>
      )}
      {recycling && <RecycleDialog post={recycling} now={now} onClose={() => setRecycling(null)} />}
    </Card>
  )
}
