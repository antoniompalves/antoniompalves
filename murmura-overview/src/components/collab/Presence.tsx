import { Avatar, cn } from '../ui'
import { useWorkspace } from '../../data/store'
import { useI18n } from '../../i18n'

/**
 * Teammates on the same post or conversation right now (server mode): their
 * faces and "Malik is editing this too". Nothing in the demo, or when alone.
 */
export function Presence({ where, editing = false, className }: { where: string; editing?: boolean; className?: string }) {
  const { t } = useI18n()
  const { all, server } = useWorkspace()
  const here = (server?.presence ?? []).filter((p) => p.where === where || p.where.startsWith(`${where}?`))
  const people = here.map((p) => all.team.find((m) => m.id === p.memberId)).filter((m): m is NonNullable<typeof m> => !!m)
  if (!people.length) return null
  const names = t.collab.list(people.map((m) => m.name.split(' ')[0]!))
  const text = editing ? t.collab.presence.editing(names, people.length > 1) : t.collab.presence.viewing(names, people.length > 1)
  return (
    <span role="status" className={cn('inline-flex min-w-0 items-center gap-2 rounded-full border border-rim bg-glass-2 py-1 pl-1 pr-3 text-2xs font-semibold', className)} data-presence>
      <span className="inline-flex">
        {people.slice(0, 3).map((m, i) => (
          <span key={m.id} className={cn('relative rounded-full shadow-[0_0_0_2px_var(--glass)]', i > 0 && '-ml-2')}>
            <Avatar src={m.avatar} name={m.name} size="sm" />
            <i aria-hidden className="absolute -bottom-px -right-px size-2 rounded-full bg-pine shadow-[0_0_0_1.5px_var(--glass)]" />
          </span>
        ))}
      </span>
      <span className="truncate">{text}</span>
    </span>
  )
}
