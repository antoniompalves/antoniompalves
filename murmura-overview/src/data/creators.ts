import type { CreatorCampaign, Deliverable, DeliverableResults, DeliverableStatus, Workspace } from './types'

/**
 * Creator campaigns, tracked by hand: the figures the Creators page shows,
 * worked out from what the team logs. Engagements are likes + comments +
 * shares + saves (as in analytics); the engagement rate is over reach, or over
 * views when only views were logged. Costs only count deliverables with
 * results, so a campaign half posted doesn't look cheap or expensive.
 */

export const STATUS_ORDER: DeliverableStatus[] = ['briefed', 'in_review', 'approved', 'live']

export const engagementsOf = (r?: DeliverableResults) => (r?.likes ?? 0) + (r?.comments ?? 0) + (r?.shares ?? 0) + (r?.saves ?? 0)

/** Engagements over reach (or views); null with nothing to divide by. */
export const rateOf = (r?: DeliverableResults) => {
  const base = r?.reach || r?.views
  return base ? engagementsOf(r) / base : null
}

export const hasResults = (d: Deliverable) => !!d.results && Object.values(d.results).some((v) => (v ?? 0) > 0)

export const isOverdue = (d: Deliverable, now: number) => d.status !== 'live' && Date.parse(d.dueAt) < now

const sum = <T>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0)

/** Totals over a set of deliverables. */
export function totals(ds: Deliverable[]) {
  const logged = ds.filter(hasResults)
  const reach = sum(logged, (d) => d.results?.reach || d.results?.views || 0)
  const engagements = sum(logged, (d) => engagementsOf(d.results))
  const loggedFees = sum(logged, (d) => d.fee)
  const revenue = sum(logged, (d) => d.results?.revenue ?? 0)
  return {
    count: ds.length,
    live: ds.filter((d) => d.status === 'live').length,
    agreed: sum(ds, (d) => d.fee),
    paid: sum(
      ds.filter((d) => d.paid),
      (d) => d.fee,
    ),
    logged: logged.length,
    reach,
    engagements,
    clicks: sum(logged, (d) => d.results?.clicks ?? 0),
    conversions: sum(logged, (d) => d.results?.conversions ?? 0),
    revenue,
    /** Engagements over reach. */
    rate: reach ? engagements / reach : null,
    /** Fees of logged deliverables over their engagements. */
    cpe: engagements ? loggedFees / engagements : null,
    /** Fees per thousand reached. */
    cpm: reach ? (loggedFees / reach) * 1000 : null,
    /** Revenue over the fees of the deliverables that brought it. */
    roas: revenue ? revenue / sum(logged.filter((d) => d.results?.revenue), (d) => d.fee) : null,
    byStatus: Object.fromEntries(STATUS_ORDER.map((s) => [s, ds.filter((d) => d.status === s).length])) as Record<DeliverableStatus, number>,
  }
}

export type CampaignState = 'upcoming' | 'running' | 'ended'

const DAY = 86_400_000
export function campaignState(c: CreatorCampaign, now: number): CampaignState {
  if (now < Date.parse(`${c.start}T00:00:00Z`)) return 'upcoming'
  return now >= Date.parse(`${c.end}T00:00:00Z`) + DAY ? 'ended' : 'running'
}

/** Running campaigns first, then the ones about to start, then the ended ones (latest first). */
export function sortedCampaigns(ws: Workspace, now: number) {
  const rank: Record<CampaignState, number> = { running: 0, upcoming: 1, ended: 2 }
  return [...ws.creatorCampaigns].sort((a, b) => rank[campaignState(a, now)] - rank[campaignState(b, now)] || (campaignState(a, now) === 'ended' ? b.end.localeCompare(a.end) : a.end.localeCompare(b.end)))
}

/** A campaign's deliverables, by due date. */
export const deliverablesOf = (ws: Workspace, campaignId: string) => ws.deliverables.filter((d) => d.campaignId === campaignId).sort((a, b) => a.dueAt.localeCompare(b.dueAt))

/** One creator's record across the campaigns on screen. */
export function creatorRecord(ws: Workspace, creatorId: string) {
  const ds = ws.deliverables.filter((d) => d.creatorId === creatorId)
  return { deliverables: ds, ...totals(ds) }
}

/** Header figures for the deliverables on screen. */
export function creatorStats(ws: Workspace) {
  const all = totals(ws.deliverables)
  return { active: ws.creators.filter((c) => c.status === 'active').length, ...all }
}

export const matchesCreator = (c: Workspace['creators'][number], q: string) => {
  const needle = q.trim().toLowerCase()
  return !needle || [c.name, c.location ?? '', ...c.tags, ...c.profiles.map((p) => p.handle)].join(' ').toLowerCase().includes(needle)
}

/** The deliverables as CSV rows (header first), for a campaign's "Export results". */
export function resultsRows(ws: Workspace, campaignId: string, labels: { header: string[]; status: Record<DeliverableStatus, string>; network: (n: string) => string; format: (n: Deliverable) => string; yes: string; no: string; pct: (f: number) => string }) {
  const rows: (string | number)[][] = [labels.header]
  for (const d of deliverablesOf(ws, campaignId)) {
    const r = d.results ?? {}
    const rate = rateOf(d.results)
    rows.push([
      ws.creators.find((c) => c.id === d.creatorId)?.name ?? '',
      labels.network(d.network),
      labels.format(d),
      d.dueAt.slice(0, 10),
      labels.status[d.status],
      d.fee,
      d.paid ? labels.yes : labels.no,
      d.postedAt?.slice(0, 10) ?? '',
      d.url ?? '',
      d.code ?? '',
      r.reach ?? '',
      r.views ?? '',
      r.likes ?? '',
      r.comments ?? '',
      r.shares ?? '',
      r.saves ?? '',
      r.clicks ?? '',
      r.conversions ?? '',
      r.revenue ?? '',
      engagementsOf(d.results) || '',
      rate === null ? '' : labels.pct(rate),
    ])
  }
  return rows
}
