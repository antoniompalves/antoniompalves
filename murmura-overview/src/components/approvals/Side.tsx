import { useState } from 'react'
import { Lock, Settings, Shield, Undo2 } from 'lucide-react'
import { Modal } from '../Modal'
import { Avatar, Badge, BrandMark, Button, cn, toneFill } from '../ui'
import { approversFor, can, needsApproval, roleName } from '../../data/permissions'
import type { Brand, Post, Workspace } from '../../data/types'
import { useI18n } from '../../i18n'

const card = 'min-w-0 rounded-card border border-rim bg-glass p-5 shadow-card max-mobile:p-4'

/** "The rule in force": the workspace's approval rule, a post's path, which roles need approval and which approve. */
export function RuleCard({ ws, me }: { ws: Workspace; me: string }) {
  const { t } = useI18n()
  const r = t.approvals.rule
  const rule = ws.settings.approval
  const tile = rule === 'perm' ? { ...r.perm, tone: 'sea' as const } : rule === 'all' ? { ...r.all, tone: 'butter' as const } : { ...r.off, tone: 'plain' as const }
  // Roles that write posts and, under this rule, send them for approval (as if someone had that role).
  const needs = rule === 'off' ? [] : ws.roles.filter((role) => role.perms.includes('post.create') && (rule === 'all' ? !['owner', 'admin'].includes(role.id) : role.id !== 'owner' && !role.perms.includes('post.publish')))
  const approve = ws.roles.filter((role) => role.perms.includes('post.approve'))
  const you = can(ws, me, 'post.create') ? (needsApproval(ws, me) ? r.reviewed : r.direct) : r.reviewer
  const meM = ws.team.find((m) => m.id === me)
  const steps = [
    { tone: 'bg-faint', label: r.steps.draft },
    { tone: 'bg-butter', label: r.steps.approval, off: rule === 'off' },
    { tone: 'bg-sea', label: r.steps.scheduled },
    { tone: 'bg-pine', label: r.steps.published },
  ]
  const badge = (id: string) => {
    const role = ws.roles.find((x) => x.id === id)!
    return (
      <Badge key={id} tone={role.tone}>
        {roleName(t, ws, id)}
      </Badge>
    )
  }
  return (
    <section aria-labelledby="ap-rule-t" className={card}>
      <header className="mb-3.5 flex min-h-[42px] items-center">
        <h2 id="ap-rule-t" className="text-base font-semibold tracking-[-0.005em]">
          {r.title}
        </h2>
      </header>
      <div className="grid gap-3.5">
        <div className={cn('grid gap-1.5 rounded-tile px-[18px] pb-[18px] pt-4', toneFill[tile.tone], tile.tone === 'plain' && 'border border-line-2')}>
          {rule === 'off' ? <Lock size={26} aria-hidden className="mb-1" /> : <Shield size={26} aria-hidden className="mb-1" />}
          <b className="text-lg font-bold tracking-[-0.01em]">{tile.title}</b>
          <p className="text-xs opacity-90">{tile.text}</p>
        </div>
        <ol aria-label={r.path} className="relative grid grid-cols-4 before:absolute before:left-[12.5%] before:right-[12.5%] before:top-[9px] before:h-0.5 before:bg-line-2">
          {steps.map((s) => (
            <li key={s.label} className={cn('relative grid justify-items-center gap-1.5 text-center text-[12.5px] font-semibold', s.off && 'text-faint line-through')}>
              <i className={cn('size-5 rounded-full shadow-[0_0_0_4px_var(--solid)]', s.tone, s.off && 'opacity-35')} />
              <span>{s.label}</span>
            </li>
          ))}
        </ol>
        {rule !== 'off' && (
          <p className="flex items-center gap-2 text-2xs font-semibold text-bad">
            <Undo2 size={16} aria-hidden />
            {r.loop}
          </p>
        )}
        <dl className="grid gap-2.5">
          <div>
            <dt className="mb-[5px] text-[12.5px] font-semibold text-muted">{r.needs}</dt>
            <dd className="flex flex-wrap gap-[5px]">{needs.length ? needs.map((x) => badge(x.id)) : <span className="text-2xs text-muted">{r.noOne}</span>}</dd>
          </div>
          <div>
            <dt className="mb-[5px] text-[12.5px] font-semibold text-muted">{r.can}</dt>
            <dd className="flex flex-wrap gap-[5px]">{approve.map((x) => badge(x.id))}</dd>
          </div>
        </dl>
        <p className="flex items-center gap-2.5 rounded-2xl bg-well px-3 py-2.5 text-xs font-semibold">
          {meM && <Avatar src={meM.avatar} name={meM.name} size="sm" />}
          <span>{you}</span>
        </p>
        <div>
          <Button variant="ghost" size="sm" icon={Settings} href={can(ws, me, 'settings.manage') ? '#/settings/approvals' : undefined} disabled={!can(ws, me, 'settings.manage')}>
            {r.change}
          </Button>
        </div>
      </div>
    </section>
  )
}

/** "Who approves": per brand, how many can approve and how many posts wait; a row filters the queue. */
export function WhoCard({ ws, brandId, onBrand }: { ws: Workspace; brandId: string | null; onBrand: (id: string) => void }) {
  const { t } = useI18n()
  const w = t.approvals.who
  return (
    <section aria-labelledby="ap-who-t" className={card}>
      <header className="mb-3.5 flex min-h-[42px] items-center justify-between gap-3">
        <h2 id="ap-who-t" className="text-base font-semibold tracking-[-0.005em]">
          {w.title}
        </h2>
        <span className="text-2xs text-muted">{w.hint}</span>
      </header>
      <ul className="-mx-2 grid gap-1">
        {ws.brands.map((b: Brand) => {
          const who = approversFor(ws, b.id)
          const waiting = ws.posts.filter((p: Post) => p.brandId === b.id && p.status === 'awaiting_approval').length
          const on = brandId === b.id
          return (
            <li key={b.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onBrand(b.id)}
                className={cn('flex w-full cursor-pointer items-center gap-[11px] rounded-2xl px-2 py-[9px] text-left pointer-coarse:min-h-[52px]', on ? 'bg-pill text-on-pill' : 'pointer-fine:hover:bg-well')}
              >
                <BrandMark brand={b} size="md" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-xs font-bold">{b.name}</b>
                  <small className={cn('block text-[12.5px]', on ? 'opacity-78' : 'text-muted')}>{who.length ? w.count(who.length, waiting) : w.noOne}</small>
                </span>
                {who.length > 0 && (
                  <span className="inline-flex flex-none">
                    {who.slice(0, 4).map((m, i) => (
                      <Avatar key={m.id} src={m.avatar} name={m.name} size="menu" className={cn(on ? 'shadow-[0_0_0_2px_var(--pill)]' : 'shadow-[0_0_0_2px_var(--solid)]', i > 0 && '-ml-1.5')} />
                    ))}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** "Request changes": a note for the writer, with quick notes to start from. */
export function RequestChangesDialog({ author, onSend, onClose }: { author: string; onSend: (note: string) => void; onClose: () => void }) {
  const { t } = useI18n()
  const d = t.approvals.dialog
  const [note, setNote] = useState('')
  const [error, setError] = useState(false)
  const add = (chip: string) => setNote((n) => (n.trim() ? `${n.trim().replace(/[.]?$/, '.')} ${chip}.` : `${chip}.`))
  return (
    <Modal
      open
      onClose={onClose}
      title={d.title}
      sub={d.sub(author)}
      onSubmit={() => (note.trim() ? onSend(note.trim()) : setError(true))}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {d.cancel}
          </Button>
          <Button type="submit" icon={Undo2}>
            {d.submit}
          </Button>
        </>
      }
    >
      <div role="group" aria-label={d.quick} className="flex flex-wrap gap-1.5">
        {d.chips.map((chip) => (
          <button key={chip} type="button" onClick={() => add(chip)} className="inline-flex h-[34px] cursor-pointer items-center rounded-full border border-rim bg-glass-2 px-[13px] text-2xs font-semibold hover:bg-glass-3 pointer-coarse:h-11">
            {chip}
          </button>
        ))}
      </div>
      <label className="grid gap-1.5">
        <span className="px-0.5 text-2xs font-semibold text-muted">{d.label}</span>
        <textarea
          rows={4}
          value={note}
          autoFocus
          onChange={(e) => {
            setNote(e.target.value)
            setError(false)
          }}
          placeholder={d.placeholder}
          aria-invalid={error}
          className={cn('w-full resize-y rounded-[14px] border bg-glass-2 px-3 py-2.5 text-sm text-text outline-none focus-visible:border-text', error ? 'border-coral' : 'border-line-2')}
        />
        {error && (
          <small role="alert" className="text-[12.5px] font-semibold text-bad">
            {d.required}
          </small>
        )}
      </label>
    </Modal>
  )
}
