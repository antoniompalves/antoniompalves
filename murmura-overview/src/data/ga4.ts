import type { NetworkId } from './types'
import { SITE_DAYS, dayKey } from './webAnalytics'
import type { ChannelGroup, PageHistory, SiteHistory } from './webAnalytics'

/**
 * Live Google Analytics 4 data, read straight from the browser: a Google
 * Identity Services token with the read-only Analytics scope (kept in memory,
 * never stored) and one `batchRunReports` call per GA4 property. Responses are
 * mapped into the same SiteHistory the demo data uses.
 *
 * Setup (see docs/GOOGLE_ANALYTICS.md): a Google Cloud project with the Google
 * Analytics Data API enabled, an OAuth client ID of type "Web application"
 * whose authorised JavaScript origins include this app's origin, and Viewer
 * access to each property for the person who signs in.
 */

export const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const API = 'https://analyticsdata.googleapis.com/v1beta'

/* ───────────────────────── sign-in ───────────────────────── */

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

interface GoogleAccounts {
  oauth2: {
    initTokenClient: (config: {
      client_id: string
      scope: string
      prompt?: string
      callback: (r: TokenResponse) => void
      error_callback?: (e: { type?: string; message?: string }) => void
    }) => { requestAccessToken: (o?: { prompt?: string }) => void }
    revoke: (token: string, done?: () => void) => void
  }
}

declare global {
  interface Window {
    google?: { accounts?: GoogleAccounts }
  }
}

/** What went wrong, so the interface can word it in the reader's language. */
export type Ga4ErrorKind = 'unreachable' | 'closed' | 'signIn' | 'denied' | 'expired' | 'notFound' | 'api'

export class Ga4Error extends Error {
  kind: Ga4ErrorKind
  /** Google's own explanation, when it gave one (shown as is). */
  detail: string
  constructor(kind: Ga4ErrorKind, detail = '') {
    super(detail || kind)
    this.kind = kind
    this.detail = detail
  }
}

const httpKind = (status: number): Ga4ErrorKind => (status === 401 ? 'expired' : status === 403 ? 'denied' : status === 404 ? 'notFound' : 'api')

let gis: Promise<GoogleAccounts> | null = null

/** Loads the Google Identity Services script once. */
function loadGis(): Promise<GoogleAccounts> {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts)
  gis ??= new Promise<GoogleAccounts>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => (window.google?.accounts?.oauth2 ? resolve(window.google.accounts) : reject(new Ga4Error('unreachable')))
    script.onerror = () => {
      gis = null
      reject(new Ga4Error('unreachable'))
    }
    document.head.append(script)
  })
  return gis
}

/** Fetch the sign-in script ahead of the click, so Google's popup opens within the click's user activation. */
export const preloadGis = () => void loadGis().catch(() => {})

export interface Ga4Token {
  value: string
  expiresAt: number
}

/** Opens Google's consent popup (or reuses the grant silently) and resolves with an access token. */
export async function requestToken(clientId: string, prompt: '' | 'consent' = ''): Promise<Ga4Token> {
  const accounts = await loadGis()
  return new Promise((resolve, reject) => {
    const client = accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GA4_SCOPE,
      callback: (r) => {
        if (r.access_token) resolve({ value: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 })
        else reject(new Ga4Error(r.error === 'access_denied' ? 'closed' : 'signIn', r.error_description || r.error || ''))
      },
      error_callback: (e) => reject(new Ga4Error(e.type === 'popup_closed' || e.type === 'popup_failed_to_open' ? 'closed' : 'signIn', e.message ?? '')),
    })
    client.requestAccessToken({ prompt })
  })
}

export async function revokeToken(token: string) {
  try {
    const accounts = await loadGis()
    accounts.oauth2.revoke(token)
  } catch {
    /* nothing to revoke against: the token expires within the hour anyway */
  }
}

/* ───────────────────────── reports ───────────────────────── */

interface Row {
  dimensionValues?: { value?: string }[]
  metricValues?: { value?: string }[]
}

interface Report {
  dimensionHeaders?: { name: string }[]
  metricHeaders?: { name: string }[]
  rows?: Row[]
}

/** GA4 default channel groups → the page's groups. */
const CHANNEL: Record<string, ChannelGroup> = {
  'Organic Search': 'organicSearch',
  Direct: 'direct',
  'Organic Social': 'organicSocial',
  'Paid Social': 'paidSocial',
  Referral: 'referral',
  Email: 'email',
  'Paid Search': 'paidSearch',
  'Organic Video': 'organicVideo',
  Display: 'display',
}

/** Session sources → social networks (GA4 records the referrer host or the utm_source). */
const SOURCES: [RegExp, NetworkId][] = [
  [/(^|\.)instagram(\.com)?$|^ig$/i, 'instagram'],
  [/(^|\.)facebook(\.com)?$|^fb$|^(l|lm|m)\.facebook\.com$/i, 'facebook'],
  [/(^|\.)tiktok(\.com)?$/i, 'tiktok'],
  [/(^|\.)threads(\.net|\.com)?$/i, 'threads'],
  [/(^|\.)pinterest(\.[a-z.]+)?$|^pin\.it$/i, 'pinterest'],
  [/(^|\.)youtube(\.com)?$|^youtu\.be$/i, 'youtube'],
  [/^(t\.co|x|x\.com|twitter|twitter\.com|mobile\.twitter\.com)$/i, 'x'],
  [/(^|\.)linkedin(\.com)?$|^lnkd\.in$/i, 'linkedin'],
]

export const sourceNetwork = (source: string) => SOURCES.find(([re]) => re.test(source.trim()))?.[1] ?? null

const RANGE = [{ startDate: `${SITE_DAYS - 1}daysAgo`, endDate: 'today' }]
const TOTALS = ['sessions', 'screenPageViews', 'engagedSessions', 'userEngagementDuration', 'keyEvents']

/** The four reports behind one site, sent as one request. */
export const REQUESTS = [
  { dateRanges: RANGE, dimensions: [{ name: 'date' }], metrics: TOTALS.map((name) => ({ name })), limit: 1000 },
  { dateRanges: RANGE, dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], limit: 10000 },
  {
    dateRanges: RANGE,
    dimensions: [{ name: 'date' }, { name: 'sessionSource' }],
    metrics: [{ name: 'sessions' }],
    dimensionFilter: { filter: { fieldName: 'sessionDefaultChannelGroup', inListFilter: { values: ['Organic Social', 'Paid Social'] } } },
    limit: 10000,
  },
  {
    dateRanges: RANGE,
    dimensions: [{ name: 'date' }, { name: 'landingPage' }],
    metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }, { name: 'userEngagementDuration' }, { name: 'keyEvents' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10000,
  },
]

/** Landing pages kept per site, busiest first. */
const MAX_PAGES = 25

/** "20261030" → index in a 180-day window ending on `end` (YYYY-MM-DD), or -1 outside it. */
function dayIndex(gaDate: string, end: string) {
  const d = Date.UTC(+gaDate.slice(0, 4), +gaDate.slice(4, 6) - 1, +gaDate.slice(6, 8))
  const i = SITE_DAYS - 1 - Math.round((Date.parse(`${end}T00:00:00Z`) - d) / 86_400_000)
  return i >= 0 && i < SITE_DAYS ? i : -1
}

/** Turns the four reports into a SiteHistory ending on `end` (the viewer's today). */
export function toHistory(reports: Report[], end: string): SiteHistory {
  const zeros = () => new Array<number>(SITE_DAYS).fill(0)
  const h: SiteHistory = { end, sessions: zeros(), views: zeros(), engaged: zeros(), seconds: zeros(), keyEvents: zeros(), channels: {}, social: {}, pages: [] }
  const rows = (r: Report | undefined) =>
    (r?.rows ?? []).map((row) => ({ dims: (row.dimensionValues ?? []).map((d) => d.value ?? ''), mets: (row.metricValues ?? []).map((m) => Number(m.value) || 0) }))

  for (const { dims, mets } of rows(reports[0])) {
    const i = dayIndex(dims[0], end)
    if (i < 0) continue
    h.sessions[i] += mets[0]
    h.views[i] += mets[1]
    h.engaged[i] += mets[2]
    h.seconds[i] += mets[3]
    h.keyEvents[i] += mets[4]
  }
  for (const { dims, mets } of rows(reports[1])) {
    const i = dayIndex(dims[0], end)
    if (i >= 0) (h.channels[CHANNEL[dims[1]] ?? 'other'] ??= zeros())[i] += mets[0]
  }
  for (const { dims, mets } of rows(reports[2])) {
    const i = dayIndex(dims[0], end)
    const n = sourceNetwork(dims[1])
    if (i >= 0 && n) (h.social[n] ??= zeros())[i] += mets[0]
  }
  const pages = new Map<string, PageHistory>()
  for (const { dims, mets } of rows(reports[3])) {
    const i = dayIndex(dims[0], end)
    if (i < 0) continue
    const path = dims[1] || '/'
    let pg = pages.get(path)
    if (!pg) pages.set(path, (pg = { path, sessions: zeros(), engaged: zeros(), seconds: zeros(), keyEvents: zeros() }))
    pg.sessions[i] += mets[0]
    pg.engaged[i] += mets[1]
    pg.seconds[i] += mets[2]
    pg.keyEvents[i] += mets[3]
  }
  const total = (pg: PageHistory) => pg.sessions.reduce((a, b) => a + b, 0)
  h.pages = [...pages.values()].sort((a, b) => total(b) - total(a)).slice(0, MAX_PAGES)
  return h
}

/** Fetches 180 days of one GA4 property. */
export async function fetchProperty(token: string, propertyId: string, end = dayKey(localToday())): Promise<SiteHistory> {
  const res = await fetch(`${API}/properties/${encodeURIComponent(propertyId)}:batchRunReports`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: REQUESTS }),
  })
  const body = (await res.json().catch(() => ({}))) as { reports?: Report[]; error?: { message?: string } }
  if (!res.ok) throw new Ga4Error(httpKind(res.status), body.error?.message ?? '')
  return toHistory(body.reports ?? [], end)
}

/** The viewer's calendar date as a UTC midnight, to line GA4's dates up with the page's. */
function localToday() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

/** GA4 property IDs are plain numbers ("properties/123456789" is accepted too). */
export const cleanPropertyId = (raw: string) => raw.trim().replace(/^properties\//, '')
export const isPropertyId = (raw: string) => /^\d{6,12}$/.test(cleanPropertyId(raw))
