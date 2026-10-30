import { useEffect, useRef, useState } from 'react'
import {
  Bookmark,
  Clock,
  Copy,
  Ellipsis,
  Heart,
  ImageOff,
  MessageCircle,
  PenLine,
  Play,
  Repeat2,
  Send,
  ThumbsUp,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import type { Brand, NetworkId, Post, TeamMember } from '../../data/types'
import { fmtRelativeDay, fmtTime } from '../../data/calendar'
import { NETWORK_LABEL, clip, compact, pct1 } from '../../data/selectors'
import { photo } from '../../data/assets'
import { BrandMark, Button, IconButton, NetStack, PostStatusPill, Segmented, cn, toneFill } from '../ui'

interface PostDrawerProps {
  post: Post | null
  brand?: Brand
  author?: TeamMember
  now: Date
  onClose: () => void
  onPublish: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

const VERB: Record<Post['status'], string> = {
  published: 'Published',
  draft: 'Pencilled for',
  failed: 'Was due',
  scheduled: 'Goes out',
  awaiting_approval: 'Goes out',
  changes_requested: 'Goes out',
}

/**
 * Right-hand post drawer (".drawer" + ".pd-*"): status, timing, a per-network
 * preview, metrics once published, and the publishing actions.
 */
export function PostDrawer({ post, brand, author, now, onClose, onPublish, onDuplicate, onDelete }: PostDrawerProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [network, setNetwork] = useState<NetworkId | null>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (post && !d.open) d.showModal()
    if (!post && d.open) d.close()
    setNetwork(post?.networks[0] ?? null)
  }, [post])

  const when = post ? new Date(post.scheduledAt) : now
  const stamp = `${fmtRelativeDay(when, now)} · ${fmtTime(when)}`
  const m = post?.metrics

  return (
    <dialog
      ref={ref}
      aria-label="Post"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="fixed inset-y-3 left-auto right-3 m-0 h-auto max-h-none w-[min(480px,calc(100vw-24px))] max-w-none overflow-auto overscroll-contain rounded-[28px] border border-rim bg-glass-3 p-0 text-text shadow-pop backdrop:bg-[rgb(16_18_20/0.26)] backdrop:backdrop-blur-[6px] open:animate-drawer dark:backdrop:bg-black/60"
    >
      {post && brand && (
        <div className="relative grid content-start gap-[18px] p-6">
          <span className="absolute right-[18px] top-[18px] z-[1]">
            <IconButton label="Close" icon={X} onClick={onClose} />
          </span>

          <header className="flex flex-wrap items-center gap-2.5 pr-[52px]">
            <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-2xs font-semibold">
              <BrandMark brand={brand} size="xs" />
              {brand.name}
            </span>
            <PostStatusPill status={post.status} size="md" />
          </header>
          <h2 className="pr-[52px] text-[23px] font-bold tracking-[-0.02em]">{clip(post.text, 44)}</h2>
          <p className="-mt-2 flex items-center gap-2 text-xs text-muted">
            <Clock size={17} aria-hidden className="shrink-0" />
            {VERB[post.status]} {stamp}
            {author && ` · by ${author.name}`}
          </p>

          {post.failure && (
            <p className="flex items-start gap-2.5 rounded-2xl bg-[color-mix(in_srgb,var(--coral)_14%,transparent)] px-3.5 py-3 text-xs font-semibold text-bad">
              <TriangleAlert size={18} aria-hidden className="mt-px shrink-0" />
              {post.failure.reason}
            </p>
          )}

          {post.networks.length > 1 && network && (
            <div className="overflow-x-auto [scrollbar-width:none]">
              <Segmented
                label="Preview network"
                value={network}
                onChange={setNetwork}
                options={post.networks.map((n) => ({ value: n, label: NETWORK_LABEL[n] }))}
              />
            </div>
          )}

          <div key={network} className="grid animate-rise justify-items-center rounded-[22px] bg-well p-[18px]">
            <Preview post={post} brand={brand} network={network ?? post.networks[0]} stamp={stamp} />
          </div>

          {m && (
            <dl className="grid grid-cols-3 gap-2 max-[480px]:grid-cols-2">
              {[
                ['Impressions', compact(m.impressions)],
                ['Reach', compact(m.reach)],
                ['Engagements', compact(m.engagements)],
                ['Eng. rate', pct1(m.engagementRate)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-line bg-glass-2 p-3">
                  <dt className="text-2xs text-muted">{k}</dt>
                  <dd className="text-xl font-bold tracking-[-0.01em] tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="flex items-center gap-2.5 text-2xs text-muted">
            <NetStack networks={post.networks} />
            <span>{post.networks.map((n) => `${NETWORK_LABEL[n]} @${brand.handle}`).join(' · ')}</span>
          </div>

          <footer className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {post.status !== 'published' && (
              <>
                <Button icon={Send} onClick={() => onPublish(post.id)}>
                  Publish now
                </Button>
                <Button variant="ghost" icon={PenLine} href={`#/compose/${post.id}`}>
                  Edit
                </Button>
              </>
            )}
            <span className="flex-1" />
            <IconButton label="Duplicate" icon={Copy} onClick={() => onDuplicate(post.id)} />
            <IconButton label="Delete post" icon={Trash2} onClick={() => onDelete(post.id)} />
          </footer>
        </div>
      )}
    </dialog>
  )
}

/* ───────────────────────── network previews (".pv") ───────────────────────── */

const VIDEO: NetworkId[] = ['tiktok', 'youtube']
const TEXT_FIRST: NetworkId[] = ['x', 'threads', 'linkedin']

function Media({ post, className }: { post: Post; className?: string }) {
  return post.image ? (
    <img src={photo(post.image, 760)} alt="" className={cn('size-full object-cover', className)} />
  ) : (
    <span
      className={cn(
        'grid size-full place-content-center place-items-center gap-2 bg-[repeating-linear-gradient(45deg,var(--well)_0_10px,transparent_10px_20px)] text-2xs font-semibold text-muted',
        className,
      )}
    >
      <ImageOff size={28} aria-hidden />
      No media
    </span>
  )
}

function Preview({ post, brand, network, stamp }: { post: Post; brand: Brand; network: NetworkId; stamp: string }) {
  const likes = post.metrics ? compact(Math.round(post.metrics.engagements * 0.82)) : '0'
  const avatar = (
    <span className={cn('grid size-[34px] shrink-0 place-items-center rounded-full text-[12.5px] font-bold', toneFill[brand.tone])}>{brand.initials}</span>
  )

  if (VIDEO.includes(network)) {
    return (
      <article aria-label={`${NETWORK_LABEL[network]} preview`} className="w-full max-w-[260px] overflow-hidden rounded-[20px] bg-[#0e1012] text-white shadow-[0_18px_40px_-26px_rgb(0_0_0/0.35)]">
        <div className="relative aspect-[9/16] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:top-[40%] after:bg-gradient-to-b after:from-transparent after:to-black/72">
          <Media post={post} className="text-white/70" />
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

  if (TEXT_FIRST.includes(network)) {
    return (
      <article aria-label={`${NETWORK_LABEL[network]} preview`} className="w-full max-w-[380px] overflow-hidden rounded-[20px] border border-line bg-float text-[14px] leading-[1.42] shadow-[0_18px_40px_-26px_rgb(0_0_0/0.35)]">
        <div className="flex gap-[11px] p-3.5">
          {avatar}
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="flex flex-wrap items-baseline gap-1.5">
              <b>{brand.name}</b>
              <span className="text-[13px] text-muted">@{brand.handle} · {stamp}</span>
            </p>
            <p className="whitespace-normal py-1 [overflow-wrap:anywhere]">{post.text}</p>
            {post.image && (
              <div className="mb-1 aspect-[16/10] overflow-hidden rounded-2xl bg-well">
                <Media post={post} />
              </div>
            )}
            <div className="flex max-w-[320px] justify-between gap-1.5 pt-1.5 text-[13px] text-muted">
              {network === 'linkedin' ? (
                <>
                  <span className="inline-flex items-center gap-1.5"><ThumbsUp size={17} /> Like</span>
                  <span className="inline-flex items-center gap-1.5"><MessageCircle size={17} /> Comment</span>
                  <span className="inline-flex items-center gap-1.5"><Repeat2 size={17} /> Repost</span>
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
    <article aria-label={`${NETWORK_LABEL[network]} preview`} className="w-full max-w-[380px] overflow-hidden rounded-[20px] border border-line bg-float text-[14px] leading-[1.42] shadow-[0_18px_40px_-26px_rgb(0_0_0/0.35)]">
      <header className="flex items-center gap-2.5 px-3.5 py-3">
        {avatar}
        <b className="text-[14px] font-bold">{network === 'facebook' || network === 'pinterest' ? brand.name : brand.handle}</b>
        <Ellipsis size={20} className="ml-auto text-muted" aria-hidden />
      </header>
      <div className="relative aspect-square bg-well">
        <Media post={post} />
      </div>
      <div className="flex items-center gap-3.5 px-3.5 py-2.5">
        <Heart size={20} />
        <MessageCircle size={20} />
        <Send size={20} />
        <span className="flex-1" />
        <Bookmark size={20} />
      </div>
      <p className="px-3.5 pb-1 font-bold">{likes} likes</p>
      <p className="whitespace-normal px-3.5 pb-3 [overflow-wrap:anywhere]">
        <b>{brand.handle}</b> {post.text}
      </p>
      <p className="px-3.5 pb-3.5 text-[12px] uppercase tracking-[0.04em] text-faint">{stamp}</p>
    </article>
  )
}
