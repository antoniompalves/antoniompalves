import type { Permission, RoleDef, TeamMember, Workspace } from './types.ts'

/**
 * Who may do what, with nothing else attached: the browser (permissions.ts
 * re-exports these) and the accounts server (server/workspace) both decide
 * with the same rules.
 */

export const member = (ws: Workspace, id: string) => ws.team.find((m) => m.id === id)
export const roleOf = (ws: Workspace, m: TeamMember | undefined): RoleDef | undefined => (m ? ws.roles.find((r) => r.id === m.role) : undefined)

/** Whether someone may do something. Owners always may; invited or suspended people can't do anything yet. */
export function can(ws: Workspace, memberId: string, perm: Permission) {
  const m = member(ws, memberId)
  if (!m || m.status !== 'active') return false
  if (m.role === 'owner') return true
  return !!roleOf(ws, m)?.perms.includes(perm)
}

export const seesBrand = (m: TeamMember, brandId: string) => m.brands === 'all' || m.brands.includes(brandId)
