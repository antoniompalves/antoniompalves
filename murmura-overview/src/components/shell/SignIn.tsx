import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { KataruMark } from '../Logo'
import { useToast } from '../Toast'
import { Avatar, Badge, Button, NetIcon } from '../ui'
import { coverPhoto } from '../../data/assets'
import { roleName, roleOf } from '../../data/permissions'
import { NETWORK_ORDER } from '../../data/selectors'
import { useWorkspace } from '../../data/store'
import type { SystemRole, TeamMember } from '../../data/types'
import { useI18n } from '../../i18n'

/** One person per role, in the reference's order, offered under "or continue as". */
const ROLE_ORDER: SystemRole[] = ['owner', 'admin', 'manager', 'editor', 'community', 'analyst', 'client']
/** The fan of photos: a brand's first photo each, tilted (degrees) and offset like the reference's. */
const FAN = [
  { brand: 'hh', left: 0, top: 26, turn: -9 },
  { brand: 'eo', left: 44, top: 4, turn: 4 },
  { brand: 'vg', left: 88, top: 34, turn: 13 },
]

/**
 * After "Sign out": the workspace's sign-in. The demo's email and password
 * are filled in; anyone on the team can be picked directly, each with a
 * different role.
 */
export function SignIn() {
  const { t } = useI18n()
  const { all, dispatch, clock } = useWorkspace()
  const toast = useToast()
  const s = t.signIn
  const owner = all.team.find((m) => m.role === 'owner')
  const [email, setEmail] = useState(owner?.email ?? '')
  const [password, setPassword] = useState('demo-password')
  const [error, setError] = useState('')
  const active = all.team.filter((m) => m.status === 'active')
  const people = ROLE_ORDER.flatMap((r) => active.filter((m) => m.role === r).slice(0, 1))

  const enter = (m: TeamMember) => {
    dispatch({ type: 'audit', event: { id: `au-${Date.now().toString(36)}`, actorId: m.id, kind: 'auth', action: { type: 'signedIn' }, at: new Date(clock.mock + Date.now() - clock.real).toISOString() } })
    dispatch({ type: 'signIn', userId: m.id })
    toast({ text: t.shell.signedInAs(m.name.split(' ')[0], roleName(t, all, m.role)), icon: ShieldCheck })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const who = all.team.find((m) => m.email.toLowerCase() === email.trim().toLowerCase())
    if (!email.trim() || !password) return setError(s.errors.empty)
    if (!who) return setError(s.errors.unknown)
    if (who.status === 'invited') return setError(s.errors.invited)
    if (who.status === 'suspended') return setError(s.errors.suspended)
    enter(who)
  }

  const field = 'h-[46px] w-full rounded-[14px] border border-line-2 bg-glass-2 px-3.5 text-[16px] text-text outline-none focus-visible:border-text'
  const label = 'grid gap-1.5'
  const caption = 'px-0.5 text-2xs font-semibold text-muted'

  return (
    <main className="fixed inset-0 z-40 grid place-items-center overflow-auto px-4 py-7 max-mobile:place-items-start">
      <div className="grid w-[min(980px,100%)] grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 max-tablet:grid-cols-1">
        <section className="relative grid min-h-[520px] content-between gap-7 overflow-hidden rounded-[30px] bg-ink p-[30px] text-on-ink max-tablet:min-h-0 max-mobile:gap-[18px] max-mobile:rounded-[26px] max-mobile:p-[22px]">
          <span className="relative z-[1] inline-flex items-center gap-3 text-[26px] font-bold tracking-[-0.02em] max-mobile:gap-2.5">
            <span className="grid size-12 place-items-center rounded-[15px] bg-butter text-[#16191d] max-mobile:size-11 max-mobile:rounded-[13px]">
              <KataruMark />
            </span>
            kataru
          </span>
          <div aria-hidden className="pointer-events-none absolute right-[-26px] top-[18px] h-[200px] w-[210px] max-tablet:hidden">
            {FAN.map((f) => {
              const post = all.posts.find((p) => p.brandId === f.brand && p.media.length)
              const src = post ? coverPhoto(post, 320) : undefined
              return src ? (
                <img
                  key={f.brand}
                  src={src}
                  alt=""
                  className="absolute h-[148px] w-[118px] origin-bottom rounded-[18px] border-[3px] border-white/90 object-cover shadow-[0_20px_40px_-16px_rgb(0_0_0/0.6)]"
                  style={{ left: f.left, top: f.top, transform: `rotate(${f.turn}deg)` }}
                />
              ) : null
            })}
          </div>
          <p className="relative z-[1] text-[clamp(30px,3.4vw,44px)] font-semibold leading-[1.04] tracking-[-0.03em] max-mobile:text-[28px]">
            {s.lede((w) => (
              <em className="not-italic">{w}</em>
            ))}
          </p>
          <div className="relative z-[1] flex flex-wrap gap-2">
            {NETWORK_ORDER.map((n) => (
              <NetIcon key={n} network={n} size="md" surface="on-ink-soft" />
            ))}
          </div>
          <p className="relative z-[1] text-2xs opacity-72">{s.foot(all.settings.name, all.channels.length, active.length)}</p>
        </section>

        <section className="grid content-start gap-4 rounded-[26px] border border-rim bg-glass p-5 shadow-card max-mobile:p-4">
          <h1 className="text-[30px] font-bold leading-[1.45] tracking-[-0.025em]">{s.title}</h1>
          <p className="text-muted">{s.text}</p>
          <form onSubmit={submit} noValidate className="grid gap-3">
            <label className={label}>
              <span className={caption}>{s.email}</span>
              <input name="email" type="email" autoComplete="username" value={email} onChange={(e) => (setEmail(e.target.value), setError(''))} className={field} />
            </label>
            <label className={label}>
              <span className={caption}>{s.password}</span>
              <input name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => (setPassword(e.target.value), setError(''))} className={field} />
            </label>
            <p role="alert" className="min-h-[18px] text-xs text-bad">
              {error}
            </p>
            <Button type="submit" icon={ArrowUpRight} className="w-full">
              {s.submit}
            </Button>
          </form>
          <p className="flex items-center gap-3 text-2xs font-semibold text-muted before:h-px before:flex-1 before:bg-line-2 after:h-px after:flex-1 after:bg-line-2">{s.or}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(210px,100%),1fr))] gap-2">
            {people.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => enter(m)}
                className="flex min-w-0 cursor-pointer items-center gap-[11px] rounded-[18px] border border-rim bg-glass-2 px-3 py-2.5 text-left hover:bg-glass-3"
              >
                <Avatar src={m.avatar} name={m.name} size="md" />
                <span className="min-w-0">
                  <b className="block truncate text-xs font-bold">{m.name}</b>
                  <small className="mt-[3px] flex items-center gap-1.5 text-[12.5px] text-muted">
                    <Badge tone={roleOf(all, m)?.tone ?? 'plain'} size="sm">
                      {roleName(t, all, m.role)}
                    </Badge>
                  </small>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
