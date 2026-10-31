import { Bookmark, Ellipsis, Heart, ImageOff, MessageCircle, Play, Repeat2, Send, ThumbsUp } from 'lucide-react'
import { coverPhoto } from '../data/assets'
import { NETWORK_LABEL } from '../data/selectors'
import type { Brand, NetworkId, Post } from '../data/types'
import { useI18n } from '../i18n'
import { cn, toneFill } from './ui'

const VIDEO: NetworkId[] = ['tiktok', 'youtube']
const TEXT_FIRST: NetworkId[] = ['x', 'threads', 'linkedin']

type Previewable = Pick<Post, 'text' | 'media' | 'metrics'>

function Media({ post, empty, className }: { post: Previewable; empty?: string; className?: string }) {
  const { t } = useI18n()
  return post.media.length ? (
    <img src={coverPhoto(post, 760)} alt="" className={cn('size-full object-cover', className)} />
  ) : (
    <span
      className={cn(
        'grid size-full place-content-center place-items-center gap-2 bg-[repeating-linear-gradient(45deg,var(--well)_0_10px,transparent_10px_20px)] text-2xs font-semibold text-muted',
        className,
      )}
    >
      <ImageOff size={28} aria-hidden />
      {empty ?? t.drawer.noMedia}
    </span>
  )
}

/**
 * A post laid out the way a network shows it (".pv"): a vertical video card for
 * TikTok and YouTube, a text-first card for X, Threads and LinkedIn (and
 * Facebook without a photo), a photo card otherwise. `empty` replaces the
 * missing-photo label, e.g. "Instagram needs a photo" while composing.
 */
export function PostPreview({ post, brand, network, stamp, empty }: { post: Previewable; brand: Brand; network: NetworkId; stamp: string; empty?: string }) {
  const { t } = useI18n()
  const likes = t.numbers.compact(post.metrics?.likes ?? 0)
  const avatar = <span className={cn('grid size-[34px] shrink-0 place-items-center rounded-full text-[12.5px] font-bold', toneFill[brand.tone])}>{brand.initials}</span>

  if (VIDEO.includes(network)) {
    return (
      <article aria-label={t.drawer.preview(NETWORK_LABEL[network])} className="w-full max-w-[260px] overflow-hidden rounded-[20px] bg-[#0e1012] text-white shadow-[0_18px_40px_-26px_rgb(0_0_0/0.35)]">
        <div className="relative aspect-[9/16] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:top-[40%] after:bg-gradient-to-b after:from-transparent after:to-black/72">
          <Media post={post} empty={empty} className="text-white/70" />
          <span className="absolute inset-0 m-auto grid size-[54px] place-items-center rounded-full bg-black/35">
            <Play size={24} className="fill-white stroke-none" aria-hidden />
          </span>
          <div className="absolute inset-x-0 bottom-0 z-[1] grid gap-1 p-3.5 text-[13px] leading-[1.4]">
            <b>@{brand.handle}</b>
            <p className="line-clamp-3">{post.text}</p>
          </div>
        </div>
      </article>
    )
  }

  if (TEXT_FIRST.includes(network) || (network === 'facebook' && !post.media.length && !empty)) {
    return (
      <article
        aria-label={t.drawer.preview(NETWORK_LABEL[network])}
        className="w-full max-w-[380px] overflow-hidden rounded-[20px] border border-line bg-float text-[14px] leading-[1.42] shadow-[0_18px_40px_-26px_rgb(0_0_0/0.35)]"
      >
        <div className="flex gap-[11px] p-3.5">
          {avatar}
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="flex flex-wrap items-baseline gap-1.5">
              <b>{brand.name}</b>
              <span className="text-[13px] text-muted">
                @{brand.handle} · {stamp}
              </span>
            </p>
            <p className="whitespace-normal py-1 [overflow-wrap:anywhere]">{post.text}</p>
            {post.media.length > 0 && (
              <div className="mb-1 aspect-[16/10] overflow-hidden rounded-2xl bg-well">
                <Media post={post} />
              </div>
            )}
            <div className="flex max-w-[320px] justify-between gap-1.5 pt-1.5 text-[13px] text-muted">
              {network === 'linkedin' ? (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <ThumbsUp size={17} /> {t.drawer.like}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle size={17} /> {t.drawer.comment}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Repeat2 size={17} /> {t.drawer.repost}
                  </span>
                </>
              ) : (
                <>
                  <MessageCircle size={17} />
                  <Repeat2 size={17} />
                  <Heart size={17} />
                  <Bookmark size={17} />
                </>
              )}
            </div>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      aria-label={t.drawer.preview(NETWORK_LABEL[network])}
      className="w-full max-w-[380px] overflow-hidden rounded-[20px] border border-line bg-float text-[14px] leading-[1.42] shadow-[0_18px_40px_-26px_rgb(0_0_0/0.35)]"
    >
      <header className="flex items-center gap-2.5 px-3.5 py-3">
        {avatar}
        <b className="text-[14px] font-bold">{network === 'facebook' || network === 'pinterest' ? brand.name : brand.handle}</b>
        <Ellipsis size={20} className="ml-auto text-muted" aria-hidden />
      </header>
      <div className="relative aspect-square bg-well">
        <Media post={post} empty={empty} />
      </div>
      <div className="flex items-center gap-3.5 px-3.5 py-2.5">
        <Heart size={20} />
        <MessageCircle size={20} />
        <Send size={20} />
        <span className="flex-1" />
        <Bookmark size={20} />
      </div>
      <p className="px-3.5 pb-1 font-bold">{t.drawer.likes(likes)}</p>
      <p className="whitespace-normal px-3.5 pb-3 [overflow-wrap:anywhere]">
        <b>{brand.handle}</b> {post.text}
      </p>
      <p className="px-3.5 pb-3.5 text-[12px] uppercase tracking-[0.04em] text-faint">{stamp}</p>
    </article>
  )
}
