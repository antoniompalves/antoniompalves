import { useRef, useState } from 'react'
import { Check, Mail, Plus, Trash2 } from 'lucide-react'
import type { ScheduledReport } from '../../data/types'
import { useWorkspace } from '../../data/store'
import { useI18n } from '../../i18n'
import { ConfirmDialog, Modal } from '../Modal'
import { MenuDivider, MenuItem, Popover } from '../Popover'
import { useToast } from '../Toast'
import { Avatar, Button, cn } from '../ui'
import { can } from '../../data/permissions'

/** Weekly reports go out on Mondays at 9:00, monthly ones on the 1st. */
function nextRun(now: Date, frequency: ScheduledReport['frequency']) {
  const d = new Date(now)
  if (frequency === 'weekly') {
    do d.setUTCDate(d.getUTCDate() + 1)
    while (d.getUTCDay() !== 1)
  } else d.setUTCMonth(d.getUTCMonth() + 1, 1)
  d.setUTCHours(9, 0, 0, 0)
  return d
}

/**
 * "Schedule a report" (header button): opens the scheduling form, or once
 * reports exist, a menu listing them (pick one to stop it) plus "New".
 */
export function ReportControls({ scope, now }: { scope: string; now: Date }) {
  const { ws, dispatch } = useWorkspace()
  const { t } = useI18n()
  const r = t.analytics.report
  const toast = useToast()
  const anchor = useRef<HTMLButtonElement>(null)
  const [menu, setMenu] = useState(false)
  const [form, setForm] = useState(false)
  const [stopping, setStopping] = useState<ScheduledReport | null>(null)
  const member = (id: string) => ws.team.find((m) => m.id === id)

  const stop = (report: ScheduledReport) => {
    const before = ws.reports
    dispatch({ type: 'restoreReports', reports: before.filter((x) => x.id !== report.id) })
    setStopping(null)
    toast({ text: r.stopped, icon: Trash2, undo: () => dispatch({ type: 'restoreReports', reports: before }) })
  }

  return (
    <>
      <Button
        ref={anchor}
        variant="ghost"
        icon={Mail}
        aria-haspopup={ws.reports.length ? 'menu' : 'dialog'}
        aria-expanded={ws.reports.length ? menu : undefined}
        onClick={() => (ws.reports.length ? setMenu((v) => !v) : setForm(true))}
        className="max-mobile:w-full"
      >
        {t.analytics.scheduleReport}
        {ws.reports.length > 0 && (
          <span className="inline-grid h-[21px] min-w-[21px] animate-stamp place-items-center rounded-full bg-butter px-1.5 text-[12.5px] font-bold text-[#16191d]">
            {ws.reports.length}
          </span>
        )}
      </Button>

      <Popover open={menu} onClose={() => setMenu(false)} anchor={anchor} placement="bottom-end" label={r.menu}>
        <div role="menu" aria-label={r.menu}>
          {ws.reports.map((report) => (
            <button
              key={report.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false)
                setStopping(report)
              }}
              className="flex w-full cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 text-left outline-none hover:bg-well focus-visible:bg-well"
            >
              <Mail size={18} aria-hidden className="mt-px shrink-0" />
              <span className="min-w-0">
                <b className="block truncate text-xs font-semibold">{r.item(report.name, report.frequency, report.recipientIds.length)}</b>
                <small className="block text-[12.5px] leading-[1.35] text-muted">
                  {r.hint(
                    report.recipientIds.map((id) => member(id)?.name ?? ''),
                    t.dates.dayTime(nextRun(now, report.frequency)),
                  )}
                </small>
              </span>
            </button>
          ))}
          <MenuDivider />
          <MenuItem
            icon={Plus}
            onClick={() => {
              setMenu(false)
              setForm(true)
            }}
          >
            {r.newReport}
          </MenuItem>
        </div>
      </Popover>

      {form && (
        <ScheduleForm
          scope={scope}
          onClose={() => setForm(false)}
          onSchedule={(report) => {
            dispatch({ type: 'addReport', report })
            setForm(false)
            toast({
              text: r.scheduled(report.frequency, t.dates.dayTime(nextRun(now, report.frequency))),
              icon: Mail,
              undo: () => dispatch({ type: 'restoreReports', reports: ws.reports }),
            })
          }}
        />
      )}

      <ConfirmDialog
        open={stopping !== null}
        title={r.stopTitle}
        text={stopping ? r.stopText(stopping.name, stopping.recipientIds.length) : ''}
        confirm={r.stop}
        cancel={r.cancel}
        onConfirm={() => stopping && stop(stopping)}
        onClose={() => setStopping(null)}
      />
    </>
  )
}

function ScheduleForm({ scope, onClose, onSchedule }: { scope: string; onClose: () => void; onSchedule: (r: ScheduledReport) => void }) {
  const { ws } = useWorkspace()
  const { t } = useI18n()
  const r = t.analytics.report
  const [name, setName] = useState(() => r.defaultName(scope))
  const [frequency, setFrequency] = useState<ScheduledReport['frequency']>('weekly')
  const [recipients, setRecipients] = useState<string[]>([ws.currentUserId])
  const [error, setError] = useState(false)

  const submit = () => {
    if (!recipients.length) return setError(true)
    onSchedule({
      id: `rep-${Date.now()}`,
      name: name.trim() || r.defaultName(scope),
      frequency,
      recipientIds: ws.team.filter((m) => recipients.includes(m.id)).map((m) => m.id),
      scope,
    })
  }

  const field = 'h-[46px] w-full rounded-[14px] border border-line-2 bg-glass-2 px-3.5 text-sm text-text outline-none focus-visible:border-text'
  const label = 'mb-1.5 block px-0.5 text-2xs font-semibold text-muted'

  return (
    <Modal
      open
      onClose={onClose}
      title={r.title}
      sub={r.sub(scope)}
      onSubmit={submit}
      error={error && r.pickOne}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {r.cancel}
          </Button>
          <Button type="submit">{r.submit}</Button>
        </>
      }
    >
      <div className="grid gap-3.5">
        <label>
          <span className={label}>{r.name}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </label>
        <label>
          <span className={label}>{r.frequency}</span>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as ScheduledReport['frequency'])} className={cn(field, 'cursor-pointer')}>
            <option value="weekly">{r.frequencies.weekly}</option>
            <option value="monthly">{r.frequencies.monthly}</option>
          </select>
        </label>
        <fieldset className="grid min-w-0" aria-invalid={error || undefined}>
          <legend className="block px-0.5 text-2xs font-semibold text-muted">{r.recipients}</legend>
          <div className="grid max-h-60 grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-1.5 overflow-auto p-0.5">
            {ws.team.filter((m) => can(ws, m.id, 'analytics.view')).map((m) => {
              const on = recipients.includes(m.id)
              return (
                <label
                  key={m.id}
                  className={cn(
                    'flex min-w-0 cursor-pointer items-center gap-2.5 rounded-[14px] border bg-glass-2 px-2.5 py-2',
                    on ? 'border-text' : 'border-line',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      setError(false)
                      setRecipients((ids) => (on ? ids.filter((id) => id !== m.id) : [...ids, m.id]))
                    }}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-[22px] shrink-0 place-items-center rounded-[7px] border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-text',
                      on ? 'border-transparent bg-pill text-on-pill' : 'border-line-2 bg-glass-2',
                    )}
                  >
                    {on && <Check size={15} strokeWidth={2.6} />}
                  </span>
                  <Avatar src={m.avatar} name={m.name} size="sm" />
                  <span className="min-w-0 leading-[1.2]">
                    <b className="block truncate text-xs font-semibold">{m.name}</b>
                    <small className="block truncate text-[12.5px] text-muted">{m.email}</small>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      </div>
    </Modal>
  )
}
