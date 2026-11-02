import { apiUrl } from './server'
import type { MediaAsset } from './types'

/**
 * Keeping media light: the browser that adds a photo or a video makes a small
 * copy of it (a photo ≤ 100 KB; for a video, only its cover frame), and that
 * copy is all Kataru keeps for the library and previews. The full file goes to
 * the server only when posts are published from Kataru, and only until they're
 * out (server/media.ts). The server never resizes anything itself.
 */

export const PREVIEW_BYTES = 100 * 1024

export interface LightCopy {
  blob: Blob
  width: number
  height: number
  kind: 'image' | 'video'
  duration?: number
  originalBytes: number
}

const toBlob = (canvas: HTMLCanvasElement, type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q))

/** Draws `source` at most `long` px on its long side and squeezes it under `max` bytes (WebP, else JPEG). */
async function squeeze(source: CanvasImageSource, w: number, h: number, max: number) {
  let long = Math.min(1600, Math.max(w, h))
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  for (;;) {
    const scale = long / Math.max(w, h)
    canvas.width = Math.max(1, Math.round(w * scale))
    canvas.height = Math.max(1, Math.round(h * scale))
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    for (const q of [0.82, 0.72, 0.62, 0.5]) {
      let blob = await toBlob(canvas, 'image/webp', q)
      if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', q)
      if (blob && (blob.size <= max || long <= 320)) return { blob, width: canvas.width, height: canvas.height }
    }
    long = Math.round(long * 0.8)
  }
}

/** The video's cover: a frame a second in (or a third of the way, for short clips). */
function coverFrame(file: File) {
  return new Promise<{ video: HTMLVideoElement; duration: number; done: () => void }>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = url
    const done = () => URL.revokeObjectURL(url)
    video.onerror = () => (done(), reject(new Error('This video can’t be read here')))
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 0) / 3)
    }
    video.onseeked = () => resolve({ video, duration: Math.round(video.duration || 0), done })
  })
}

export async function lightCopy(file: File, max = PREVIEW_BYTES): Promise<LightCopy> {
  if (file.type.startsWith('video/')) {
    const { video, duration, done } = await coverFrame(file)
    try {
      const s = await squeeze(video, video.videoWidth, video.videoHeight, max)
      return { ...s, kind: 'video', duration, originalBytes: file.size }
    } finally {
      done()
    }
  }
  if (!file.type.startsWith('image/')) throw new Error('Photos and videos only')
  const bitmap = await createImageBitmap(file)
  try {
    const s = await squeeze(bitmap, bitmap.width, bitmap.height, max)
    return { ...s, kind: 'image', originalBytes: file.size }
  } finally {
    bitmap.close()
  }
}

const asDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })

async function upload(body: Blob, role: 'preview' | 'original') {
  const res = await fetch(apiUrl(`/media?role=${role}`), { method: 'POST', credentials: 'include', headers: { 'content-type': body.type || 'application/octet-stream', 'x-kataru': '1' }, body })
  const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string }
  if (!res.ok || !data.url) throw new Error(data.message ?? `Upload failed (${res.status})`)
  return data.url
}

/**
 * Adds a file to a brand's library: the light copy is what's kept (on the
 * server, or inside the demo's own data); the original is uploaded only when
 * `keepOriginal` (posts will be published from Kataru), for the time it takes.
 */
export async function addToLibrary(file: File, o: { server: boolean; keepOriginal: boolean; brandId: string; by: string; now: Date }): Promise<MediaAsset> {
  const copy = await lightCopy(file)
  const seed = o.server ? await upload(copy.blob, 'preview') : await asDataUrl(copy.blob)
  const original = o.server && o.keepOriginal ? await upload(file, 'original') : undefined
  return {
    seed,
    brandId: o.brandId,
    title: file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Upload',
    kind: copy.kind,
    ...(copy.duration !== undefined && { duration: copy.duration }),
    tags: [],
    width: copy.width,
    height: copy.height,
    addedAt: o.now.toISOString(),
    addedBy: o.by,
    bytes: copy.blob.size,
    originalBytes: copy.originalBytes,
    ...(original && { original }),
  }
}
