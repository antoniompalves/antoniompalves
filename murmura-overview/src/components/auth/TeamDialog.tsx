import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronUp, Copy, KeyRound, Layers, Mail, MoreHorizontal, Pencil, Plus, RotateCcw, ShieldCheck, ShieldOff, Trash2, UserCheck, UserMinus, UserPlus } from 'lucide-react'
import { ConfirmDialog, Modal } from '../Modal'
import { useToast } from '../Toast'
import { Avatar, Badge, BrandMark, Button, IconButton, Segmented, cn } from '../ui'
import { newBrand } from '../../data/defaults'
import { can, roleName, roleOf } from '../../data/permissions'
import { ApiError, api } from '../../data/server'
import { useWorkspace } from '../../data/store'
import type { Brand, TeamMember } from '../../data/types'
import { useI18n } from '../../i18n'
import { TextField, errorText, fieldCls } from './parts'

interface Access {
  memberId: string
  account: boolean
  hasPassword: boolean
  mfa: boolean
  invitePending: boolean
}

type Tab = 'people' | 'brands' | 'security'

/**
 * "Team & access" (server mode): invite people with a role and brands, change
 * either, suspend or reactivate, hand out reset links, withdraw invitations;
 * add and rename brands; require two-step verification.
 */
export function TeamDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const s = t.auth.team
  const { all } = useWorkspace()
  const me = all.currentUserId
  const people = can(all, me, 'team.manage')
  const settings = can(all, me, 'settings.manage')
  const tabs = ([people && 'people', settings && 'brands', settings && 'security'].filter(Boolean) as Tab[]).map((v) => ({ value: v, label: s.tabs[v] }))
  const [tab, setTab] = useState<Tab>(tabs[0]?.value ?? 'people')
  // Each time it opens, it starts on the first tab.
  const first = tabs[0]?.value ?? 'people'
  useEffect(() => {
    if (open) setTab(first)
  }, [open, first])

  return (
    <Modal open={open} onClose={onClose} title={s.title} sub={s.sub(all.settings.name)} size="lg">
      {tabs.length > 1 && <Segmented label={s.title} options={tabs} value={tab} onChange={setTab} />}
      {open && tab === 'people' && people && <People />}
      {open && tab === 'brands' && settings && <Brands />}
      {open && tab === 'security' && settings && <Security />}
    </Modal>
  )
}

const copy = (text: string) => navigator.clipboard?.writeText(text).catch(() => undefined)

/* ───────────── people ───────────── */

function People() {
  const { t, locale } = useI18n()
  const s = t.auth.team
  const { all, server } = useWorkspace()
  const toast = useToast()
  const [access, setAccess] = useState<Record<string, Access>>({})
  const [inviting, setInviting] = useState(false)
  const [sent, setSent] = useState<{ name: string; email: string; link: string; emailed: boolean } | null>(null)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'suspend' | 'withdraw' | 'mfa'; member: TeamMember } | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const load = useCallback(
    () =>
      api<{ members: Access[] }>('GET', '/team').then(
        (r) => setAccess(Object.fromEntries(r.members.map((m) => [m.memberId, m]))),
        () => undefined,
      ),
    [],
  )
  useEffect(() => void load(), [load, all.team])

  const fail = (e: unknown) => toast({ text: errorText(t, e, (e as ApiError).message || t.auth.network), icon: ShieldOff })
  const patch = async (m: TeamMember, body: Record<string, unknown>, text: string, icon = UserCheck) => {
    try {
      await api('PATCH', `/team/${m.id}`, body)
      toast({ text, icon })
    } catch (e) {
      fail(e)
    }
  }

  const act = async (kind: 'reset' | 'resend' | 'copyInvite' | 'mfa' | 'withdraw', m: TeamMember) => {
    try {
      if (kind === 'reset') {
        const r = await api<{ link: string }>('POST', `/team/${m.id}/reset-link`)
        await copy(r.link)
        toast({ text: s.toast.resetLink, icon: KeyRound })
      } else if (kind === 'resend' || kind === 'copyInvite') {
        const r = await api<{ link: string; emailed: boolean }>('POST', `/team/${m.id}/resend`, { locale })
        if (kind === 'copyInvite') {
          await copy(r.link)
          toast({ text: s.copied, icon: Copy })
        } else toast({ text: s.toast.resent(m.name), icon: Mail })
      } else if (kind === 'mfa') {
        await api('POST', `/team/${m.id}/mfa-off`)
        toast({ text: s.toast.mfaOff(m.name), icon: ShieldOff })
      } else {
        await api('DELETE', `/team/${m.id}`)
        toast({ text: s.toast.withdrawn(m.name), icon: Trash2 })
      }
      void load()
    } catch (e) {
      fail(e)
    }
  }

  const order = { active: 0, invited: 1, suspended: 2 }
  const team = [...all.team].sort((a, b) => order[a.status] - order[b.status] || (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.name.localeCompare(b.name)))
  const now = new Date()

  return (
    <>
      <div className="flex items-center justify-end gap-3">
        <Button size="sm" icon={UserPlus} onClick={() => setInviting(true)}>
          {s.invite}
        </Button>
      </div>
      <ul className="grid gap-1" aria-label={s.tabs.people}>
        {team.map((m) => {
          const manageable = m.role !== 'owner' && m.id !== all.currentUserId
          const expanded = open === m.id
          return (
            <li key={m.id} className={cn('rounded-[16px]', expanded && 'bg-glass-2')}>
              <div className={cn('flex items-center gap-3 px-2 py-2', m.status === 'suspended' && 'opacity-60')}>
                <Avatar src={m.avatar} name={m.name} size="md" />
                <span className="min-w-0 flex-1">
                  <b className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
                    <span className="truncate">{m.name}</span>
                    {m.id === all.currentUserId && <small className="shrink-0 font-normal text-muted">· {s.you}</small>}
                  </b>
                  <small className="block truncate text-[12.5px] text-muted">{[m.email, m.status === 'active' ? (m.lastActiveAt ? s.seen(t.dates.ago(m.lastActiveAt, now)) : s.never) : null, access[m.id]?.mfa && s.mfaOn].filter(Boolean).join(' · ')}</small>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 max-mobile:hidden">
                  {m.brands !== 'all' && (
                    <Badge tone="plain" size="tight">
                      <Layers size={12} aria-hidden className="mr-1" />
                      {m.brands.length}
                    </Badge>
                  )}
                  {m.status !== 'active' && (
                    <Badge tone={m.status === 'invited' ? 'butter' : 'coral'} size="tight">
                      {s.status[m.status]}
                    </Badge>
                  )}
                  <Badge tone={roleOf(all, m)?.tone ?? 'plain'} size="tight">
                    {roleName(t, all, m.role)}
                  </Badge>
                </span>
                {manageable ? (
                  <IconButton label={s.options(m.name)} icon={expanded ? ChevronUp : MoreHorizontal} size="sm" aria-expanded={expanded} aria-controls={`member-${m.id}`} onClick={() => setOpen(expanded ? null : m.id)} />
                ) : (
                  <span className="size-[34px] shrink-0" aria-hidden />
                )}
              </div>
              {manageable && expanded && (
                <MemberPanel
                  member={m}
                  access={access[m.id]}
                  onRole={(role) => void patch(m, { role }, s.toast.role(m.name.split(' ')[0]!, roleName(t, all, role)))}
                  onBrands={() => setEditing(m)}
                  onStatus={() => (m.status === 'active' ? setConfirm({ kind: 'suspend', member: m }) : void patch(m, { status: 'active' }, s.toast.reactivated(m.name)))}
                  onReset={() => void act('reset', m)}
                  onMfa={() => setConfirm({ kind: 'mfa', member: m })}
                  onResend={() => void act('resend', m)}
                  onCopyInvite={() => void act('copyInvite', m)}
                  onWithdraw={() => setConfirm({ kind: 'withdraw', member: m })}
                />
              )}
            </li>
          )
        })}
      </ul>

      {inviting && (
        <InviteDialog
          onClose={() => setInviting(false)}
          onSent={(r) => {
            setInviting(false)
            setSent(r)
            void load()
          }}
        />
      )}
      {sent && (
        <Modal
          open
          onClose={() => setSent(null)}
          title={s.sentTitle(sent.name)}
          size="sm"
          footer={
            <Button onClick={() => setSent(null)} icon={UserCheck}>
              {s.done}
            </Button>
          }
        >
          <p className="text-xs text-muted">{sent.emailed ? s.emailed(sent.email) : s.notEmailed}</p>
          <LinkBox link={sent.link} label={s.link} hint={s.validFor} />
        </Modal>
      )}
      {editing && (
        <BrandsDialog
          member={editing}
          onClose={() => setEditing(null)}
          onSave={(brands) => {
            void patch(editing, { brands }, s.toast.brands(editing.name.split(' ')[0]!), Layers)
            setEditing(null)
          }}
        />
      )}
      <ConfirmDialog
        open={!!confirm}
        title={confirm ? (confirm.kind === 'suspend' ? s.confirmSuspend : confirm.kind === 'withdraw' ? s.confirmWithdraw : s.confirmMfa)(confirm.member.name) : ''}
        text={confirm ? (confirm.kind === 'suspend' ? s.confirmSuspendText : confirm.kind === 'withdraw' ? s.confirmWithdrawText : s.confirmMfaText) : ''}
        confirm={confirm ? (confirm.kind === 'suspend' ? s.suspend : confirm.kind === 'withdraw' ? s.withdraw : s.mfaOff) : ''}
        cancel={s.cancel}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          const c = confirm!
          setConfirm(null)
          if (c.kind === 'suspend') void patch(c.member, { status: 'suspended' }, s.toast.suspended(c.member.name), UserMinus)
          else void act(c.kind === 'withdraw' ? 'withdraw' : 'mfa', c.member)
        }}
      />
      {!server?.mail && <p className="text-[12.5px] text-muted">{s.security.mailOff}</p>}
    </>
  )
}

function MemberPanel(p: { member: TeamMember; access?: Access; onRole: (role: string) => void; onBrands: () => void; onStatus: () => void; onReset: () => void; onMfa: () => void; onResend: () => void; onCopyInvite: () => void; onWithdraw: () => void }) {
  const { t } = useI18n()
  const s = t.auth.team
  const { all } = useWorkspace()
  const m = p.member
  return (
    <div id={`member-${m.id}`} className="grid gap-3 pb-3 pl-[60px] pr-2 pt-1 max-mobile:pl-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-[180px] flex-1 gap-1.5">
          <span className="px-0.5 text-2xs font-semibold text-muted">{s.changeRole}</span>
          <select value={m.role} onChange={(e) => p.onRole(e.target.value)} className={fieldCls}>
            {all.roles
              .filter((r) => r.id !== 'owner')
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {roleName(t, all, r.id)}
                </option>
              ))}
          </select>
        </label>
        <Button variant="ghost" icon={Layers} onClick={p.onBrands}>
          {s.editBrands}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {m.status === 'invited' ? (
          <>
            <Button size="sm" variant="ghost" icon={Mail} onClick={p.onResend}>
              {s.resend}
            </Button>
            <Button size="sm" variant="ghost" icon={Copy} onClick={p.onCopyInvite}>
              {s.copyInvite}
            </Button>
            <Button size="sm" variant="ghost" icon={Trash2} className="text-bad" onClick={p.onWithdraw}>
              {s.withdraw}
            </Button>
          </>
        ) : (
          <>
            {m.status === 'active' && (
              <Button size="sm" variant="ghost" icon={KeyRound} onClick={p.onReset}>
                {s.resetLink}
              </Button>
            )}
            {p.access?.mfa && (
              <Button size="sm" variant="ghost" icon={ShieldOff} onClick={p.onMfa}>
                {s.mfaOff}
              </Button>
            )}
            <Button size="sm" variant="ghost" icon={m.status === 'active' ? UserMinus : RotateCcw} className={m.status === 'active' ? 'text-bad' : undefined} onClick={p.onStatus}>
              {m.status === 'active' ? s.suspend : s.reactivate}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function LinkBox({ link, label, hint }: { link: string; label: string; hint: string }) {
  const { t } = useI18n()
  const toast = useToast()
  return (
    <div className="grid gap-1.5">
      <span className="px-0.5 text-2xs font-semibold text-muted">{label}</span>
      <span className="flex gap-2">
        <input readOnly value={link} aria-label={label} onFocus={(e) => e.target.select()} className={cn(fieldCls, 'font-mono text-[13px]')} />
        <Button variant="ghost" icon={Copy} onClick={() => void copy(link).then(() => toast({ text: t.auth.team.copied, icon: Copy }))}>
          {t.auth.team.copy}
        </Button>
      </span>
      <small className="px-0.5 text-[12.5px] text-muted">{hint}</small>
    </div>
  )
}

/** "Every brand" or some, as checkboxes. */
function BrandPicker({ brands, value, onChange }: { brands: Brand[]; value: string[] | 'all'; onChange: (v: string[] | 'all') => void }) {
  const { t } = useI18n()
  const s = t.auth.team
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 px-0.5 text-2xs font-semibold text-muted">{s.brands}</legend>
      <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold">
        <input type="checkbox" checked={value === 'all'} onChange={(e) => onChange(e.target.checked ? 'all' : brands.slice(0, 1).map((b) => b.id))} className="size-4 accent-[var(--text)]" />
        {s.allBrands}
      </label>
      {value !== 'all' && (
        <div className="grid grid-cols-2 gap-2 pl-6 max-mobile:grid-cols-1">
          {brands.map((b) => (
            <label key={b.id} className="flex cursor-pointer items-center gap-2.5 text-xs">
              <input type="checkbox" checked={value.includes(b.id)} onChange={(e) => onChange(e.target.checked ? [...value, b.id] : value.filter((x) => x !== b.id))} className="size-4 accent-[var(--text)]" />
              <BrandMark brand={b} size="sm" />
              <span className="truncate">{b.name}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}

function InviteDialog({ onClose, onSent }: { onClose: () => void; onSent: (r: { name: string; email: string; link: string; emailed: boolean }) => void }) {
  const { t, locale } = useI18n()
  const s = t.auth.team
  const { all } = useWorkspace()
  const roles = all.roles.filter((r) => r.id !== 'owner')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState(roles.find((r) => r.id === 'editor')?.id ?? roles[0]?.id ?? '')
  const [brands, setBrands] = useState<string[] | 'all'>('all')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return setError(s.errors.invalid)
    if (brands !== 'all' && !brands.length) return setError(s.errors.brands)
    setBusy(true)
    try {
      const r = await api<{ link: string; emailed: boolean }>('POST', '/team/invite', { name, email, role, brands, locale })
      onSent({ name: name.trim(), email: email.trim(), ...r })
    } catch (e) {
      const code = (e as ApiError).code
      setError(code === 'taken' ? s.errors.taken : code === 'brands' ? s.errors.brands : code === 'invalid' ? s.errors.invalid : errorText(t, e, t.auth.network))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={s.inviteTitle}
      sub={s.inviteSub}
      onSubmit={() => void submit()}
      error={error}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {s.cancel}
          </Button>
          <Button type="submit" icon={Mail} disabled={busy}>
            {s.send}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 max-mobile:grid-cols-1">
        <TextField label={s.name} value={name} onChange={(v) => (setName(v), setError(''))} name="invite-name" autoComplete="off" autoFocus />
        <TextField label={s.email} value={email} onChange={(v) => (setEmail(v), setError(''))} name="invite-email" type="email" autoComplete="off" />
      </div>
      <label className="grid gap-1.5">
        <span className="px-0.5 text-2xs font-semibold text-muted">{s.role}</span>
        <select value={role} onChange={(e) => setRole(e.target.value)} className={fieldCls}>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {roleName(t, all, r.id)}
            </option>
          ))}
        </select>
      </label>
      <BrandPicker brands={all.brands} value={brands} onChange={setBrands} />
    </Modal>
  )
}

function BrandsDialog({ member, onClose, onSave }: { member: TeamMember; onClose: () => void; onSave: (brands: string[] | 'all') => void }) {
  const { t } = useI18n()
  const s = t.auth.team
  const { all } = useWorkspace()
  const [brands, setBrands] = useState(member.brands)
  const [error, setError] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      title={s.brandsTitle(member.name)}
      size="sm"
      onSubmit={() => (brands !== 'all' && !brands.length ? setError(s.errors.brands) : onSave(brands))}
      error={error}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {s.cancel}
          </Button>
          <Button type="submit">{s.brandsSave}</Button>
        </>
      }
    >
      <BrandPicker brands={all.brands} value={brands} onChange={(v) => (setBrands(v), setError(''))} />
    </Modal>
  )
}

/* ───────────── brands ───────────── */

function Brands() {
  const { t } = useI18n()
  const b = t.auth.team.brandsTab
  const { all, dispatch } = useWorkspace()
  const toast = useToast()
  const [editing, setEditing] = useState<Brand | 'new' | null>(null)
  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" icon={Plus} onClick={() => setEditing('new')}>
          {b.add}
        </Button>
      </div>
      <ul className="grid gap-1" aria-label={t.auth.team.tabs.brands}>
        {all.brands.map((brand) => (
          <li key={brand.id} className="flex items-center gap-3 rounded-[16px] px-2 py-2">
            <BrandMark brand={brand} size="md" />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-xs font-semibold">{brand.name}</b>
              {brand.industry && <small className="block truncate text-[12.5px] text-muted">{brand.industry}</small>}
            </span>
            <IconButton label={b.edit(brand.name)} icon={Pencil} size="sm" onClick={() => setEditing(brand)} />
          </li>
        ))}
      </ul>
      {editing && (
        <BrandForm
          brand={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(name, industry) => {
            const next =
              editing === 'new'
                ? newBrand(
                    name,
                    all.brands.map((x) => x.id),
                    industry,
                  )
                : { ...editing, name, industry }
            dispatch({ type: 'saveBrand', brand: next })
            toast({ text: editing === 'new' ? b.added(name) : b.saved, icon: Layers })
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

function BrandForm({ brand, onClose, onSave }: { brand: Brand | null; onClose: () => void; onSave: (name: string, industry: string) => void }) {
  const { t } = useI18n()
  const b = t.auth.team.brandsTab
  const [name, setName] = useState(brand?.name ?? '')
  const [industry, setIndustry] = useState(brand?.industry ?? '')
  return (
    <Modal
      open
      onClose={onClose}
      title={brand ? b.edit(brand.name) : b.add}
      size="sm"
      onSubmit={() => name.trim() && onSave(name.trim(), industry.trim())}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.auth.team.cancel}
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            {b.save}
          </Button>
        </>
      }
    >
      <TextField label={b.name} value={name} onChange={setName} autoFocus />
      <TextField label={b.industry} value={industry} onChange={setIndustry} placeholder={b.placeholder} />
    </Modal>
  )
}

/* ───────────── sign-in rules ───────────── */

function Row({ title, hint, children }: { title: string; hint: string; children?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[18px] border border-line bg-glass-2 p-4">
      <span className="grid gap-1">
        <b className="text-xs font-bold">{title}</b>
        <small className="text-[12.5px] leading-[1.45] text-muted">{hint}</small>
      </span>
      {children}
    </div>
  )
}

function Security() {
  const { t } = useI18n()
  const s = t.auth.team.security
  const { all, dispatch, server } = useWorkspace()
  const toast = useToast()
  const on = all.settings.requireMfa
  return (
    <div className="grid gap-2.5">
      <Row title={s.requireMfa} hint={s.requireMfaHint}>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={s.requireMfa}
          onClick={() => {
            dispatch({ type: 'settings', patch: { requireMfa: !on } })
            toast({ text: on ? s.requireOff : s.requireOn, icon: on ? ShieldOff : ShieldCheck })
          }}
          className={cn('relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors', on ? 'bg-pine' : 'bg-line-2')}
        >
          <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow transition-[left]', on ? 'left-6' : 'left-1')} />
        </button>
      </Row>
      <Row title={s.sso} hint={server?.sso.length ? s.ssoOn(server.sso.map((p) => p.name).join(', ')) : s.ssoNone} />
      <Row title={s.mail} hint={server?.mail ? s.mailOn : s.mailOff} />
    </div>
  )
}
