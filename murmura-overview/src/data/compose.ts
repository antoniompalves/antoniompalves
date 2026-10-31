import { HEAT } from './analyticsData'
import { expiresIn } from './channels'
import type { Channel, NetworkId, Post, Workspace } from './types'

/**
 * Rules behind #/compose, as the reference applies them: each network's
 * character limit and media needs, what blocks a post from going out, the
 * suggested times (from the same engagement heatmaps as analytics), the next
 * slot that doesn't crowd the brand's other posts, link tagging and the
 * rule-based "Assist" rewrites.
 */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export type MediaNeed = 'optional' | 'required' | 'video'

export const NETWORK_SPEC: Record<NetworkId, { limit: number; media: MediaNeed }> = {
  instagram: { limit: 2200, media: 'required' },
  facebook: { limit: 63206, media: 'optional' },
  x: { limit: 280, media: 'optional' },
  linkedin: { limit: 3000, media: 'optional' },
  tiktok: { limit: 2200, media: 'video' },
  youtube: { limit: 5000, media: 'video' },
  pinterest: { limit: 500, media: 'required' },
  threads: { limit: 500, media: 'optional' },
}

/** Up to this many photos in one post. */
export const MAX_MEDIA = 10

/** The post being written (or edited) in the composer. */
export interface Draft {
  brandId: string
  /** Channel ids. */
  channels: string[]
  text: string
  media: string[]
  firstComment: string
  link: string
  /** Tag the link for web analytics. */
  utm: boolean
  campaignId: string
  /** Publish time, ms. */
  at: number
}

/** Characters left on a network; X counts every link as 23. */
export function charsLeft(net: NetworkId, text: string) {
  const length = net === 'x' ? text.replace(/https?:\/\/\S+/g, 'x'.repeat(23)).length : text.length
  return NETWORK_SPEC[net].limit - length
}

/** The networks a set of channels posts to, each once, in channel order. */
export function networksOf(channels: Channel[], ids: string[]) {
  const out: NetworkId[] = []
  for (const c of channels) if (ids.includes(c.id) && !out.includes(c.network)) out.push(c.network)
  return out
}

export type Issue =
  | { key: string; kind: 'noChannel' | 'empty' | 'past' | 'link' }
  | { key: string; kind: 'over'; network: NetworkId; by: number }
  | { key: string; kind: 'needsPhoto' | 'needsVideo'; network: NetworkId }
  | { key: string; kind: 'expires'; network: NetworkId; days: number }
  | { key: string; kind: 'ready'; networks: number }

/** Blocking issues stop scheduling ("past" doesn't stop "Publish now"); "expires" is a warning, "ready" the all-clear. */
export const isBlocking = (i: Issue) => i.kind !== 'expires' && i.kind !== 'ready'

export function issuesOf(d: Draft, channels: Channel[], now: number): Issue[] {
  const nets = networksOf(channels, d.channels)
  const out: Issue[] = []
  if (!d.channels.length) out.push({ key: 'nochan', kind: 'noChannel' })
  if (!d.text.trim() && !d.media.length) out.push({ key: 'empty', kind: 'empty' })
  else
    for (const network of nets) {
      const left = charsLeft(network, d.text)
      if (left < 0) out.push({ key: `${network}:over`, kind: 'over', network, by: -left })
      const need = NETWORK_SPEC[network].media
      if (!d.media.length && need === 'required') out.push({ key: `${network}:photo`, kind: 'needsPhoto', network })
      if (!d.media.length && need === 'video') out.push({ key: `${network}:video`, kind: 'needsVideo', network })
    }
  if (d.at < now + MINUTE) out.push({ key: 'past', kind: 'past' })
  if (d.link.trim() && !parseLink(d.link)) out.push({ key: 'link', kind: 'link' })
  for (const c of channels) if (d.channels.includes(c.id) && c.status === 'expiring') out.push({ key: `exp:${c.id}`, kind: 'expires', network: c.network, days: expiresIn(c, now) })
  if (!out.some(isBlocking)) out.unshift({ key: 'ok', kind: 'ready', networks: nets.length })
  return out
}

/* ───────────────────────── when ───────────────────────── */

const startOfDay = (ms: number) => Math.floor(ms / DAY) * DAY

/** The brand's other posts that are going out (drafts don't count). */
const takenTimes = (ws: Workspace, brandId: string, exceptId: string | null) =>
  ws.posts.filter((p) => p.brandId === brandId && p.id !== exceptId && p.status !== 'draft').map((p) => Date.parse(p.scheduledAt))

const crowded = (taken: number[], at: number) => taken.some((t) => Math.abs(t - at) < HOUR)

/**
 * The best times to post to these networks in the coming week: the highest
 * weekday × hour cells of their averaged heatmaps (7 AM–10 PM), each at least
 * an hour away and four hours apart from the others, earliest first.
 */
export function bestTimes(nets: NetworkId[], now: number, count = 3) {
  const maps = (nets.length ? nets : (['all'] as const)).map((n) => HEAT[n])
  const cells: { day: number; hour: number; value: number }[] = []
  // `day` is getUTCDay (0 = Sunday); the heatmaps run Monday first.
  for (let day = 0; day < 7; day++) for (let hour = 7; hour < 23; hour++) cells.push({ day, hour, value: maps.reduce((sum, m) => sum + m[((day + 6) % 7) * 24 + hour], 0) / maps.length })
  cells.sort((a, b) => b.value - a.value)
  const picked: number[] = []
  for (const cell of cells) {
    for (let d = 0; d < 7; d++) {
      const at = startOfDay(now) + d * DAY + cell.hour * HOUR
      if (new Date(at).getUTCDay() === cell.day && at > now + HOUR && !picked.some((p) => Math.abs(p - at) < 4 * HOUR)) {
        picked.push(at)
        break
      }
    }
    if (picked.length >= count) break
  }
  return picked.sort((a, b) => a - b)
}

/** The first half hour, from an hour from now, that's at least an hour from the brand's other posts. */
export function nextFreeSlot(ws: Workspace, brandId: string, now: number, exceptId: string | null = null) {
  const taken = takenTimes(ws, brandId, exceptId)
  const start = new Date(now + HOUR)
  start.setUTCMinutes(start.getUTCMinutes() < 30 ? 30 : 60, 0, 0)
  let at = start.getTime()
  for (let i = 0; i < 96 && crowded(taken, at); i++) at += 30 * MINUTE
  return at
}

/** Where a new post starts: the earliest of the five best times that isn't crowded, else the next free slot. */
export function defaultTime(ws: Workspace, brandId: string, nets: NetworkId[], now: number) {
  const taken = takenTimes(ws, brandId, null)
  return bestTimes(nets, now, 5).find((at) => !crowded(taken, at)) ?? nextFreeSlot(ws, brandId, now)
}

/** The brand's other posts on the same day, and how many sit within an hour of `at`. */
export function sameDay(ws: Workspace, brandId: string, at: number, exceptId: string | null) {
  const day = startOfDay(at)
  const posts = ws.posts.filter((p) => p.brandId === brandId && p.id !== exceptId && p.status !== 'draft').filter((p) => Date.parse(p.scheduledAt) >= day && Date.parse(p.scheduledAt) < day + DAY)
  return { day, posts, close: posts.filter((p) => Math.abs(Date.parse(p.scheduledAt) - at) < HOUR).length }
}

/* ───────────────────────── links ───────────────────────── */

/** "emberandoak.com/autumn" → a URL, or null when it isn't one. */
export function parseLink(raw: string) {
  const s = raw.trim()
  if (!s) return null
  try {
    const url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
    return url.hostname.includes('.') ? url : null
  } catch {
    return null
  }
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** The link as it will be posted: tagged with utm_source / medium / campaign when tagging is on. */
export function finalLink(d: Draft, ws: Workspace) {
  const url = parseLink(d.link)
  if (!url) return ''
  if (d.utm) {
    const campaign = ws.campaigns.find((c) => c.id === d.campaignId)?.name ?? ws.brands.find((b) => b.id === d.brandId)?.handle ?? 'post'
    url.searchParams.set('utm_source', ws.settings.utmSource || 'kataru')
    url.searchParams.set('utm_medium', 'social')
    url.searchParams.set('utm_campaign', slug(campaign))
  }
  return url.toString()
}

/** A saved link back into the composer: without its utm_* tags, which are added again on save. */
export function editableLink(saved: string | undefined, utmDefault: boolean) {
  if (!saved) return { link: '', utm: utmDefault }
  const url = parseLink(saved)
  if (!url) return { link: saved, utm: false }
  const utm = url.searchParams.has('utm_source')
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) url.searchParams.delete(k)
  return { link: url.toString(), utm }
}

/* ───────────────────────── assist ───────────────────────── */

export type AssistAction = 'shorter' | 'friendlier' | 'tags' | 'cta' | 'tidy'
export const ASSIST_ACTIONS: AssistAction[] = ['shorter', 'friendlier', 'tags', 'cta', 'tidy']

/** Trailing hashtag block, kept apart so rewrites only touch the words. */
const TAGS_AT_END = /(?:\n\s*|\s+)((?:#[\p{L}\p{N}_]+\s*)+)$/u

function splitTags(text: string) {
  const m = text.match(TAGS_AT_END)
  return m ? { body: text.slice(0, m.index).trimEnd(), tags: m[1].trim() } : { body: text.trimEnd(), tags: '' }
}
const joinTags = (body: string, tags: string) => (tags ? (body ? `${body}\n\n${tags}` : tags) : body)

type Rule = [RegExp, string]
/** Keep a capital where the replaced words started with one. */
const applyRules = (text: string, rules: Rule[]) => rules.reduce((s, [re, to]) => s.replace(re, (m) => (m[0] !== m[0].toLowerCase() ? to.charAt(0).toUpperCase() + to.slice(1) : to)), text)

const CONTRACTIONS: Rule[] = [
  [/\bwe are\b/gi, 'we’re'],
  [/\byou are\b/gi, 'you’re'],
  [/\bit is\b/gi, 'it’s'],
  [/\bdo not\b/gi, 'don’t'],
  [/\bdoes not\b/gi, 'doesn’t'],
  [/\bcannot\b/gi, 'can’t'],
  [/\bwe will\b/gi, 'we’ll'],
  [/\byou will\b/gi, 'you’ll'],
  [/\bthat is\b/gi, 'that’s'],
  [/\bthere is\b/gi, 'there’s'],
]
const WORDY: Rule[] = [
  [/\bin order to\b/gi, 'to'],
  [/\ba lot of\b/gi, 'lots of'],
  [/\bat the moment\b/gi, 'now'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bin the event that\b/gi, 'if'],
  [/\bas well as\b/gi, 'and'],
  [/\b(?:are|is) able to\b/gi, 'can'],
  [/\bevery single\b/gi, 'every'],
]
const FILLERS = /\b(?:just|really|actually|very|honestly|literally|basically|simply|quite|totally|definitely|truly)\s+/gi
const STIFF: Rule[] = [
  [/\bpurchase\b/gi, 'grab'],
  [/\bcustomers\b/gi, 'friends'],
  [/\butili[sz]e\b/gi, 'use'],
  [/\bassist\b/gi, 'help'],
  [/\breceive\b/gi, 'get'],
  [/\badditional\b/gi, 'extra'],
  [/\bhowever\b/gi, 'but'],
  [/\bplease note that\s*/gi, ''],
]

export interface AssistContext {
  nets: NetworkId[]
  /** The brand's hashtag set, or suggested tags. */
  tags: string[]
  /** A call to action in the brand's voice; "link in bio" ones take the link instead when there is one. */
  cta: string
  link: string
  /** "Hey friends!" in the interface language. */
  greeting: RegExp
  hello: string
  emoji?: string
}

/** One "Assist" rewrite; returns the text unchanged when there's nothing to do. */
export function assist(action: AssistAction, text: string, c: AssistContext): string {
  const { body, tags } = splitTags(text)
  switch (action) {
    case 'shorter': {
      let s = applyRules(applyRules(body.replace(FILLERS, ''), WORDY), CONTRACTIONS).replace(/[ \t]{2,}/g, ' ')
      const sentences = s.split(/(?<=[.!?…])\s+/)
      if (sentences.length > 2) s = sentences.slice(0, 2).join(' ')
      const room = Math.min(240, ...c.nets.map((n) => NETWORK_SPEC[n].limit)) - (tags ? tags.length + 2 : 0)
      if (s.length > room && room > 40)
        s = `${s
          .slice(0, room - 1)
          .replace(/\s+\S*$/, '')
          .replace(/[,;:—–-]+$/, '')}…`
      return joinTags(s.trim(), tags)
    }
    case 'friendlier': {
      let s = applyRules(applyRules(body, STIFF), CONTRACTIONS)
      if (!c.greeting.test(s)) s = `${c.hello} ${s}`
      if (c.emoji && !s.includes(c.emoji)) s = `${s.replace(/\s+$/, '')} ${c.emoji}`
      return joinTags(s, tags)
    }
    case 'tags': {
      const have = new Set((text.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((t) => t.toLowerCase()))
      const add = c.tags.filter((t) => !have.has(t.toLowerCase()))
      return add.length ? joinTags(body, [tags, add.join(' ')].filter(Boolean).join(' ')) : text
    }
    case 'cta': {
      let line = c.cta
      if (c.link) line = /link in bio|link na bio/i.test(line) ? `${line.replace(/\s*—\s*link (?:in|na) bio\.?$/i, '')}: ${c.link}` : `${line} ${c.link}`
      return body.includes(line.slice(0, 16)) ? text : joinTags(`${body}${body ? '\n\n' : ''}${line}`, tags)
    }
    case 'tidy':
      return text
        .split(/(https?:\/\/\S+)/)
        .map((part, i) =>
          i % 2
            ? part
            : part
                .replace(/[ \t]+/g, ' ')
                .replace(/ *\n */g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/ +([,.!?;:…])/g, '$1')
                .replace(/([,!?;:])(?=\p{L})/gu, '$1 ')
                .replace(/\.(?=\p{Lu})/gu, '. ')
                .replace(/\.{3}/g, '…')
                .replace(/(^|[.!?…]\s+|\n)(\p{Ll})/gu, (_, before: string, ch: string) => before + ch.toUpperCase()),
        )
        .join('')
        .trim()
  }
}

/** Hashtags appended at the end, after a blank line, skipping ones already there. */
export function withHashtags(text: string, add: string[]) {
  const have = new Set((text.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((t) => t.toLowerCase()))
  const fresh = add.filter((t) => !have.has(t.toLowerCase()))
  if (!fresh.length) return null
  const { body, tags } = splitTags(text)
  return joinTags(body, [tags, fresh.join(' ')].filter(Boolean).join(' '))
}

/* ───────────────────────── lists ───────────────────────── */

/** "My drafts": what the current person still has to finish, then what's waiting on someone else. */
export function myDrafts(ws: Workspace, me: string) {
  const order: Partial<Record<Post['status'], number>> = { changes_requested: 0, failed: 1, draft: 2, awaiting_approval: 3 }
  const mine = ws.posts.filter((p) => p.authorId === me && order[p.status] !== undefined).sort((a, b) => order[a.status]! - order[b.status]! || Date.parse(b.createdAt) - Date.parse(a.createdAt))
  return { toFinish: mine.filter((p) => p.status !== 'awaiting_approval'), waiting: mine.filter((p) => p.status === 'awaiting_approval') }
}

/** The first line of a post, trimmed to 52 characters, as lists label it. */
export const postTitle = (text: string) => {
  const line = text.split('\n')[0]?.trim() ?? ''
  return line.length > 52 ? `${line.slice(0, 50)}…` : line
}
