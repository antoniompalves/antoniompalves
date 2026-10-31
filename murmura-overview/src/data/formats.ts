import type { MediaAsset, MediaKind, NetworkId, Post, PostFormat } from './types'

/**
 * Post formats: which network takes which (its usual one first), what each
 * needs in media, and the per-network text, title and alt text a post can
 * carry. The composer, the previews and the publishing contract all read
 * these, so a Reel, a Story or a LinkedIn document means the same thing
 * everywhere. Limits follow each network's publishing docs (2026).
 */

export const FORMATS: Record<NetworkId, PostFormat[]> = {
  instagram: ['post', 'reel', 'story'],
  facebook: ['post', 'reel', 'story'],
  x: ['post'],
  linkedin: ['post', 'document'],
  tiktok: ['video', 'photos'],
  // Shorts first: what the composer has always previewed for YouTube.
  youtube: ['short', 'video'],
  pinterest: ['post'],
  threads: ['post'],
}

/** Items in one feed post (a carousel past one): Pinterest carousels take 2–5, X four, Facebook ten. */
export const MAX_ITEMS: Record<NetworkId, number> = { instagram: 20, facebook: 10, x: 4, linkedin: 20, tiktok: 35, youtube: 1, pinterest: 5, threads: 20 }

/** Title lengths where a network asks for one. */
export const TITLE_LIMIT = { youtube: 100, pinterest: 100, linkedin: 400 } as const

/** Alt text: the longest any network takes (X, Instagram and Threads allow 1,000 characters). */
export const ALT_LIMIT = 1000

/** Networks that take alt text on photos. */
export const ALT_NETWORKS: NetworkId[] = ['instagram', 'facebook', 'x', 'linkedin', 'threads', 'pinterest']

export interface MediaInfo {
  seed: string
  kind: MediaKind
  /** Videos, seconds. */
  duration?: number
  /** Documents. */
  pages?: number
  title?: string
}

/** The library's view of a post's media, in order; anything the library doesn't know is a photo. */
export const mediaInfo = (library: MediaAsset[], seeds: string[]): MediaInfo[] =>
  seeds.map((seed) => {
    const a = library.find((m) => m.seed === seed)
    return { seed, kind: a?.kind ?? 'image', duration: a?.duration, pages: a?.pages, title: a?.title }
  })

/** The format a post uses on a network: the one picked, else the usual one. TikTok follows the media: photos make a photo post. */
export function formatOn(network: NetworkId, picked: Post['formats'], media: MediaInfo[]): PostFormat {
  const f = picked?.[network]
  if (f && FORMATS[network].includes(f)) return f
  if (network === 'tiktok') return media.length && media.every((m) => m.kind === 'image') ? 'photos' : 'video'
  return FORMATS[network][0]
}

/** The text a network gets: its own version, or the main text. */
export const textOn = (text: string, versions: Post['versions'], network: NetworkId) => versions?.[network] ?? text

/** Where a title field shows: YouTube, Pinterest, and LinkedIn documents. */
export const hasTitle = (network: NetworkId, format: PostFormat) => network === 'youtube' || network === 'pinterest' || (network === 'linkedin' && format === 'document')

/** Stories don't carry a caption: the words go in the picture. */
export const showsCaption = (format: PostFormat) => format !== 'story'

/** Feed posts and TikTok photo posts with several items swipe like a carousel. */
export const isCarousel = (format: PostFormat, media: MediaInfo[]) => (format === 'post' || format === 'photos') && media.length > 1

export type FormatProblem =
  /** Reels, Shorts, YouTube and TikTok videos: exactly one video. */
  | { problem: 'video' }
  /** Stories: one photo or one video. */
  | { problem: 'single' }
  /** LinkedIn documents: one PDF and nothing else. */
  | { problem: 'pdf' }
  /** LinkedIn documents and YouTube videos need a title. */
  | { problem: 'title' }
  /** A PDF anywhere but a LinkedIn document. */
  | { problem: 'noPdf' }
  /** Facebook, LinkedIn, X and Pinterest: one video on its own, or photos. */
  | { problem: 'mixed' }
  /** TikTok photo posts: photos only. */
  | { problem: 'photosOnly' }
  | { problem: 'max'; max: number }

/**
 * What stops a post's media from going out in this format on this network.
 * A feed post without media is left to the network's general rule (Instagram
 * needs a photo, TikTok a video or photos).
 */
export function formatProblems(network: NetworkId, format: PostFormat, media: MediaInfo[], title: string, text: string): FormatProblem[] {
  const out: FormatProblem[] = []
  const docs = media.filter((m) => m.kind === 'document').length
  const vids = media.filter((m) => m.kind === 'video').length
  const imgs = media.length - docs - vids
  if (format === 'document') {
    if (docs !== 1 || media.length !== 1) out.push({ problem: 'pdf' })
    if (!title.trim()) out.push({ problem: 'title' })
    return out
  }
  if (docs) return [{ problem: 'noPdf' }]
  if (network === 'youtube' && !title.trim() && !text.trim()) out.push({ problem: 'title' })
  switch (format) {
    case 'reel':
    case 'short':
      if (vids !== 1 || imgs) out.push({ problem: 'video' })
      break
    case 'video':
      // TikTok with no media keeps its general "a video or a photo post" rule; a video with photos is either one or the other.
      if (network === 'tiktok' && vids && imgs) out.push({ problem: 'mixed' })
      else if ((vids !== 1 || imgs) && (network === 'youtube' || media.length)) out.push({ problem: 'video' })
      break
    case 'story':
      if (media.length !== 1) out.push({ problem: 'single' })
      break
    case 'photos':
      if (vids) out.push({ problem: 'photosOnly' })
      else if (imgs > MAX_ITEMS.tiktok) out.push({ problem: 'max', max: MAX_ITEMS.tiktok })
      break
    case 'post':
      if (vids && media.length > 1 && (network === 'facebook' || network === 'linkedin' || network === 'x' || network === 'pinterest')) out.push({ problem: 'mixed' })
      else if (media.length > MAX_ITEMS[network]) out.push({ problem: 'max', max: MAX_ITEMS[network] })
      break
  }
  return out
}

/** Everything a preview needs to show a post on one network. */
export interface PostView {
  text: string
  media: MediaInfo[]
  format: PostFormat
  title?: string
  alt: Record<string, string>
  metrics?: Post['metrics']
}

/** A post (or a draft) as it goes out on one network. */
export function viewOn(
  p: Pick<Post, 'text' | 'media' | 'formats' | 'versions' | 'titles' | 'alt' | 'metrics'>,
  network: NetworkId,
  library: MediaAsset[],
): PostView {
  const media = mediaInfo(library, p.media)
  return {
    text: textOn(p.text, p.versions, network),
    media,
    format: formatOn(network, p.formats, media),
    title: p.titles?.[network],
    alt: p.alt ?? {},
    metrics: p.metrics,
  }
}

/** "0:24", "2:31" */
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`

/** Keeps what applies to the networks still picked: formats that aren't the usual one, versions, titles; alt text for photos still there. */
export function tidyExtras(nets: NetworkId[], seeds: string[], x: Pick<Post, 'formats' | 'versions' | 'titles' | 'alt'>, text: string) {
  const pick = <T>(rec: Partial<Record<NetworkId, T>> | undefined, keep: (n: NetworkId, v: T) => boolean) => {
    const out: Partial<Record<NetworkId, T>> = {}
    for (const n of nets) if (rec?.[n] !== undefined && keep(n, rec[n] as T)) out[n] = rec[n]
    return Object.keys(out).length ? out : undefined
  }
  const alt = Object.fromEntries(Object.entries(x.alt ?? {}).filter(([seed, v]) => seeds.includes(seed) && v.trim()).map(([k, v]) => [k, v.trim()]))
  return {
    formats: pick(x.formats, (n, f) => f !== FORMATS[n][0] || n === 'tiktok'),
    versions: pick(x.versions, (_, v) => v.trim() !== text.trim()),
    titles: pick(x.titles, (_, v) => !!v.trim()),
    alt: Object.keys(alt).length ? alt : undefined,
  }
}
