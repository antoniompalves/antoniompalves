import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { AuthAside, AuthLayout } from '../auth/parts'
import { useToast } from '../Toast'
import { Avatar, Badge, Button } from '../ui'
import { coverPhoto } from '../../data/assets'
import { roleName, roleOf } from '../../data/permissions'
import { useWorkspace } from '../../data/store'
import type { SystemRole, TeamMember } from '../../data/types'
import { useI18n } from '../../i18n'

/** One person per role, in the reference's order, offered under "or continue as". */
const ROLE_ORDER: SystemRole[] = ['owner', 'admin', 'manager', 'editor', 'community', 'analyst', 'client']
/** The fan of photos: a brand's first photo each. */
const FAN = ['hh', 'eo', 'vg']

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
    dispatch({
      type: 'audit',
      event: {
        id: `au-${Date.now().toString(36)}`,
        actorId: m.id,
        kind: 'auth',
        action: { type: 'signedIn' },
        at: new Date(clock.mock + Date.now() - clock.real).toISOString(),
      },
    })
    dispatch({ type: 'signIn', userId: m.id })
    toast({
      text: t.shell.signedInAs(m.name.split(' ')[0], roleName(t, all, m.role)),
      icon: ShieldCheck,
    })
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

  const photos = FAN.map((brand) => {
    const post = all.posts.find((p) => p.brandId === brand && p.media.length)
    return post ? coverPhoto(post, 320) : undefined
  })

  return (
    <AuthLayout aside={<AuthAside photos={photos} foot={s.foot(all.settings.name, all.channels.length, active.length)} />}>
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
          <button key={m.id} type="button" onClick={() => enter(m)} className="flex min-w-0 cursor-pointer items-center gap-[11px] rounded-[18px] border border-rim bg-glass-2 px-3 py-2.5 text-left hover:bg-glass-3">
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
    </AuthLayout>
  )
}
