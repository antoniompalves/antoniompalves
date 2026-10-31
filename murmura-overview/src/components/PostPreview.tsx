import { useState } from 'react'
import type { ReactNode } from 'react'
import { Bookmark, ChevronLeft, ChevronRight, Ellipsis, FileText, Heart, ImageOff, MessageCircle, Play, Repeat2, Send, Share2, ThumbsUp } from 'lucide-react'
import { photo } from '../data/assets'
import { clock, isCarousel } from '../data/formats'
import type { MediaInfo, PostView } from '../data/formats'
import { NETWORK_LABEL } from '../data/selectors'
import type { Brand, NetworkId } from '../data/types'
import { useI18n } from '../i18n'
import { cn, toneFill } from './ui'

const TEXT_FIRST: NetworkId[] = ['x', 'threads', 'linkedin']

/** One item: the photo, a video's poster with a play badge, or a document's first page. `play` forces the badge on or off. */
function Item({ item, alt, className, play, length = true }: { item: MediaInfo; alt?: string; className?: string; play?: boolean; length?: boolean }) {
  return (
    <span className={cn('relative block size-full', className)}>
      <img src={photo(item.seed, 760)} alt={alt ?? ''} className="size-full object-cover" />
      {(play ?? item.kind === 'video') && (
        <span aria-hidden className="absolute inset-0 m-auto grid size-[54px] place-items-center rounded-full bg-black/35 text-white">
          <Play size={24} className="fill-white stroke-none" />
        </span>
      )}
      {item.kind === 'video' && length && item.duration && (
        <span className="absolute bottom-2 right-2 rounded-md bg-black/66 px-1.5 py-px text-[11.5px] font-semibold tabular-nums text-white">{clock(item.duration)}</span>
      )}
    </span>
  )
}

function NoMedia({ label, className }: { label?: string; className?: string }) {
  const { t } = useI18n()
  return (
    <span
      className={cn(
        'grid size-full place-content-center place-items-center gap-2 bg-[repeating-linear-gradient(45deg,var(--well)_0_10px,transparent_10px_20px)] p-3 text-center text-2xs font-semibold text-muted',
        className,
      )}
    >
      <ImageOff size={28} aria-hidden />
      {label ?? t.drawer.noMedia}
    </span>
  )
}

/** Swipeable items with arrows, dots and a counter (carousels, TikTok photo posts, document pages). */
function Slides({ count, render, dark, counter = true }: { count: number; render: (i: number) => ReactNode; dark?: boolean; counter?: boolean }) {
  const { t } = useI18n()
  const [i, setI] = useState(0)
  const at = Math.min(i, count - 1)
  const arrow = 'absolute top-1/2 z-[2] grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/88 text-[#16191d] shadow-[0_2px_8px_rgb(0_0_0/0.2)] disabled:hidden'
  return (
    <>
      {render(at)}
      {count > 1 && (
        <>
          {counter && <span className="absolute right-2.5 top-2.5 z-[2] rounded-full bg-black/60 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-white">{t.drawer.slide(at + 1, count)}</span>}
          <button type="button" aria-label={t.drawer.previous} disabled={at === 0} onClick={() => setI(at - 1)} className={cn(arrow, 'left-2')}>
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button type="button" aria-label={t.drawer.next} disabled={at === count - 1} onClick={() => setI(at + 1)} className={cn(arrow, 'right-2')}>
            <ChevronRight size={18} aria-hidden />
          </button>
          <span aria-hidden className="absolute inset-x-0 bottom-2.5 z-[2] flex justify-center gap-1">
            {Array.from({ length: Math.min(count, 10) }, (_, k) => (
              <i key={k} className={cn('size-1.5 rounded-full', k === at ? (dark ? 'bg-white' : 'bg-sea') : dark ? 'bg-white/45' : 'bg-white/70')} />
            ))}
          </span>
        </>
      )}
    </>
  )
}

/**
 * A post laid out the way a network shows it (".pv"), in the format it goes
 * out in: Stories and Reels full screen, Shorts and TikTok vertical, a YouTube
 * video 16:9 under its title, LinkedIn documents page by page, carousels with
 * arrows and dots, a text-first card for X, Threads and LinkedIn (and Facebook
 * without media), a photo card otherwise. `empty` replaces the missing-media
 * label, e.g. "Instagram needs a photo" while composing.
 */
export function PostPreview({ view, brand, network, stamp, empty }: { view: PostView; brand: Brand; network: NetworkId; stamp: string; empty?: string }) {
  const { t } = useI18n()
  const { media, format, text, alt } = view
  const likes = t.numbers.compact(view.metrics?.likes ?? 0)
  const avatar = (size = 'size-[34px] text-[12.5px]') => <span className={cn('grid shrink-0 place-items-center rounded-full font-bold', size, toneFill[brand.tone])}>{brand.initials}</span>
  const label = t.drawer.preview(NETWORK_LABEL[network])
  const first = media[0]

  if (format === 'story') {
    return (
      <article aria-label={label} className="relative aspect-[9/16] w-full max-w-[250px] overflow-hidden rounded-[20px] bg-[#0e1012] text-white shadow-[0_18px_40px_-26px_rgb(0_0_0/0.35)]">
        {first ? <Item item={first} alt={alt[first.seed]} play={false} length={false} /> : <NoMedia label={empty} className="text-white/70" />}
        <div className="absolute inset-x-0 top-0 grid gap-2 bg-gradient-to-b from-black/50 to-transparent p-2.5 pb-6">
          <span aria-hidden className="h-[3px] rounded-full bg-white/90" />
          <span className="flex items-center gap-2 text-[13px] font-semibold">
            {avatar('size-7 text-[11px]')}
            {network === 'facebook' ? brand.name : brand.handle}
            <span className="font-normal text-white/72">{stamp.split(' · ').pop()}</span>
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-gradient-to-t from-black/50 to-transparent p-2.5 pt-6">
          <span className="flex-1 rounded-full border border-white/70 px-3.5 py-2 text-[13px] text-white/90">{t.drawer.message}</span>
          <Heart size={22} aria-hidden />
          <Send size={22} aria-hidden />
        </div>
      </article>
    )
  }

  const vertical = format === 'reel' || format === 'short' || network === 'tiktok'
  if (vertical) {
    const tag = format === 'reel' ? t.drawer.reels : format === 'short' ? t.drawer.shorts : null
    return (
      <article aria-label={label} className="relative w-full max-w-[260px] overflow-hidden rounded-[20px] bg-[#0e1012] text-white shadow-[0_18px_40px_-26px_rgb(0_0_0/0.35)]">
        <div className="relative aspect-[9/16] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:top-[40%] after:bg-gradient-to-b after:from-transparent after:to-black/72">
          {!first ? (
            <NoMedia label={empty} className="text-white/70" />
          ) : format === 'photos' && media.length > 1 ? (
            <Slides count={media.length} dark render={(i) => <Item item={media[i]} alt={alt[media[i].seed]} />} />
          ) : (
            <Item item={first} alt={alt[first.seed]} play />
          )}
          {tag && <b className="absolute left-3 top-3 z-[1] text-[15px] font-bold drop-shadow">{tag}</b>}
          <div aria-hidden className="absolute bottom-16 right-2.5 z-[1] grid justify-items-center gap-3.5 text-[11.5px] font-semibold">
            <span className="grid justify-items-center gap-0.5">
              <Heart size={24} />
              {likes}
            </span>
            <MessageCircle size={24} />
            <Share2 size={22} />
          </div>
          <div className="absolute inset-x-0 bottom-0 z-[1] grid gap-1 p-3.5 pr-12 text-[13px] leading-[1.4]">
            <b className="flex items-center gap-2">
              @{brand.handle}
              {format === 'short' && <span className="rounded-full bg-white px-2 py-px text-[11.5px] font-bold text-[#0e1012]">{t.drawer.subscribe}</span>}
            </b>
            {view.title && format === 'short' && <p className="line-clamp-2 font-semibold">{view.title}</p>}
            <p className="line-clamp-3">{text}</p>
          </div>
        </div>
      </article>
    )
  }

  if (network === 'youtube') {
    return (
      <article aria-label={label} className="w-full max-w-[380px] overflow-hidden rounded-[20px] border border-line bg-float text-[14px] leading-[1.42] shadow-[0_18px_40px_-26px_rgb(0_0_0/0.35)]">
        <div className="relative aspect-video bg-[#0e1012]">{first ? <Item item={first} alt={alt[first.seed]} /> : <NoMedia label={empty} className="text-white/70" />}</div>
        <div className="flex gap-3 p-3.5">
          {avatar()}
          <div className="grid min-w-0 gap-0.5">
            <b className="line-clamp-2 font-bold">{view.title?.trim() || text.split('\n')[0] || brand.name}</b>
            <span className="text-[13px] text-muted">
              {brand.name} · {view.metrics ? `${t.drawer.views(t.numbers.compact(view.metrics.views))} · ` : ''}
              {stamp}
            </span>
          </div>
        </div>
      </article>
    )
  }

  if (TEXT_FIRST.includes(network) || (network === 'facebook' && !media.length && !empty)) {
    const doc = network === 'linkedin' && format === 'document'
    return (
      <article aria-label={label} className="w-full max-w-[380px] overflow-hidden rounded-[20px] border border-line bg-float text-[14px] leading-[1.42] shadow-[0_18px_40px_-26px_rgb(0_0_0/0.35)]">
        <div className="flex gap-[11px] p-3.5">
          {avatar()}
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="flex flex-wrap items-baseline gap-1.5">
              <b>{brand.name}</b>
              <span className="text-[13px] text-muted">
                @{brand.handle} · {stamp}
              </span>
            </p>
            <p className="whitespace-normal py-1 [overflow-wrap:anywhere]">{text}</p>
            {doc ? (
              <div className="mb-1 overflow-hidden rounded-2xl border border-line bg-well">
                <p className="flex items-center gap-2 border-b border-line px-3 py-2 text-[13px]">
                  <FileText size={16} aria-hidden className="shrink-0 text-muted" />
                  <b className="min-w-0 flex-1 truncate">{view.title?.trim() || first?.title || '—'}</b>
                  {first?.pages && <span className="shrink-0 text-muted">{t.drawer.pages(first.pages)}</span>}
                </p>
                <div className="relative aspect-[4/5]">
                  {first ? <Slides count={first.pages ?? 1} render={(i) => <img src={photo(i ? `${first.seed}-p${i + 1}` : first.seed, 760)} alt="" className="size-full object-cover" />} /> : <NoMedia label={empty} />}
                </div>
              </div>
            ) : media.length > 1 ? (
              <div className={cn('mb-1 grid gap-0.5 overflow-hidden rounded-2xl', network === 'threads' ? 'auto-cols-[62%] grid-flow-col overflow-x-auto' : 'aspect-[16/10] grid-cols-2')}>
                {media.slice(0, network === 'threads' ? media.length : 4).map((m, i) => (
                  <span key={m.seed} className={cn('relative min-h-0 bg-well', network === 'threads' ? 'aspect-[4/5]' : media.length === 3 && i === 0 && 'row-span-2')}>
                    <Item item={m} alt={alt[m.seed]} />
                  </span>
                ))}
              </div>
            ) : (
              first && (
                <div className="mb-1 aspect-[16/10] overflow-hidden rounded-2xl bg-well">
                  <Item item={first} alt={alt[first.seed]} />
                </div>
              )
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
    <article aria-label={label} className="w-full max-w-[380px] overflow-hidden rounded-[20px] border border-line bg-float text-[14px] leading-[1.42] shadow-[0_18px_40px_-26px_rgb(0_0_0/0.35)]">
      <header className="flex items-center gap-2.5 px-3.5 py-3">
        {avatar()}
        <b className="text-[14px] font-bold">{network === 'facebook' || network === 'pinterest' ? brand.name : brand.handle}</b>
        <Ellipsis size={20} className="ml-auto text-muted" aria-hidden />
      </header>
      <div className="relative aspect-square bg-well">
        {!first ? (
          <NoMedia label={empty} />
        ) : isCarousel(format, media) ? (
          <Slides count={media.length} render={(i) => <Item item={media[i]} alt={alt[media[i].seed]} />} />
        ) : (
          <Item item={first} alt={alt[first.seed]} />
        )}
      </div>
      <div className="flex items-center gap-3.5 px-3.5 py-2.5">
        <Heart size={20} />
        <MessageCircle size={20} />
        <Send size={20} />
        <span className="flex-1" />
        <Bookmark size={20} />
      </div>
      {network === 'pinterest' && view.title?.trim() && <p className="px-3.5 pb-1 text-[15px] font-bold">{view.title}</p>}
      <p className="px-3.5 pb-1 font-bold">{t.drawer.likes(likes)}</p>
      <p className="whitespace-normal px-3.5 pb-3 [overflow-wrap:anywhere]">
        <b>{brand.handle}</b> {text}
      </p>
      <p className="px-3.5 pb-3.5 text-[12px] uppercase tracking-[0.04em] text-faint">{stamp}</p>
    </article>
  )
}
