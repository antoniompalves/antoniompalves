/**
 * Hash routes exposed by the reference SPA's navigation, captured by walking
 * every tab, dock link and in-page link with Playwright.
 */

export interface RouteDef {
  path: `#/${string}`
  /** Label in the tab bar / dock tooltip. */
  label: string
  /** Heading (h1) of the view. */
  title: string
  /** Where the entry point lives in the chrome. */
  entry: 'tabs' | 'dock' | 'deep-link'
  /** Card/section headings found on the view (for scoping a recreation). */
  sections?: string[]
}

export const routes: RouteDef[] = [
  { path: '#/overview', label: 'Overview', title: 'Overview', entry: 'tabs', sections: ['Up next', 'Needs you', 'Audience growth', 'Top post this month', 'The week ahead', 'Network pulse', 'Inbox pulse', 'Team activity'] },
  { path: '#/compose', label: 'Compose', title: 'New post', entry: 'tabs', sections: ['New post', 'Preview', 'When', 'Your drafts'] },
  { path: '#/calendar', label: 'Calendar', title: 'Publishing calendar', entry: 'tabs', sections: ['Week · Month · List', 'Jump to a date', 'Unscheduled drafts', 'This week by network'] },
  { path: '#/inbox', label: 'Inbox', title: 'Inbox', entry: 'tabs', sections: ['Conversation list', 'Thread'] },
  { path: '#/approvals', label: 'Approvals', title: 'Approvals', entry: 'tabs', sections: ['Waiting for me', 'All pending', 'Changes requested', 'My submissions', 'Recently approved', 'The rule in force', 'Who approves'] },
  { path: '#/analytics', label: 'Analytics', title: 'Analytics', entry: 'tabs', sections: ['Audience growth', 'Impressions & engagement', 'Best time to post', 'Content mix', 'By network', 'Top posts', 'Brand comparison'] },
  { path: '#/listening', label: 'Listening', title: 'Listening', entry: 'tabs', sections: ['Tracked keywords', 'Mentions', 'Share of voice', 'Trending terms', 'Sentiment over time', 'Competitors'] },
  { path: '#/library', label: 'Library', title: 'Library', entry: 'dock', sections: ['Media', 'Templates', 'Hashtag sets', 'Saved replies'] },
  { path: '#/channels', label: 'Channels', title: 'Channels', entry: 'dock', sections: ['Needs attention', 'Per-brand channels', 'Audience by network', 'Supported networks'] },
  { path: '#/team', label: 'Team & roles', title: 'Team & roles', entry: 'dock', sections: ['Members', 'Roles & permissions', 'Audit log'] },
  { path: '#/settings', label: 'Settings', title: 'Settings', entry: 'dock', sections: ['Profile', 'Notifications', 'Workspace', 'Approvals', 'Security', 'Billing', 'Appearance', 'Data'] },

  { path: '#/inbox/:conversationId', label: 'Conversation', title: 'Conversation', entry: 'deep-link' },
  { path: '#/compose/:postId', label: 'Edit post', title: 'Edit post', entry: 'deep-link' },
  { path: '#/analytics/:network', label: 'Analytics · network', title: 'Analytics · network', entry: 'deep-link' },
  { path: '#/team/members', label: 'Members', title: 'Members', entry: 'deep-link' },
  { path: '#/team/audit', label: 'Audit log', title: 'Audit log', entry: 'deep-link' },
  { path: '#/settings/:section', label: 'Settings section', title: 'Settings section', entry: 'deep-link' },
]

export const tabRoutes = routes.filter((r) => r.entry === 'tabs')

/** Resolve the top-level route for a hash such as "#/inbox/c1". */
export function matchRoute(hash: string): RouteDef {
  const top = `#/${hash.replace(/^#\/?/, '').split('/')[0] || 'overview'}`
  return routes.find((r) => r.path === top) ?? routes[0]
}
