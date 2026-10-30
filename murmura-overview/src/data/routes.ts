/**
 * Hash routes exposed by the reference SPA's navigation, captured by walking
 * every tab, dock link and in-page link with Playwright. Labels, headings and
 * section names live in the message catalogues (`t.routes[id]`).
 */

export type RouteId = 'overview' | 'compose' | 'calendar' | 'inbox' | 'approvals' | 'analytics' | 'listening' | 'library' | 'channels' | 'team' | 'settings'

export interface RouteDef {
  id: RouteId
  path: `#/${RouteId}`
  /** Where the entry point lives in the chrome. */
  entry: 'tabs' | 'dock'
}

export const routes: RouteDef[] = [
  { id: 'overview', path: '#/overview', entry: 'tabs' },
  { id: 'compose', path: '#/compose', entry: 'tabs' },
  { id: 'calendar', path: '#/calendar', entry: 'tabs' },
  { id: 'inbox', path: '#/inbox', entry: 'tabs' },
  { id: 'approvals', path: '#/approvals', entry: 'tabs' },
  { id: 'analytics', path: '#/analytics', entry: 'tabs' },
  { id: 'listening', path: '#/listening', entry: 'tabs' },
  { id: 'library', path: '#/library', entry: 'dock' },
  { id: 'channels', path: '#/channels', entry: 'dock' },
  { id: 'team', path: '#/team', entry: 'dock' },
  { id: 'settings', path: '#/settings', entry: 'dock' },
]

/** Deep links seen in the reference: `#/inbox/:conversationId`, `#/compose/:postId`, `#/analytics/:network`, `#/team/members`, `#/team/audit`, `#/settings/:section`. */
export const tabRoutes = routes.filter((r) => r.entry === 'tabs')

/** Resolve the top-level route for a hash such as "#/inbox/c1". */
export function matchRoute(hash: string): RouteDef {
  const top = hash.replace(/^#\/?/, '').split('/')[0] || 'overview'
  return routes.find((r) => r.id === top) ?? routes[0]
}
