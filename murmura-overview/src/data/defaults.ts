import type { AnalyticsHistory, Brand, NetworkId, RoleDef, TeamMember, Tone, Workspace, WorkspaceSettings } from './types.ts'

/**
 * What a new company workspace starts with on the accounts server: the seven
 * roles, sensible settings, the brands and the owner from the setup screen,
 * and empty lists everywhere else. Also `shiftDates`, which moves the sample
 * workspace to today when someone starts from the sample data.
 *
 * Nothing here may import anything but types: the server loads this file as is.
 */

const ALL_PERMS: RoleDef['perms'] = [
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

/** The roles every workspace starts with (the same as the sample workspace's). */
export const DEFAULT_ROLES: RoleDef[] = [
  { id: 'owner', perms: ALL_PERMS, tone: 'ink', system: true },
  { id: 'admin', perms: ALL_PERMS.filter((p) => p !== 'billing.manage'), tone: 'sea', system: true },
  {
    id: 'manager',
    perms: ['post.create', 'post.publish', 'post.approve', 'post.delete', 'calendar.edit', 'inbox.reply', 'inbox.assign', 'analytics.view', 'analytics.export', 'listening.manage', 'library.manage', 'creators.manage'],
    tone: 'pine',
    system: true,
  },
  { id: 'editor', perms: ['post.create', 'calendar.edit', 'inbox.reply', 'analytics.view', 'library.manage'], tone: 'butter', system: true },
  { id: 'community', perms: ['inbox.reply', 'inbox.assign', 'analytics.view'], tone: 'lilac', system: true },
  { id: 'analyst', perms: ['analytics.view', 'analytics.export', 'listening.manage'], tone: 'plain', system: true },
  { id: 'client', perms: ['post.approve', 'analytics.view'], tone: 'coral', system: true },
]

export const defaultSettings = (name: string, currency: WorkspaceSettings['currency'] = 'EUR'): WorkspaceSettings => ({
  name,
  weekStart: 1,
  approval: 'perm',
  shortenLinks: false,
  utm: false,
  utmSource: 'kataru',
  notify: { approvals: true, mentions: true, failures: true, digest: false },
  currency,
  plan: 'agency',
  seats: 50,
  requireMfa: false,
})

const NETWORKS: NetworkId[] = ['instagram', 'facebook', 'tiktok', 'threads', 'pinterest', 'youtube', 'x', 'linkedin']
const zeros = (n: number) => Array.from({ length: n }, () => 0)

/** No history yet: 180 days of zeros per network, until the networks report in. */
export function emptyAnalytics(): AnalyticsHistory {
  const series = Object.fromEntries(NETWORKS.map((n) => [n, { followers: zeros(180), impressions: zeros(180), engagements: zeros(180), clicks: zeros(180) }]))
  const networkTrends = Object.fromEntries(NETWORKS.map((n) => [n, { 7: zeros(7), 30: zeros(24), 90: zeros(24) }]))
  const heat = Object.fromEntries([...NETWORKS, 'all'].map((n) => [n, zeros(7 * 24)]))
  return { series, accounts: {}, networkTrends, heat } as AnalyticsHistory
}

/** A typical week for "Best times" until there is history: late mornings and evenings, busier at weekends. */
export const STARTER_BEST_TIMES: number[][] = Array.from({ length: 7 }, (_, day) =>
  Array.from({ length: 18 }, (_, i) => {
    const hour = 6 + i
    const peak = Math.max(Math.exp(-((hour - 12) ** 2) / 6), Math.exp(-((hour - 19.5) ** 2) / 5))
    return Math.round(Math.min(1, (0.15 + 0.8 * peak) * (day >= 5 ? 1.05 : 1)) * 100) / 100
  }),
)

const TONES: Tone[] = ['coral', 'butter', 'ink', 'pine', 'sea', 'lilac']

export const slugOf = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/[\s&+-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?'

/** A brand for the company, with an id that isn't taken yet. */
export function newBrand(name: string, taken: string[], industry = ''): Brand {
  const base = slugOf(name) || 'brand'
  let id = base
  for (let i = 2; taken.includes(id); i++) id = `${base}-${i}`
  return { id, name: name.trim(), initials: initialsOf(name), tone: TONES[taken.length % TONES.length]!, handle: base.replace(/-/g, ''), industry, cover: `brand-${id}` }
}

export interface NewWorkspace {
  company: string
  brands: { name: string; industry?: string }[]
  owner: { id: string; name: string; email: string; title?: string }
  now: string
  timeZone?: string
  currency?: WorkspaceSettings['currency']
}

/** The company's workspace on day one. */
export function emptyWorkspace(n: NewWorkspace): Workspace {
  const brands: Brand[] = []
  for (const b of n.brands) brands.push(newBrand(b.name, brands.map((x) => x.id), b.industry))
  const owner: TeamMember = { id: n.owner.id, name: n.owner.name, role: 'owner', title: n.owner.title, brands: 'all', email: n.owner.email, status: 'active', mfa: false, joinedAt: n.now, lastActiveAt: n.now }
  return {
    now: n.now,
    timeZone: n.timeZone ?? 'Europe/Lisbon',
    currentUserId: owner.id,
    brands,
    campaigns: [],
    team: [owner],
    roles: DEFAULT_ROLES,
    settings: defaultSettings(n.company, n.currency),
    channels: [],
    websites: [],
    posts: [],
    analytics: emptyAnalytics(),
    reports: [],
    bestTimes: STARTER_BEST_TIMES,
    conversations: [],
    keywords: [],
    mentions: [],
    competitors: [],
    savedReplies: [],
    inboxAccounts: [],
    waTemplates: [],
    creators: [],
    creatorCampaigns: [],
    deliverables: [],
    media: [],
    templates: [],
    hashtagSets: [],
    audit: [],
    notices: [],
    brandScope: null,
    signedIn: true,
  }
}

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY = 86_400_000

/**
 * Every date in `value` moved by `ms` (whole days for plain dates), so the
 * sample workspace, frozen on its own day, reads as if it were today.
 */
export function shiftDates<T>(value: T, ms: number): T {
  const days = Math.round(ms / DAY)
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      if (DATE_TIME.test(v)) return new Date(Date.parse(v) + ms).toISOString()
      if (DATE.test(v)) return new Date(Date.parse(`${v}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10)
      return v
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
    return v
  }
  return walk(value) as T
}
