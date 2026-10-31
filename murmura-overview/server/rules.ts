import type { PublishNetwork, PublishPost } from '../src/data/publishing.ts'

/** Characters as the networks count them (code points, so an emoji is one). */
const length = (s: string) => [...s].length
const images = (p: PublishPost) => p.media.filter((m) => m.kind === 'image')
const videos = (p: PublishPost) => p.media.filter((m) => m.kind === 'video')
const isJpeg = (url: string) => /\.jpe?g($|\?)/i.test(url) || /\/media\/[\w-]+$/.test(url)

/**
 * What a network would reject, checked before anything is sent so a post
 * doesn't half-publish. Limits from each network's publishing docs (2026).
 */
export function issues(network: PublishNetwork, post: PublishPost): string[] {
  const out: string[] = []
  const text = post.text.trim()
  const imgs = images(post)
  const vids = videos(post)
  const mixed = imgs.length > 0 && vids.length > 0
  switch (network) {
    case 'facebook':
      if (!text && !post.media.length && !post.link) out.push('Facebook needs text, a link or media.')
      if (length(text) > 63206) out.push('Facebook posts are limited to 63,206 characters.')
      if (vids.length > 1 || (vids.length && imgs.length)) out.push('Facebook takes one video on its own, or photos.')
      if (imgs.length > 10) out.push('Facebook takes up to 10 photos in one post.')
      break
    case 'instagram':
      if (!post.media.length) out.push('Instagram needs a photo or a video.')
      if (post.media.length > 20) out.push('Instagram carousels take up to 20 items.')
      if (length(text) > 2200) out.push('Instagram captions are limited to 2,200 characters.')
      if ((text.match(/#[\p{L}\p{N}_]+/gu) ?? []).length > 30) out.push('Instagram allows up to 30 hashtags.')
      if (imgs.some((m) => !isJpeg(m.url))) out.push('Instagram only accepts JPEG photos.')
      break
    case 'threads':
      if (!text && !post.media.length) out.push('Threads needs text or media.')
      if (length(text) > 500) out.push('Threads posts are limited to 500 characters.')
      if (post.media.length > 20) out.push('Threads carousels take up to 20 items.')
      if ((text.match(/https?:\/\//g) ?? []).length > 5) out.push('Threads posts can hold up to 5 links.')
      break
    case 'linkedin':
      if (!text && !post.media.length) out.push('LinkedIn needs text or media.')
      if (length(text) > 3000) out.push('LinkedIn posts are limited to 3,000 characters.')
      if (vids.length > 1 || mixed) out.push('LinkedIn takes one video on its own, or photos.')
      if (imgs.length > 20) out.push('LinkedIn takes up to 20 photos in one post.')
      break
    case 'tiktok':
      if (!post.options?.tiktok?.privacy) out.push('TikTok needs an audience picked for this post.')
      if (!post.media.length) out.push('TikTok needs a video or photos.')
      if (mixed || vids.length > 1) out.push('TikTok takes one video, or photos.')
      if (imgs.length > 35) out.push('TikTok photo posts take up to 35 photos.')
      if (length(text) > (vids.length ? 2200 : 4000)) out.push(`TikTok captions are limited to ${vids.length ? '2,200' : '4,000'} characters.`)
      break
    case 'youtube':
      if (vids.length !== 1 || imgs.length) out.push('YouTube needs exactly one video.')
      if (length(post.options?.youtube?.title ?? text.split('\n')[0] ?? '') === 0) out.push('YouTube needs a title.')
      if (Buffer.byteLength(text) > 5000) out.push('YouTube descriptions are limited to 5,000 bytes.')
      break
  }
  return out
}

/** YouTube titles: 100 characters, no angle brackets. */
export const youtubeTitle = (post: PublishPost) => {
  const t = (post.options?.youtube?.title ?? post.text.split('\n')[0] ?? '').replace(/[<>]/g, '').trim()
  return [...t].slice(0, 100).join('')
}
