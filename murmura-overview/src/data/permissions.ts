import type { Messages } from '../i18n'
import type { RouteId } from './routes'
import { can, member, seesBrand } from './access.ts'
import type { Permission, SystemRole, Workspace } from './types'

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
  'creators.manage',
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
  'creators.manage': 'content',
  'channels.manage': 'admin',
  'team.manage': 'admin',
  'billing.manage': 'admin',
  'settings.manage': 'admin',
}

const SYSTEM: SystemRole[] = ['owner', 'admin', 'manager', 'editor', 'community', 'analyst', 'client']
export const isSystemRole = (id: string): id is SystemRole => (SYSTEM as string[]).includes(id)

export { can, member, roleOf, seesBrand } from './access.ts'

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

/** The tooltip on a control the current role can't use ("Your role (Editor) can’t do this"), or undefined when it can. */
export const lockTitle = (t: Messages, ws: Workspace, memberId: string, perm: Permission) =>
  can(ws, memberId, perm) ? undefined : t.common.roleCant(roleName(t, ws, member(ws, memberId)?.role ?? ''))

/** Pages that need one of these permissions; every other page is open to everyone (as in the reference). */
export const ROUTE_NEEDS: Partial<Record<RouteId, Permission[]>> = {
  compose: ['post.create'],
  inbox: ['inbox.reply', 'inbox.assign'],
  approvals: ['post.approve', 'post.create'],
  analytics: ['analytics.view'],
  listening: ['analytics.view', 'listening.manage'],
  creators: ['creators.manage', 'analytics.view'],
}

export const canOpen = (ws: Workspace, memberId: string, route: RouteId) => !ROUTE_NEEDS[route] || ROUTE_NEEDS[route]!.some((p) => can(ws, memberId, p))
