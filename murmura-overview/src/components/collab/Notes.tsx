import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { AtSign, CheckCircle2, History, MessageSquare, RotateCcw, Send, Trash2 } from 'lucide-react'
import { useToast } from '../Toast'
import { Avatar, Button, IconButton, cn } from '../ui'
import { mentionNotices } from '../../data/notices'
import { seesBrand } from '../../data/permissions'
import { useWorkspace } from '../../data/store'
import type { Post, PostVersion, TeamMember } from '../../data/types'
import { useI18n } from '../../i18n'

/**
 * A post's notes (the team's conversation about it, never published) with
 * @mentions that notify, and its earlier versions.
 */

const first = (m: TeamMember) => m.name.split(' ')[0]!
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** People who can be mentioned on a brand's post: active teammates who see it. */
const mentionable = (team: TeamMember[], brandId: string) => team.filter((m) => m.status === 'active' && seesBrand(m, brandId))

/** The text with @Name in bold. */
function withMentions(text: string, people: TeamMember[]): ReactNode[] {
  if (!people.length) return [text]
  const re = new RegExp(`(@(?:${people.map((m) => escape(first(m))).join('|')}))(?![\\p{L}])`, 'gu')
  return text.split(re).map((part, i) =>
    i % 2 ? (
      <b key={i} className="rounded-md bg-butter/40 px-0.5 font-semibold">
        {part}
      </b>
    ) : (
      part
    ),
  )
}

export function PostNotes({ post, now, className }: { post: Post; now: Date; className?: string }) {
  const { t } = useI18n()
  const n = t.collab.notes
  const { all, dispatch, undoable } = useWorkspace()
  const toast = useToast()
  const me = all.currentUserId
  const people = useMemo(() => mentionable(all.team, post.brandId), [all.team, post.brandId])
  const [text, setText] = useState('')
  const [query, setQuery] = useState<string | null>(null)
  const [pick, setPick] = useState(0)
  const [showResolved, setShowResolved] = useState(false)
  const box = useRef<HTMLTextAreaElement>(null)
  const notes = post.comments ?? []
  const open = notes.filter((c) => !c.resolved)
  const resolved = notes.filter((c) => c.resolved)
  const shown = showResolved ? notes : open
  const candidates = query === null ? [] : people.filter((m) => m.id !== me && first(m).toLowerCase().startsWith(query.toLowerCase())).slice(0, 6)

  const onType = (v: string) => {
    setText(v)
    const caret = box.current?.selectionStart ?? v.length
    const m = v.slice(0, caret).match(/(?:^|\s)@([\p{L}-]*)$/u)
    setQuery(m ? m[1]! : null)
    setPick(0)
  }

  const insert = (m: TeamMember) => {
    const el = box.current
    const caret = el?.selectionStart ?? text.length
    const before = text.slice(0, caret).replace(/@([\p{L}-]*)$/u, `@${first(m)} `)
    const next = before + text.slice(caret)
    setText(next)
    setQuery(null)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(before.length, before.length)
    })
  }

  const send = () => {
    const body = text.trim()
    if (!body) return
    const mentions = people.filter((m) => m.id !== me && new RegExp(`@${escape(first(m))}(?![\\p{L}])`, 'u').test(body)).map((m) => m.id)
    const at = now.getTime()
    dispatch({ type: 'commentPost', postId: post.id, comment: { id: `cm-${at.toString(36)}${Math.random().toString(36).slice(2, 5)}`, by: me, at: new Date(at).toISOString(), text: body, mentions } })
    if (mentions.length) dispatch({ type: 'notify', notices: mentionNotices(all, me, post, mentions, at) })
    setText('')
    setQuery(null)
    toast({ text: mentions.length ? n.mentioned(t.collab.list(mentions.map((id) => first(people.find((m) => m.id === id)!)))) : n.added, icon: MessageSquare })
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (candidates.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setPick((i) => (i + (e.key === 'ArrowDown' ? 1 : candidates.length - 1)) % candidates.length)
    } else if (candidates.length && (e.key === 'Enter' || e.key === 'Tab')) {
      e.preventDefault()
      insert(candidates[pick]!)
    } else if (e.key === 'Escape' && query !== null) {
      e.preventDefault()
      e.stopPropagation()
      setQuery(null)
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className={cn('grid gap-3', className)} data-notes>
      {shown.length ? (
        <ol aria-label={n.title} className="grid gap-2.5">
          {shown.map((c) => {
            const who = all.team.find((m) => m.id === c.by)
            return (
              <li key={c.id} className={cn('flex gap-2.5', c.resolved && 'opacity-60')}>
                <Avatar src={who?.avatar} name={who?.name ?? '?'} size="xsm" />
                <div className="min-w-0 flex-1 rounded-[14px] rounded-tl-[4px] bg-glass-2 px-3 py-2">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[12.5px]">
                    <b className="font-semibold">{who?.name ?? ''}</b>
                    <time dateTime={c.at} className="text-muted">
                      {t.dates.ago(c.at, now)}
                    </time>
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-[1.45]">{withMentions(c.text, people)}</p>
                  <span className="mt-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'resolveComment', postId: post.id, id: c.id, resolved: !c.resolved })}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full px-1.5 py-0.5 text-[12px] font-semibold text-muted hover:bg-well hover:text-text"
                    >
                      <CheckCircle2 size={13} aria-hidden />
                      {c.resolved ? n.reopen : n.resolve}
                    </button>
                    {c.by === me && (
                      <button
                        type="button"
                        onClick={() => toast({ text: n.removed, icon: Trash2, undo: undoable({ type: 'deleteComment', postId: post.id, id: c.id }) })}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full px-1.5 py-0.5 text-[12px] font-semibold text-muted hover:bg-well hover:text-bad"
                      >
                        <Trash2 size={13} aria-hidden />
                        {n.remove}
                      </button>
                    )}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="text-xs text-muted">{n.empty}</p>
      )}
      {resolved.length > 0 && (
        <button type="button" onClick={() => setShowResolved(!showResolved)} className="w-fit cursor-pointer text-[12.5px] font-semibold text-muted underline-offset-4 hover:text-text hover:underline">
          {showResolved ? n.hide : n.show} · {n.resolvedCount(resolved.length)}
        </button>
      )}
      <form
        noValidate
        className="relative grid gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          ref={box}
          value={text}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => window.setTimeout(() => setQuery(null), 150)}
          rows={2}
          aria-label={n.placeholder}
          placeholder={n.placeholder}
          className="min-h-[64px] w-full resize-y rounded-[14px] border border-line-2 bg-glass-2 px-3 py-2.5 text-sm text-text outline-none focus-visible:border-text"
        />
        {candidates.length > 0 && (
          <ul role="listbox" aria-label={n.people} className="absolute bottom-[calc(100%-52px)] left-2 z-10 grid w-[230px] gap-0.5 rounded-[14px] border border-line bg-float p-1 shadow-pop">
            {candidates.map((m, i) => (
              <li key={m.id} role="option" aria-selected={i === pick}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(m)} className={cn('flex w-full cursor-pointer items-center gap-2 rounded-[10px] px-2 py-1.5 text-left text-xs', i === pick ? 'bg-well' : 'hover:bg-well')}>
                  <Avatar src={m.avatar} name={m.name} size="xs" />
                  <span className="truncate font-semibold">{m.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <span className="flex items-center justify-between gap-2">
          <IconButton label={n.people} icon={AtSign} size="sm" onClick={() => (onType(`${text}${text && !text.endsWith(' ') ? ' ' : ''}@`), box.current?.focus())} />
          <Button type="submit" size="sm" icon={Send} disabled={!text.trim()}>
            {n.send}
          </Button>
        </span>
      </form>
    </div>
  )
}

/** Earlier versions, newest first, each one restorable into the composer. */
export function Versions({ post, now, onRestore }: { post: Post; now: Date; onRestore?: (v: PostVersion) => void }) {
  const { t } = useI18n()
  const v = t.collab.versions
  const { all } = useWorkspace()
  const list = [...(post.history ?? [])].reverse()
  if (!list.length) return <p className="text-xs text-muted">{v.empty}</p>
  return (
    <ol aria-label={v.title} className="grid gap-2">
      {list.map((h, i) => {
        const who = all.team.find((m) => m.id === h.by)
        return (
          <li key={`${h.at}-${i}`} className="flex items-start gap-2.5 rounded-[14px] border border-line bg-glass-2 px-3 py-2">
            <History size={16} aria-hidden className="mt-0.5 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-muted">
                <b className="font-semibold text-text">{who?.name ?? ''}</b> · {t.dates.ago(h.at, now)}
                {h.media.length > 0 && ` · ${v.photos(h.media.length)}`}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs">{h.text}</p>
            </div>
            {onRestore && (
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => onRestore(h)}>
                {v.restore}
              </Button>
            )}
          </li>
        )
      })}
    </ol>
  )
}
