import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode, RefObject } from 'react'
import {
  createLucideIcon,
  ArrowLeft,
  ArrowUpRight,
  AtSign,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  Ellipsis,
  EyeOff,
  Flag,
  Hash,
  Image,
  Info,
  Plus,
  RotateCcw,
  Send,
  Smile,
  UserPlus,
  UserRound,
  X,
  Zap,
} from 'lucide-react'
import type { Brand, Conversation, MediaAsset, Message, Post, SavedReply, Sentiment, TeamMember } from '../../data/types'
import { NETWORK_LABEL } from '../../data/selectors'
import { useI18n } from '../../i18n'
import { photo } from '../../data/assets'
import { MenuDivider, MenuItem, Popover } from '../Popover'
import { Avatar, cn } from '../ui'
import { Face } from './ConversationList'
import { TagPopover } from './TagPopover'

/** The reference draws its own "internal note" glyph: a page folded at the bottom-right with two text lines. */
const NoteIcon = createLucideIcon('ib-note', [
  ['path', { d: 'M5 4.5h14v10l-5 5H5z', key: 'page' }],
  ['path', { d: 'M14 19.5v-5h5', key: 'fold' }],
  ['path', { d: 'M8.5 9h7M8.5 12.5h4', key: 'lines' }],
])

const ibIcBase =
  'relative inline-grid shrink-0 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-well hover:text-text disabled:cursor-not-allowed disabled:opacity-40'
export const ibIc = `${ibIcBase} size-[38px] [@media(pointer:coarse)]:size-11`

export interface Draft {
  text: string
  note: boolean
  image?: string
}

export interface ThreadActions {
  onToggleInfo: () => void
  onAssign: (memberId: string | null) => void
  onPriority: () => void
  onDone: () => void
  onMarkUnread: () => void
  onSentiment: (s: Sentiment) => void
  tagSuggestions: string[]
  onAddTag: (tag: string) => void
  onOpenPost: () => void
  onCopyHandle: () => void
  onSend: (draft: Draft, close?: boolean) => void
}

interface ThreadProps extends ThreadActions {
  c: Conversation
  brand: Brand
  post?: Post
  team: Map<string, TeamMember>
  assignable: TeamMember[]
  me: TeamMember
  now: Date
  infoOpen: boolean
  savedReplies: SavedReply[]
  library: MediaAsset[]
  draft: Draft
  setDraft: (d: Draft) => void
  composerRef: RefObject<HTMLTextAreaElement | null>
  mobileOpen: boolean
}

/** Assign menu shared by the thread header and the contact panel. */
export function AssignMenu({ open, onClose, anchor, placement, assignable, current, me, onAssign }: {
  open: boolean
  onClose: () => void
  anchor: RefObject<HTMLElement | null>
  placement: 'bottom-start' | 'bottom-end'
  assignable: TeamMember[]
  current?: string
  me: TeamMember
  onAssign: (id: string | null) => void
}) {
  const { t } = useI18n()
  const pick = (id: string | null) => {
    onAssign(id)
    onClose()
  }
  return (
    <Popover open={open} onClose={onClose} anchor={anchor} placement={placement} label={t.inbox.assign}>
      <div role="menu">
        <MenuItem icon={UserRound} checked={!current} onClick={() => pick(null)}>
          {t.inbox.unassigned}
        </MenuItem>
        <MenuDivider />
        {assignable.map((m) => (
          <MenuItem key={m.id} lead={<Avatar src={m.avatar} name={m.name} size="menu" className="-my-[3px]" />} checked={current === m.id} onClick={() => pick(m.id)}>
            {m.name}
            {m.id === me.id && t.inbox.you}
          </MenuItem>
        ))}
      </div>
    </Popover>
  )
}

const SENTIMENT_ITEMS: { value: Sentiment }[] = [{ value: 'positive' }, { value: 'neutral' }, { value: 'negative' }]

/** Right pane (".ib-th"): header with actions, the post it's about, the message log and the composer. */
export function Thread(props: ThreadProps) {
  const { c, brand, post, team, assignable, me, now, infoOpen, mobileOpen } = props
  const { t } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const assignBtn = useRef<HTMLButtonElement>(null)
  const moreBtn = useRef<HTMLButtonElement>(null)
  const [tagging, setTagging] = useState(false)
  const [menu, setMenu] = useState<'assign' | 'more' | null>(null)
  const assignee = c.assigneeId ? team.get(c.assigneeId) : undefined
  const first = c.contact.name.split(' ')[0]

  // Keep the newest message in view when switching threads or sending.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [c.id, c.messages.length])

  return (
    <section
      aria-label={t.inbox.conversation}
      className={cn(
        'relative flex min-h-0 min-w-0 flex-col bg-ib-wall',
        mobileOpen ? 'max-mobile:fixed max-mobile:inset-0 max-mobile:z-[70] max-mobile:rounded-none' : 'max-mobile:hidden',
      )}
    >
      <header className="relative z-[3] flex h-[60px] shrink-0 items-center gap-1.5 border-b border-line bg-ib-bar pl-2.5 pr-2 max-mobile:h-[calc(58px+env(safe-area-inset-top))] max-mobile:pl-0.5 max-mobile:pr-1 max-mobile:pt-[env(safe-area-inset-top)]">
        <a href="#/inbox" aria-label={t.inbox.backToChats} className={cn(ibIc, 'mobile:hidden')}>
          <ArrowLeft size={20} aria-hidden />
        </a>
        <button
          type="button"
          onClick={props.onToggleInfo}
          aria-label={t.inbox.contactInfoFor(c.contact.name)}
          className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-[11px] rounded-xl px-1.5 text-left focus-visible:-outline-offset-4 max-mobile:gap-[9px] max-mobile:px-0.5"
        >
          <Face c={c} size="md" />
          <span className="grid min-w-0">
            <b className="truncate text-md font-bold">{c.contact.name}</b>
            <small className="truncate text-[12.5px] text-muted">{t.inbox.context(c.kind, NETWORK_LABEL[c.network], brand.name)}</small>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            ref={assignBtn}
            type="button"
            aria-label={assignee ? t.inbox.assignedTo(assignee.name) : t.inbox.assign}
            title={assignee ? t.inbox.assignedTo(assignee.name) : t.inbox.assign}
            aria-haspopup="menu"
            aria-expanded={menu === 'assign'}
            onClick={() => setMenu(menu === 'assign' ? null : 'assign')}
            className={cn(ibIc, 'max-[999px]:w-[34px] max-mobile:hidden')}
          >
            {assignee ? <Avatar src={assignee.avatar} name={assignee.name} size="xsm" /> : <UserPlus size={20} aria-hidden />}
          </button>
          <button
            type="button"
            aria-label={c.priority ? t.inbox.removePriority : t.inbox.markPriority}
            title={c.priority ? t.inbox.removePriority : t.inbox.markPriority}
            aria-pressed={c.priority}
            onClick={props.onPriority}
            className={cn(ibIc, 'max-[999px]:w-[34px]', c.priority && 'bg-[color-mix(in_srgb,var(--coral)_13%,transparent)] text-coral hover:text-coral')}
          >
            <Flag size={20} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={c.status === 'done' ? t.inbox.reopenKey : t.inbox.markDoneKey}
            title={c.status === 'done' ? t.inbox.reopenKey : t.inbox.markDoneKey}
            onClick={props.onDone}
            className={cn(ibIc, 'max-[999px]:w-[34px]', c.status === 'done' && 'text-good')}
          >
            {c.status === 'done' ? <RotateCcw size={20} aria-hidden /> : <Check size={20} aria-hidden />}
          </button>
          <button
            type="button"
            aria-label={t.inbox.contactInfo}
            title={t.inbox.contactInfo}
            aria-pressed={infoOpen}
            onClick={props.onToggleInfo}
            className={cn(ibIc, 'max-[999px]:w-[34px] max-mobile:hidden', infoOpen && 'bg-[color-mix(in_srgb,var(--sea)_13%,transparent)] text-ib-acc-text')}
          >
            <Info size={20} aria-hidden />
          </button>
          <button
            ref={moreBtn}
            type="button"
            aria-label={t.inbox.moreActions}
            title={t.inbox.moreActions}
            aria-haspopup="menu"
            aria-expanded={menu === 'more'}
            onClick={() => setMenu(menu === 'more' ? null : 'more')}
            className={cn(ibIc, 'max-[999px]:w-[34px]')}
          >
            <Ellipsis size={20} aria-hidden />
          </button>
        </div>
        <AssignMenu
          open={menu === 'assign'}
          onClose={() => setMenu(null)}
          anchor={assignBtn}
          placement="bottom-end"
          assignable={assignable}
          current={c.assigneeId}
          me={me}
          onAssign={props.onAssign}
        />
        <Popover open={menu === 'more'} onClose={() => setMenu(null)} anchor={moreBtn} placement="bottom-end" label={t.inbox.moreActions}>
          <div role="menu" onClick={() => setMenu(null)}>
            <MenuItem icon={UserRound} onClick={props.onToggleInfo}>
              {t.inbox.contactInfo}
            </MenuItem>
            <MenuItem icon={Bell} onClick={props.onMarkUnread} disabled={c.unread}>
              {t.inbox.markUnread}
            </MenuItem>
            {post && (
              <MenuItem icon={Image} onClick={props.onOpenPost}>
                {t.inbox.openThePost}
              </MenuItem>
            )}
            <MenuItem icon={Copy} onClick={props.onCopyHandle}>
              {t.inbox.copyHandle(c.contact.handle)}
            </MenuItem>
            <MenuDivider />
            {SENTIMENT_ITEMS.map((s) => (
              <MenuItem key={s.value} icon={Smile} checked={c.sentiment === s.value} onClick={() => props.onSentiment(s.value)}>
                {t.sentiment[s.value]}
              </MenuItem>
            ))}
            <MenuItem
              icon={Hash}
              onClick={() => {
                setMenu(null)
                setTagging(true)
              }}
            >
              {t.inbox.addTagEllipsis}
            </MenuItem>
            {c.assigneeId !== me.id && (
              <>
                <MenuDivider />
                <MenuItem icon={UserRound} onClick={() => props.onAssign(me.id)}>
                  {t.inbox.assignToMe}
                </MenuItem>
              </>
            )}
          </div>
        </Popover>
        <TagPopover open={tagging} onClose={() => setTagging(false)} anchor={moreBtn} suggestions={props.tagSuggestions} onAdd={props.onAddTag} />
      </header>

      {post && (
        <button
          type="button"
          onClick={props.onOpenPost}
          aria-label={t.inbox.openPostLabel(post.text)}
          className="relative z-[2] flex w-full shrink-0 cursor-pointer items-center gap-2.5 border-b border-line bg-ib-bar px-3.5 py-1.5 text-left before:my-0.5 before:w-[3px] before:shrink-0 before:self-stretch before:rounded-[3px] before:bg-sea before:content-[''] hover:bg-float"
        >
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-[7px] bg-well">
            {post.image && <img src={photo(post.image, 96)} alt="" className="size-full object-cover" />}
          </span>
          <span className="grid min-w-0 flex-1">
            <small className="text-[12.5px] font-bold text-ib-acc-text">
              {t.inbox.onPost(brand.name, t.dates.monthDay(new Date(post.scheduledAt)))}
            </small>
            <b className="truncate text-2xs font-medium text-muted">{post.text}</b>
          </span>
          <ArrowUpRight size={16} className="shrink-0 text-muted" aria-hidden />
        </button>
      )}

      <div ref={scrollRef} className="ib-wall min-h-0 flex-1 overflow-y-auto overscroll-contain px-[clamp(14px,5%,64px)] pb-3.5 pt-1 [scrollbar-color:var(--line-2)_transparent] [scrollbar-width:thin] max-mobile:px-2.5 max-mobile:pb-3 max-mobile:pt-0.5">
        <MessageLog c={c} team={team} now={now} />
      </div>

      <Composer {...props} first={first} />
    </section>
  )
}

function MessageLog({ c, team, now }: { c: Conversation; team: Map<string, TeamMember>; now: Date }) {
  const { t } = useI18n()
  const days: { label: string; messages: Message[] }[] = []
  for (const m of c.messages) {
    const label = t.dates.threadDay(m.at, now)
    if (days[days.length - 1]?.label !== label) days.push({ label, messages: [] })
    days[days.length - 1].messages.push(m)
  }
  return (
    <div role="log" aria-label={t.inbox.log(c.contact.name)} className="flex flex-col">
      {days.map((d) => (
        <section key={d.label} className="flex flex-col">
          <div className="pointer-events-none sticky top-2 z-[2] mb-1 mt-3 flex justify-center">
            <span className="rounded-lg bg-float px-[11px] py-1 text-[12.5px] font-semibold text-muted shadow-[0_1px_1px_color-mix(in_srgb,var(--text)_10%,transparent)]">{d.label}</span>
          </div>
          {d.messages.map((m, i) => {
            const prev = d.messages[i - 1]
            const groupStart = !prev || prev.from !== m.from || !!prev.note || !!m.note
            const author = m.authorId ? team.get(m.authorId) : undefined
            return <Bubble key={m.id} m={m} first={groupStart} author={author} />
          })}
        </section>
      ))}
    </div>
  )
}

const TOKEN = /(^|\s)([#@][\wÀ-ɏ.]+)|(https?:\/\/\S+)/g

/** Message text with #tags, @handles and links picked out in the accent colour. */
function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(TOKEN)) {
    const token = match[2] ?? match[3]
    const start = match.index + (match[1]?.length ?? 0)
    parts.push(text.slice(last, start), <span key={start} className="font-semibold text-ib-acc-text">{token}</span>)
    last = start + token.length
  }
  parts.push(text.slice(last))
  return parts
}

function Bubble({ m, first, author }: { m: Message; first: boolean; author?: TeamMember }) {
  const { t } = useI18n()
  const time = <time dateTime={m.at}>{t.dates.time(new Date(m.at))}</time>
  if (m.note) {
    return (
      <div className="mt-2.5 flex justify-center">
        <div className="max-w-[min(78%,440px)] rounded-[10px] border border-ib-note-rim bg-ib-note px-3 py-[7px] text-xs leading-[1.4] text-text shadow-[0_1px_.5px_color-mix(in_srgb,var(--text)_10%,transparent)]">
          <span className="mb-0.5 flex items-center gap-1.5 text-[12.5px] font-bold">
            <EyeOff size={14} aria-hidden />
            {t.inbox.noteBadge}
          </span>
          {m.image && <img src={photo(m.image, 320)} alt="" className="my-0.5 mb-[5px] block aspect-square w-40 max-w-full rounded-md object-cover" />}
          <p className="whitespace-pre-wrap">{m.text}</p>
          <span className="mt-0.5 block text-right text-[12.5px] text-muted">
            {author?.name.split(' ')[0]} · {time}
          </span>
        </div>
      </div>
    )
  }
  const us = m.from === 'us'
  return (
    <div className={cn('flex', first ? 'mt-2.5' : 'mt-0.5', us && 'justify-end')}>
      <div
        className={cn(
          'relative min-w-0 max-w-[min(65%,560px)] rounded-[9px] px-[9px] pb-[7px] pt-1.5 text-sm leading-[1.38] text-text shadow-[0_1px_.5px_color-mix(in_srgb,var(--text)_14%,transparent)] [overflow-wrap:anywhere] max-[999px]:max-w-[80%] max-mobile:max-w-[82%]',
          us ? 'bg-ib-us' : 'bg-float',
          first &&
            "before:absolute before:top-0 before:h-3 before:w-2 before:bg-inherit before:content-['']",
          first && !us && 'rounded-tl-none before:-left-[7px] before:[clip-path:polygon(0_0,100%_0,100%_100%)]',
          first && us && 'rounded-tr-none before:-right-[7px] before:[clip-path:polygon(0_0,100%_0,0_100%)]',
        )}
      >
        {us && first && author && <span className="mb-px block text-[12.5px] font-bold text-ib-acc-text">{author.name.split(' ')[0]}</span>}
        {m.image && <img src={photo(m.image, 480)} alt="" className="my-0.5 mb-[5px] block aspect-square w-60 max-w-full rounded-md object-cover" />}
        <span className="block whitespace-pre-wrap">
          <RichText text={m.text} />
          <span aria-hidden className={cn('inline-block h-px', us ? 'w-[84px]' : 'w-[66px]')} />
        </span>
        <span className="absolute bottom-1 right-2 inline-flex items-center gap-[3px] whitespace-nowrap text-[12.5px] leading-none text-muted">
          {time}
          {us && <CheckCheck size={16} strokeWidth={2} aria-label={m.read ? t.inbox.read : t.inbox.delivered} className={m.read ? 'text-ib-acc-text' : 'text-faint'} />}
        </span>
      </div>
    </div>
  )
}

function Composer(props: ThreadProps & { first: string }) {
  const { c, brand, draft, setDraft, composerRef, savedReplies, library, first, onSend } = props
  const { t } = useI18n()
  const attachBtn = useRef<HTMLButtonElement>(null)
  const caretBtn = useRef<HTMLButtonElement>(null)
  const [menu, setMenu] = useState<'attach' | 'saved' | 'library' | 'send' | null>(null)
  const canSend = draft.text.trim().length > 0 || !!draft.image

  // Grow with the text between one and ~5 lines, like the reference textarea.
  useEffect(() => {
    const ta = composerRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(121, Math.max(21, ta.scrollHeight))}px`
  }, [draft.text, composerRef])

  const insert = (text: string) => {
    setDraft({ ...draft, text: draft.text.trim() ? `${draft.text.trimEnd()} ${text}` : text })
    setMenu(null)
    requestAnimationFrame(() => composerRef.current?.focus())
  }

  const submit = (e?: FormEvent, close = false) => {
    e?.preventDefault()
    if (!canSend) return
    onSend(draft, close)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey && (e.metaKey || e.ctrlKey)) submit(e, true)
    else if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e)
    if (e.key === 'Escape') e.currentTarget.blur()
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="relative z-[3] flex shrink-0 items-end gap-1 border-t border-line bg-ib-bar px-2.5 py-2 max-mobile:px-1.5 max-mobile:pb-[calc(6px+env(safe-area-inset-bottom))] max-mobile:pt-1.5"
    >
      <button
        ref={attachBtn}
        type="button"
        aria-label={t.inbox.attach}
        title={t.inbox.attach}
        aria-haspopup="menu"
        aria-expanded={menu !== null && menu !== 'send'}
        onClick={() => setMenu(menu ? null : 'attach')}
        className={cn(ibIc, 'mb-[3px]')}
      >
        <Plus size={20} aria-hidden />
      </button>
      <button
        type="button"
        aria-label={t.inbox.internalNote}
        title={t.inbox.internalNote}
        aria-pressed={draft.note}
        onClick={() => setDraft({ ...draft, note: !draft.note })}
        className={cn(ibIc, 'mb-[3px]', draft.note && 'bg-[color-mix(in_srgb,var(--butter)_55%,transparent)] text-text')}
      >
        <NoteIcon size={20} aria-hidden />
      </button>

      <div
        className={cn(
          'grid min-w-0 flex-1 gap-1.5 rounded-[22px] border px-3.5 py-[9px]',
          draft.note ? 'border-dashed border-ib-note-rim bg-ib-note' : 'border-line bg-float focus-within:border-[color-mix(in_srgb,var(--sea)_55%,transparent)]',
        )}
      >
        {draft.image && (
          <span className="inline-flex max-w-full items-center gap-2 justify-self-start rounded-[10px] bg-well py-[3px] pl-[3px] pr-1 text-2xs font-semibold">
            <img src={photo(draft.image, 96)} alt="" className="size-9 shrink-0 rounded-[7px] object-cover" />
            <span className="min-w-0 truncate">{library.find((m) => m.seed === draft.image)?.title ?? draft.image}</span>
            <button
              type="button"
              aria-label={t.inbox.removePhoto}
              onClick={() => setDraft({ ...draft, image: undefined })}
              className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-line"
            >
              <X size={14} aria-hidden />
            </button>
          </span>
        )}
        <label htmlFor="ib-ta" className="sr-only">
          {t.inbox.replyTo(c.contact.name)}
        </label>
        <textarea
          id="ib-ta"
          ref={composerRef}
          rows={1}
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          onKeyDown={onKeyDown}
          placeholder={draft.note ? t.inbox.notePlaceholder : t.inbox.replyTo(first)}
          enterKeyHint="send"
          className="block max-h-[121px] min-h-[21px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-sm leading-[21px] text-text outline-none placeholder:text-faint max-mobile:min-h-6 max-mobile:text-md max-mobile:leading-6"
        />
      </div>

      {!draft.note && (
        <button
          ref={caretBtn}
          type="button"
          aria-label={t.inbox.moreSendOptions}
          title={t.inbox.moreSendOptions}
          aria-haspopup="menu"
          aria-expanded={menu === 'send'}
          // Like the reference, the menu only opens once there's something to send.
          onClick={() => canSend && setMenu(menu === 'send' ? null : 'send')}
          className={cn(ibIcBase, 'mb-[7px] size-[30px] [@media(pointer:coarse)]:mb-0 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-9')}
        >
          <ChevronDown size={17} aria-hidden />
        </button>
      )}
      <button
        type="submit"
        aria-label={draft.note ? t.inbox.addNote : t.inbox.send}
        title={t.inbox.keyHint(draft.note ? t.inbox.addNote : t.inbox.send)}
        disabled={!canSend}
        className={cn(
          'grid size-11 shrink-0 cursor-pointer place-items-center rounded-full transition-colors disabled:cursor-default disabled:bg-well disabled:text-faint disabled:shadow-none',
          draft.note ? 'bg-butter text-on-butter' : 'bg-sea text-on-sea shadow-[0_6px_14px_-8px_color-mix(in_srgb,var(--sea)_90%,transparent)]',
        )}
      >
        {draft.note ? <NoteIcon size={20} aria-hidden /> : <Send size={20} aria-hidden />}
      </button>

      <Popover open={menu === 'attach'} onClose={() => setMenu(null)} anchor={attachBtn} placement="top-start" label={t.inbox.attach}>
        <div role="menu">
          <MenuItem icon={Zap} onClick={() => setMenu('saved')}>
            {t.inbox.savedReplies}
          </MenuItem>
          <MenuItem icon={Image} onClick={() => setMenu('library')}>
            {t.inbox.photoFromLibrary}
          </MenuItem>
          <MenuItem icon={AtSign} onClick={() => insert(`@${c.contact.handle}`)}>
            {t.inbox.insertHandle(c.contact.handle)}
          </MenuItem>
        </div>
      </Popover>

      <Popover open={menu === 'saved'} onClose={() => setMenu(null)} anchor={attachBtn} placement="top-start" label={t.inbox.savedReplies} className="w-[360px]">
        <div className="flex items-center justify-between gap-2.5 px-2.5 pb-1.5 pt-2">
          <b className="text-sm font-bold">{t.inbox.savedReplies}</b>
          <span className="text-2xs font-medium leading-[1.45] text-muted">{savedReplies.length}</span>
        </div>
        <div className="grid gap-0.5">
          {savedReplies.map((r) => (
            <button key={r.id} type="button" onClick={() => insert(r.text)} className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-[9px] text-left hover:bg-well focus-visible:bg-well focus-visible:outline-none">
              <span className="grid size-[34px] shrink-0 place-items-center rounded-full border border-line-2">
                <Zap size={17} aria-hidden />
              </span>
              <span className="min-w-0">
                <b className="text-xs font-semibold">{r.title}</b>
                <small className="line-clamp-2 block text-2xs text-muted">{r.text}</small>
              </span>
            </button>
          ))}
        </div>
      </Popover>

      <Popover open={menu === 'library'} onClose={() => setMenu(null)} anchor={attachBtn} placement="top-start" label={t.inbox.choosePhoto} className="w-[360px]">
        <div className="flex items-center justify-between gap-2.5 px-2.5 pb-1.5 pt-2">
          <b className="text-sm font-bold">{t.inbox.library(brand.name)}</b>
          <span className="text-2xs font-medium leading-[1.45] text-muted">{library.length}</span>
        </div>
        {library.length === 0 && <p className="grid justify-items-center gap-1.5 px-4 py-9 text-center text-muted">{t.inbox.noPhotos}</p>}
        <div className="grid grid-cols-3 gap-1.5 px-2 pb-2 pt-1 empty:hidden">
          {library.map(({ seed, title }) => (
            <button
              key={seed}
              type="button"
              aria-label={title}
              title={title}
              onClick={() => {
                setDraft({ ...draft, image: seed })
                setMenu(null)
                composerRef.current?.focus()
              }}
              className="aspect-square cursor-pointer overflow-hidden rounded-[10px] focus-visible:outline-offset-1"
            >
              <img src={photo(seed, 240)} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      </Popover>

      <Popover open={menu === 'send'} onClose={() => setMenu(null)} anchor={caretBtn} placement="top-end" label={t.inbox.sendOptions}>
        <div role="menu">
          <MenuItem
            icon={CheckCheck}
            title="⌘⇧Enter"
            onClick={() => {
              setMenu(null)
              submit(undefined, true)
            }}
          >
            {t.inbox.sendAndClose}
          </MenuItem>
          <MenuItem
            icon={NoteIcon}
            onClick={() => {
              setDraft({ ...draft, note: true })
              setMenu(null)
              composerRef.current?.focus()
            }}
          >
            {t.inbox.writeNote}
          </MenuItem>
        </div>
      </Popover>
    </form>
  )
}
