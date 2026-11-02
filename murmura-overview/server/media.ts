import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomId } from './crypto.ts'
import { rawFetch } from './providers/http.ts'
import { ProviderError } from './providers/types.ts'
import type { Loaded, MediaSource } from './providers/types.ts'
import type { MediaRecord, Store } from './store.ts'

/** Photos, videos, and PDFs for LinkedIn documents. */
const ALLOWED = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|quicktime|webm)|application\/pdf)$/
/** The light copies the app keeps: still images only, small. */
const PREVIEW = /^image\/(jpeg|png|webp)$/
export const PREVIEW_MAX = 300 * 1024
const DAY = 86_400_000
/** After the last post using an original is out (or failed for good), it stays this long. */
const GRACE = 2 * DAY

/**
 * Media the app uploads, served back at PUBLISHER_PUBLIC_URL/media/<id>: Meta,
 * Threads and TikTok fetch media from a public URL, so this gives every file
 * one. Connectors that upload bytes (LinkedIn, YouTube, TikTok) read them here.
 */
export class MediaLibrary implements MediaSource {
  private dir: string
  private store: Store
  private publicUrl: string
  private maxBytes: number

  private keepDays: number

  /** `keepDays`: how long an original nobody has scheduled yet is kept (PUBLISHER_KEEP_ORIGINAL_DAYS). */
  constructor(dataDir: string, store: Store, publicUrl: string, maxBytes: number, keepDays = 30) {
    this.dir = join(dataDir, 'media')
    this.store = store
    this.publicUrl = publicUrl
    this.maxBytes = maxBytes
    this.keepDays = keepDays
  }

  url(id: string) {
    return `${this.publicUrl}/media/${id}`
  }

  async save(bytes: Buffer, mime: string, role: 'original' | 'preview' = 'original', now = Date.now()): Promise<MediaRecord & { url: string }> {
    if (role === 'preview') {
      if (!PREVIEW.test(mime)) throw new ProviderError('invalid', 'Previews are JPEG, PNG or WebP images')
      if (bytes.length > PREVIEW_MAX) throw new ProviderError('invalid', `Previews are at most ${PREVIEW_MAX / 1024} KB; make a lighter copy first`)
    }
    if (!ALLOWED.test(mime)) throw new ProviderError('invalid', `Unsupported media type ${mime || '(none)'}`)
    if (bytes.length > this.maxBytes) throw new ProviderError('invalid', `File is larger than ${Math.round(this.maxBytes / 1048576)} MB`)
    await mkdir(this.dir, { recursive: true })
    const rec: MediaRecord = { id: randomId('m', 16), mime, size: bytes.length, createdAt: now, role, ...(role === 'original' && { deleteAfter: now + this.keepDays * DAY }) }
    await writeFile(join(this.dir, rec.id), bytes)
    this.store.data.media.push(rec)
    await this.store.save()
    return { ...rec, url: this.url(rec.id) }
  }

  /**
   * Lets originals go once nothing needs them: a post still waiting keeps its
   * files; when every post using one is out (or failed for good) it goes two
   * days later; one never scheduled goes after `keepDays`. Previews stay.
   */
  async sweep(now = Date.now()) {
    const removed: MediaRecord[] = []
    for (const rec of [...this.store.data.media]) {
      if (rec.role === 'preview') continue
      const url = this.url(rec.id)
      const uses = this.store.data.jobs.filter((j) => j.post.media.some((m) => m.url === url))
      if (uses.some((j) => j.status === 'scheduled' || j.status === 'publishing' || j.status === 'processing')) continue
      const done = uses.map((j) => j.updatedAt + GRACE)
      // Used by posts: two days after the last one is out. Never used: after keepDays.
      const until = done.length ? Math.max(...done) : (rec.deleteAfter ?? rec.createdAt + this.keepDays * DAY)
      if (until > now) continue
      await rm(join(this.dir, rec.id), { force: true })
      this.store.data.media = this.store.data.media.filter((m) => m.id !== rec.id)
      removed.push(rec)
    }
    if (removed.length) await this.store.save()
    return removed
  }

  /** How much is kept: light copies, and originals waiting to be published. */
  stats() {
    const sum = (role: 'original' | 'preview') => this.store.data.media.filter((m) => (m.role ?? 'original') === role).reduce((a, m) => ({ count: a.count + 1, bytes: a.bytes + m.size }), { count: 0, bytes: 0 })
    return { previews: sum('preview'), originals: sum('original') }
  }

  record(id: string) {
    return this.store.data.media.find((m) => m.id === id)
  }

  read(id: string) {
    return readFile(join(this.dir, id))
  }

  /** Bytes for a URL: our own files from disk, anything else downloaded (up to PUBLISHER_MAX_MEDIA_MB). */
  async load(url: string): Promise<Loaded> {
    const own = url.startsWith(`${this.publicUrl}/media/`) ? this.record(url.slice(this.publicUrl.length + 7)) : undefined
    if (own) {
      const bytes = await this.read(own.id)
      return { bytes, mime: own.mime, size: bytes.length }
    }
    const res = await rawFetch(url, { signal: AbortSignal.timeout(300_000) }).catch((e) => {
      throw new ProviderError('media', `Couldn't download ${url} (${(e as Error).message})`, { retryable: true })
    })
    if (!res.ok || !res.body) throw new ProviderError('media', `Couldn't download ${url} (HTTP ${res.status})`, { retryable: res.status >= 500 })
    const declared = Number(res.headers.get('content-length') ?? 0)
    if (declared > this.maxBytes) throw new ProviderError('media', `${url} is larger than the media limit`)
    const parts: Uint8Array[] = []
    let size = 0
    for await (const part of res.body as unknown as AsyncIterable<Uint8Array>) {
      size += part.length
      if (size > this.maxBytes) throw new ProviderError('media', `${url} is larger than the media limit`)
      parts.push(part)
    }
    const bytes = Buffer.concat(parts)
    return { bytes, mime: (res.headers.get('content-type') ?? '').split(';')[0] || 'application/octet-stream', size: bytes.length }
  }
}
