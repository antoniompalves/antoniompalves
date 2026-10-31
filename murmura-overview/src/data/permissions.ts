import type { Messages } from '../i18n'
import type { Permission, RoleDef, SystemRole, TeamMember, Workspace } from './types'

/**
 * Roles and what they allow, as the reference models them: seven system roles
 * (Owner can do everything and can't be edited), any roles the team adds, and
 * the workspace's approval rule deciding who needs a second pair of eyes.
 */

/** Every permission, in the order the Team page's matrix lists them. */
export const PERMISSIONS: Permission[] = [
  'post.create',
  'post.publish',
  'post.approve',
  'post.delete',
  'calendar.edit',
  'inbox.reply',
  'inbox.assign',
  'analytics.view',
  'analytics.export',
  'listening.manage',
  'library.manage',
  'channels.manage',
  'team.manage',
  'billing.manage',
  'settings.manage',
]

export type PermissionGroup = 'publishing' | 'engagement' | 'insights' | 'content' | 'admin'

export const PERMISSION_GROUP: Record<Permission, PermissionGroup> = {
  'post.create': 'publishing',
  'post.publish': 'publishing',
  'post.approve': 'publishing',
  'post.delete': 'publishing',
  'calendar.edit': 'publishing',
  'inbox.reply': 'engagement',
  'inbox.assign': 'engagement',
  'analytics.view': 'insights',
  'analytics.export': 'insights',
  'listening.manage': 'insights',
  'library.manage': 'content',
  'channels.manage': 'admin',
  'team.manage': 'admin',
  'billing.manage': 'admin',
  'settings.manage': 'admin',
}

const SYSTEM: SystemRole[] = ['owner', 'admin', 'manager', 'editor', 'community', 'analyst', 'client']
export const isSystemRole = (id: string): id is SystemRole => (SYSTEM as string[]).includes(id)

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

/** Active people who can approve posts for a brand. */
export const approversFor = (ws: Workspace, brandId: string) => ws.team.filter((m) => m.status === 'active' && seesBrand(m, brandId) && can(ws, m.id, 'post.approve'))

/** Whether this person's posts go through approval under the workspace's rule. */
export function needsApproval(ws: Workspace, memberId: string) {
  const rule = ws.settings.approval
  if (rule === 'off') return false
  if (rule === 'all') return !['owner', 'admin'].includes(member(ws, memberId)?.role ?? '')
  return !can(ws, memberId, 'post.publish')
}

/** A role's name in the interface language (added roles keep the name they were given). */
export function roleName(t: Messages, ws: Workspace, roleId: string) {
  return isSystemRole(roleId) ? t.roles[roleId] : (ws.roles.find((r) => r.id === roleId)?.name ?? roleId)
}
