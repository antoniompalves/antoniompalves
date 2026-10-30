import { ANALYTICS_NETWORKS, engagementRate } from './analytics'
import { fold } from './inbox'
import { MENTIONS } from './listeningData'
import { personPhoto } from './assets'
import type { Brand, Competitor, Keyword, KeywordKind, Mention, NetworkId, Sentiment, Tone, Workspace } from './types'
import { rng } from './webAnalytics'

/**
 * View model for #/listening: tracked keywords, the mentions they catch, share
 * of voice against competitors, trending terms and sentiment over 14 days. The
 * rules (what "this week" means, how the share and the cloud are counted) are
 * the reference page's, checked figure by figure against it.
 */

const DAY = 86_400_000

export const KEYWORD_KINDS: KeywordKind[] = ['brand', 'hashtag', 'topic', 'competitor']
export const KIND_TONE: Record<KeywordKind, Tone> = { brand: 'ink', hashtag: 'sea', topic: 'pine', competitor: 'coral' }
export const SENTIMENTS: Sentiment[] = ['positive', 'neutral', 'negative']
/** Networks listening covers; the stream's network menu lists those with mentions. */
const LISTENED: NetworkId[] = ['instagram', 'x', 'tiktok', 'threads', 'facebook', 'youtube']

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const startOfDay = (ms: number) => Math.floor(ms / DAY) * DAY
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Mentions from the last seven days (a rolling week, like every "this week" on the page). */
export const thisWeek = (mentions: Mention[], now: Date) => {
  const from = now.getTime() - 7 * DAY
  return mentions.filter((m) => Date.parse(m.at) >= from)
}

/**
 * What the stream shows: the post's text, led by the keyword when the text
 * doesn't contain it ("Pour over — Their content is so good lately").
 */
export function mentionText(m: Mention, keyword: Keyword | undefined) {
  return !keyword || fold(m.text).includes(fold(keyword.term)) ? m.text : `${capitalize(keyword.term)} — ${m.text}`
}

/** Positive / neutral / negative shares of a set of mentions (all 0 when there are none). */
function split(mentions: Mention[]) {
  const share = (s: Sentiment) => (mentions.length ? mentions.filter((m) => m.sentiment === s).length / mentions.length : 0)
  return { positive: share('positive'), neutral: share('neutral'), negative: share('negative') }
}

/** Mentions per calendar day for the `days` days ending today, oldest first. */
function perDay(mentions: Mention[], now: Date, days: number, keep: (m: Mention) => boolean = () => true) {
  const first = startOfDay(now.getTime()) - (days - 1) * DAY
  const out = Array<number>(days).fill(0)
  for (const m of mentions) {
    const i = Math.floor((Date.parse(m.at) - first) / DAY)
    if (i >= 0 && i < days && keep(m)) out[i]++
  }
  return out
}

/* ───────────────────────── stream filters ───────────────────────── */

export interface StreamFilters {
  keywordId: string | null
  sentiment: Sentiment | 'all'
  network: NetworkId | null
  savedOnly: boolean
  /** A trending term picked in the cloud. */
  term: string | null
}

export const NO_STREAM_FILTERS: StreamFilters = { keywordId: null, sentiment: 'all', network: null, savedOnly: false, term: null }

export const isFiltered = (f: StreamFilters) => !!(f.keywordId || f.term || f.sentiment !== 'all' || f.network || f.savedOnly)

/** The stream: visible mentions matching the filters, newest first. */
export function streamOf(ws: Workspace, f: StreamFilters) {
  const keyword = new Map(ws.keywords.map((k) => [k.id, k]))
  const needle = f.term ? fold(f.term) : ''
  return ws.mentions
    .filter(
      (m) =>
        keyword.has(m.keywordId) &&
        !m.hidden &&
        (!f.keywordId || m.keywordId === f.keywordId) &&
        (f.sentiment === 'all' || m.sentiment === f.sentiment) &&
        (!f.network || m.network === f.network) &&
        (!f.savedOnly || m.saved) &&
        (!needle || fold(mentionText(m, keyword.get(m.keywordId))).includes(needle)),
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

/* ───────────────────────── trending terms ───────────────────────── */

/* Words too common or too vague to say anything about a brand. */
const FILLER = new Set(
  [
    // function words
    'a an the and or but so to of in on at for from with into than then that this these those there their they them what which who whom whose about over just very much really',
    'is it be are was were been have has had will would could should can may might my your our its out vs',
    // time
    'time today year week month hour second lately before after',
    // everyday verbs and fillers
    'thing things anyone everyone someone honestly apparently tried thinking telling bought took sorted asks saw new one bit few big huge',
    // shopping small talk
    'forever order arrived options commit worth respect stand market',
  ]
    .join(' ')
    .split(' '),
)

export type TermKind = 'keyword' | 'hashtag' | 'word'

export interface TrendingTerm {
  key: string
  label: string
  kind: TermKind
  /** Mentions this week. */
  count: number
  keywordId?: string
  /** Type size, 1 (smallest) to 5. */
  size: number
}

/**
 * The cloud: each keyword with its mentions this week, plus hashtags and words
 * (4+ letters, not filler, not part of a keyword) from this week's mentions;
 * words need two mentions. The 22 busiest, biggest first in alternation with
 * the smallest so the cloud mixes sizes.
 */
export function trendingTerms(keywords: Keyword[], mentions: Mention[], now: Date): TrendingTerm[] {
  const week = thisWeek(mentions, now).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  const terms = new Map<string, Omit<TrendingTerm, 'size'>>()
  const add = (label: string, kind: TermKind, count = 1, keywordId?: string) => {
    const key = label.toLowerCase()
    const seen = terms.get(key)
    if (seen) seen.count += count
    else terms.set(key, { key, label, kind, count, ...(keywordId && { keywordId }) })
  }
  const keywordTerms = keywords.map((k) => k.term.toLowerCase())
  for (const k of keywords) add(k.term, 'keyword', week.filter((m) => m.keywordId === k.id).length, k.id)
  for (const m of week) {
    for (const tag of m.text.match(/#[\p{L}\d_]+/gu) ?? []) if (!keywordTerms.includes(tag.toLowerCase())) add(tag, 'hashtag')
    for (const word of m.text.toLowerCase().match(/\p{L}{4,}/gu) ?? []) if (!FILLER.has(word) && !keywordTerms.some((t) => t.includes(word))) add(word, 'word')
  }
  const ranked = [...terms.values()].filter((t) => t.count > (t.kind === 'word' ? 1 : 0)).sort((a, b) => b.count - a.count).slice(0, 22)
  const max = Math.max(...ranked.map((t) => t.count))
  const min = Math.min(...ranked.map((t) => t.count))
  // Even ranks keep their place and odd ranks fill in from the quiet end, so big and small alternate.
  const place = (rank: number) => (rank % 2 ? ranked.length - rank : rank)
  return ranked
    .map((t, rank) => ({ ...t, size: max === min ? 3 : 1 + Math.round(((t.count - min) / (max - min)) * 4), at: place(rank) }))
    .sort((a, b) => a.at - b.at)
    .map(({ at: _, ...t }) => t)
}

/* ───────────────────────── page model ───────────────────────── */

export interface KeywordRow {
  keyword: Keyword
  brand?: Brand
  /** Mentions this week. */
  count: number
  split: Record<Sentiment, number>
  /** 14 days of volume: the week before (stored), then this week's mentions per day. */
  spark: number[]
}

export interface VoiceRow {
  key: string
  name: string
  /** Mentions this week. */
  count: number
  share: number
  /** Bar length relative to the loudest. */
  fill: number
  competitor?: Competitor
}

/** Share of voice for a brand: its own keywords' mentions this week against each competitor's. */
export function shareOfVoice(ws: Workspace, now: Date, brandId: string) {
  const own = ws.keywords.filter((k) => k.brandId === brandId)
  const week = thisWeek(ws.mentions, now)
  const ours = week.filter((m) => own.some((k) => k.id === m.keywordId && k.kind !== 'competitor')).length
  const voices = ws.competitors
    .filter((c) => c.brandId === brandId)
    .map((c) => {
      // A competitor keyword with the competitor's name adds what we heard ourselves.
      const ids = own.filter((k) => k.kind === 'competitor' && k.term.toLowerCase() === c.name.toLowerCase()).map((k) => k.id)
      return { c, count: c.mentions + week.filter((m) => ids.includes(m.keywordId)).length }
    })
  const total = ours + sum(voices.map((v) => v.count))
  const share = (n: number) => (total ? n / total : 0)
  const rows: VoiceRow[] = [
    { key: 'us', name: ws.brands.find((b) => b.id === brandId)?.name ?? '', count: ours, share: share(ours), fill: 0 },
    ...voices.map(({ c, count }) => ({ key: c.id, name: c.name, count, share: share(count), fill: 0, competitor: c })),
  ].sort((a, b) => b.share - a.share)
  const top = Math.max(...rows.map((r) => r.share)) || 1
  return { ours: share(ours), hasCompetitors: voices.length > 0, rows: rows.map((r) => ({ ...r, fill: r.share / top })) }
}

/** The brand's own row in the competitors table: audience, 30-day growth, engagement and cadence over the last four weeks. */
function brandBenchmark(ws: Workspace, now: Date, brandId: string) {
  const channels = ws.channels.filter((c) => c.brandId === brandId)
  const followers = sum(channels.map((c) => c.followers))
  const gained = sum(channels.map((c) => ws.analytics.accounts[c.id]?.[30].gained ?? 0))
  const since = now.getTime() - 28 * DAY
  const posts = ws.posts.filter((p) => p.brandId === brandId && p.status === 'published' && p.metrics && Date.parse(p.scheduledAt) >= since && Date.parse(p.scheduledAt) <= now.getTime())
  return {
    followers,
    growth: followers - gained > 0 ? gained / (followers - gained) : 0,
    engagementRate: posts.length ? sum(posts.map((p) => engagementRate(p.metrics!))) / posts.length : 0,
    postsPerWeek: posts.length / 4,
  }
}

/** Everything #/listening shows, for the brand picked in "Share of voice". */
export function selectListening(ws: Workspace, now: Date, brandId: string) {
  const known = new Set(ws.keywords.map((k) => k.id))
  const all = ws.mentions.filter((m) => known.has(m.keywordId))
  const week = thisWeek(all, now)
  const positive = week.filter((m) => m.sentiment === 'positive').length
  const negative = week.filter((m) => m.sentiment === 'negative').length
  const voice = shareOfVoice(ws, now, brandId)

  const keywords: KeywordRow[] = ws.keywords.map((keyword) => {
    const own = all.filter((m) => m.keywordId === keyword.id)
    return {
      keyword,
      brand: ws.brands.find((b) => b.id === keyword.brandId),
      count: thisWeek(own, now).length,
      split: split(own),
      spark: [...keyword.history, ...perDay(own, now, 7)],
    }
  })

  // Sentiment over 14 days: this week from the mentions themselves; the week
  // before from each keyword's stored volume, split like its mentions.
  const days = Array.from({ length: 14 }, (_, i) => new Date(startOfDay(now.getTime()) - (13 - i) * DAY))
  const series = Object.fromEntries(SENTIMENTS.map((s) => [s, [...Array<number>(7).fill(0), ...perDay(all, now, 7, (m) => m.sentiment === s)]])) as Record<Sentiment, number[]>
  for (const row of keywords) {
    row.keyword.history.slice(-7).forEach((n, i) => {
      const pos = Math.round(n * row.split.positive)
      const neg = Math.round(n * row.split.negative)
      series.positive[i] += pos
      series.negative[i] += neg
      series.neutral[i] += n - pos - neg
    })
  }
  const net = (from: number, to: number) => {
    const total = sum(SENTIMENTS.map((s) => sum(series[s].slice(from, to))))
    return total ? (sum(series.positive.slice(from, to)) - sum(series.negative.slice(from, to))) / total : 0
  }

  const competitors = ws.competitors.filter((c) => c.brandId === brandId).sort((a, b) => b.followers - a.followers)

  return {
    stats: {
      mentions: week.length,
      net: week.length ? (positive - negative) / week.length : 0,
      reach: sum(week.map((m) => m.reach)),
      shareOfVoice: voice.ours,
    },
    keywords,
    voice,
    trending: trendingTerms(ws.keywords, all, now),
    sentiment: { days, series, net: net(7, 14), before: net(0, 7) },
    benchmark: { brand: ws.brands.find((b) => b.id === brandId), ...brandBenchmark(ws, now, brandId), competitors },
    networks: ANALYTICS_NETWORKS.filter((n) => LISTENED.includes(n) && all.some((m) => m.network === n)),
  }
}

export type ListeningModel = ReturnType<typeof selectListening>

/* ───────────────────────── new mentions ───────────────────────── */

/** People and phrases new mentions are made of: the ones already heard, hashtags dropped. */
const PEOPLE = [...new Map(MENTIONS.map(([, , , author, handle, photo]) => [handle, { author, handle, photo }])).values()]
const PHRASES: Record<Sentiment, string[]> = {
  positive: [],
  neutral: [],
  negative: [],
}
for (const [, , , , , , , sentiment, , text] of MENTIONS) {
  const plain = text.replace(/\s*#[\p{L}\d_]+/gu, '').trim()
  if (!PHRASES[sentiment].includes(plain)) PHRASES[sentiment].push(plain)
}

let made = 0

/**
 * A plausible new mention of `keyword` at `at` (live arrivals, and the few
 * days a new keyword backfills): mostly positive, a hashtag keyword carries its
 * tag. Seeded, so the same keyword and time give the same mention.
 */
export function newMention(keyword: Keyword, at: number, n = 0): Mention {
  const r = rng(`${keyword.id}:${at}:${n}`)
  const x = r()
  const sentiment: Sentiment = x < 0.58 ? 'positive' : x < 0.86 ? 'neutral' : 'negative'
  const phrases = PHRASES[sentiment]
  const phrase = phrases[Math.floor(r() * phrases.length)] ?? 'Has anyone tried this?'
  const person = PEOPLE[Math.floor(r() * PEOPLE.length)]
  return {
    id: `mn-${at.toString(36)}-${(made++).toString(36)}`,
    keywordId: keyword.id,
    network: LISTENED[Math.floor(r() * LISTENED.length)],
    author: person.author,
    handle: person.handle,
    ...(person.photo && { avatar: personPhoto(person.handle) }),
    text: keyword.kind === 'hashtag' ? `${phrase} ${keyword.term}` : phrase,
    at: new Date(at).toISOString(),
    sentiment,
    reach: Math.round(120 + r() * 26_000),
  }
}

/** A week of made-up past volume for a keyword someone just started tracking. */
export const pastVolume = (term: string) => {
  const r = rng(term.toLowerCase())
  return Array.from({ length: 7 }, () => Math.floor(r() * 3))
}

export const SENTIMENT_TONE: Record<Sentiment, Tone> = { positive: 'pine', neutral: 'plain', negative: 'coral' }
