import type { AnalyticsModel } from '../../data/analytics'
import { engagementRate, engagements } from '../../data/analytics'
import { NETWORK_LABEL } from '../../data/selectors'
import type { Workspace } from '../../data/types'
import type { Messages } from '../../i18n'

type Cell = string | number

/** Quote a cell when it holds the separator, a quote or a line break (RFC 4180). */
const quote = (v: Cell, sep: string) => {
  const s = String(v)
  return s.includes(sep) || /["\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * The analytics report as CSV, in the reader's language: summary, the daily
 * series, the table on screen and every post in the range, best reach first.
 */
export function analyticsCsv(m: AnalyticsModel, ws: Workspace, t: Messages, generated: Date) {
  const c = t.analytics.csv
  const net = m.network
  const day = (d: Date) => d.toISOString().slice(0, 10)
  const brandName = (id: string) => ws.brands.find((b) => b.id === id)?.name ?? ''
  const { impressions, engagements: eng, clicks } = m.metrics
  const followers = m.growth.current.map((v, i) => v - (m.growth.current[i - 1] ?? 0))

  const rows: Cell[][] = [
    [c.title],
    [c.scope, t.analytics.scope(net ? NETWORK_LABEL[net] : null)],
    [c.period, `${day(m.days[0])} – ${day(m.days[m.days.length - 1])}`],
    [c.generated, c.stamp(generated)],
    [],
    [c.summary],
    [c.audience, m.stats.audience],
    [c.newFollowers, m.stats.gained],
    [c.followerGrowth, c.pct(m.stats.growth)],
    [c.impressions, m.stats.impressions],
    [c.avgEngagement, c.pct(m.stats.engagementRate)],
    [c.postsPublished, m.stats.posts],
    [],
    [c.date, c.followers, c.impressions, c.engagements, c.linkClicks],
    ...m.days.map((d, i) => [day(d), followers[i], impressions.current[i], eng.current[i], clicks.current[i]]),
    [],
    [net ? c.account : c.network, c.accounts, c.followers, c.growth, c.impressions, c.engRate, c.posts],
    ...m.table.map((r) => [
      r.channel ? `${r.brand?.name ?? ''} ${r.channel.handle}` : NETWORK_LABEL[r.network],
      r.accounts,
      r.followers,
      c.pct(r.growth),
      r.impressions,
      r.posts ? c.pct(r.engagementRate) : '',
      r.posts,
    ]),
    [],
    [c.post, c.brand, c.published, c.networks, c.impressions, c.reach, c.engagements, c.engRate, c.linkClicks],
    ...[...m.posts]
      .sort((a, b) => b.metrics.reach - a.metrics.reach)
      .map((p) => [
        p.text.replace(/\n/g, ' '),
        brandName(p.brandId),
        p.scheduledAt,
        p.networks.map((n) => NETWORK_LABEL[n]).join(' '),
        p.metrics.impressions,
        p.metrics.reach,
        engagements(p.metrics),
        c.pct(engagementRate(p.metrics)),
        p.metrics.clicks,
      ]),
  ]
  return rows.map((r) => r.map((v) => quote(v, c.separator)).join(c.separator)).join('\r\n')
}

/** Hand a text file to the browser's downloads. A BOM keeps accents intact when Excel opens it. */
export function download(name: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob(['﻿', text], { type: `${type};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
