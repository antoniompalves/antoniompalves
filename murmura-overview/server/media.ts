import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomId } from './crypto.ts'
import { rawFetch } from './providers/http.ts'
import { ProviderError } from './providers/types.ts'
import type { Loaded, MediaSource } from './providers/types.ts'
import type { MediaRecord, Store } from './store.ts'

const ALLOWED = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|quicktime|webm))$/

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

  constructor(dataDir: string, store: Store, publicUrl: string, maxBytes: number) {
    this.dir = join(dataDir, 'media')
    this.store = store
    this.publicUrl = publicUrl
    this.maxBytes = maxBytes
  }

  url(id: string) {
    return `${this.publicUrl}/media/${id}`
  }

  async save(bytes: Buffer, mime: string): Promise<MediaRecord & { url: string }> {
    if (!ALLOWED.test(mime)) throw new ProviderError('invalid', `Unsupported media type ${mime || '(none)'}`)
    if (bytes.length > this.maxBytes) throw new ProviderError('invalid', `File is larger than ${Math.round(this.maxBytes / 1048576)} MB`)
    await mkdir(this.dir, { recursive: true })
    const rec: MediaRecord = { id: randomId('m', 16), mime, size: bytes.length, createdAt: Date.now() }
    await writeFile(join(this.dir, rec.id), bytes)
    this.store.data.media.push(rec)
    await this.store.save()
    return { ...rec, url: this.url(rec.id) }
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
