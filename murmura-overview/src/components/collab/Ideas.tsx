import { useState } from 'react'
import { Lightbulb, PenLine, Undo2, X } from 'lucide-react'
import { Modal } from '../Modal'
import { useToast } from '../Toast'
import { Avatar, Badge, BrandMark, Button } from '../ui'
import { excerpt, ideaAnswerNotices, ideaNotices } from '../../data/notices'
import { can, seesBrand } from '../../data/permissions'
import { brandsFor } from '../../data/scope'
import { useWorkspace } from '../../data/store'
import type { Idea, Tone, Workspace } from '../../data/types'
import { stageOf } from '../../data/workflow'
import { useI18n } from '../../i18n'

/**
 * Ideas for posts: a client (or anyone on the team) suggests one, a manager
 * writes the post from it, and it goes through approval like any other,
 * to the client last when the brand asks for it.
 */

/** Where an idea stands: its own answer, or the post made from it. */
export function ideaState(ws: Workspace, idea: Idea): string {
  const post = idea.postId ? ws.posts.find((p) => p.id === idea.postId) : undefined
  if (!post) return idea.status
  if (post.status === 'awaiting_approval') return stageOf(ws, post) === 'client' ? 'client' : 'team'
  if (post.status === 'changes_requested') return 'changes'
  return post.status
}

const TONE: Record<string, Tone> = { new: 'butter', accepted: 'sea', declined: 'coral', draft: 'plain', team: 'butter', client: 'lilac', changes: 'coral', scheduled: 'sea', published: 'pine', failed: 'coral' }

/** Who writes posts from ideas: the team (not clients) who can create and approve posts for the brand. */
export const writesIdeas = (ws: Workspace, me: string, brandId: string) => {
  const m = ws.team.find((x) => x.id === me)
  return !!m && m.role !== 'client' && seesBrand(m, brandId) && can(ws, me, 'post.create')
}

export function IdeasList({ brandId, now }: { brandId: string | null; now: Date }) {
  const { t } = useI18n()
  const d = t.collab.ideas
  const { ws, dispatch, undoable } = useWorkspace()
  const toast = useToast()
  const me = ws.currentUserId
  const [declining, setDeclining] = useState<Idea | null>(null)
  const order: Record<string, number> = { new: 0, accepted: 1, declined: 2 }
  const ideas = (ws.ideas ?? []).filter((i) => !brandId || i.brandId === brandId).sort((a, b) => order[a.status]! - order[b.status]! || b.at.localeCompare(a.at))

  if (!ideas.length)
    return (
      <div className="grid justify-items-center gap-2 rounded-card border border-rim bg-glass px-6 py-[clamp(36px,6vw,72px)] text-center shadow-card">
        <span className="mb-2 grid size-16 place-items-center rounded-[20px] bg-butter text-[#16191d]">
          <Lightbulb size={30} aria-hidden />
        </span>
        <p className="text-[22px] font-bold tracking-[-0.02em]">{d.empty.title}</p>
        <p className="max-w-[380px] text-sm text-muted">{d.empty.text}</p>
      </div>
    )

  return (
    <>
      <div role="list" aria-label={d.tab} className="grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] items-stretch gap-4 max-mobile:gap-3.5">
        {ideas.map((idea) => {
          const brand = ws.brands.find((b) => b.id === idea.brandId)
          const who = ws.team.find((m) => m.id === idea.by)
          const state = ideaState(ws, idea)
          const writer = writesIdeas(ws, me, idea.brandId)
          return (
            <article role="listitem" key={idea.id} data-idea={idea.id} className="grid content-start gap-3 rounded-card border border-rim bg-glass p-5 shadow-card max-mobile:p-4">
              <header className="flex items-center gap-2">
                {brand && <BrandMark brand={brand} size="xs" />}
                <span className="truncate text-2xs font-semibold">{brand?.name}</span>
                <span className="flex-1" />
                <Badge tone={TONE[state] ?? 'plain'} size="tight">
                  {d.status[state] ?? state}
                </Badge>
              </header>
              <h3 className="text-lg font-bold leading-[1.3] tracking-[-0.01em]">{idea.title}</h3>
              <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted">{idea.text}</p>
              {idea.link && (
                <a href={idea.link} target="_blank" rel="noreferrer" className="truncate text-xs font-semibold underline underline-offset-4">
                  {idea.link}
                </a>
              )}
              <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
                {who && <Avatar src={who.avatar} name={who.name} size="xs" />}
                <span>
                  {who?.name ?? ''} · {t.dates.ago(idea.at, now)}
                </span>
                {idea.wantedBy && (
                  <Badge tone="plain" size="tight">
                    {d.wanted(t.dates.monthDay(new Date(`${idea.wantedBy}T12:00:00Z`)))}
                  </Badge>
                )}
              </p>
              {idea.reply && <p className="rounded-[14px] bg-glass-2 px-3 py-2 text-xs">{idea.reply}</p>}
              <footer className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3">
                {writer && idea.postId && ws.posts.some((p) => p.id === idea.postId) ? (
                  <Button size="sm" variant="ghost" icon={PenLine} href={`#/compose/${idea.postId}`}>
                    {d.open}
                  </Button>
                ) : writer && idea.status !== 'declined' ? (
                  <>
                    <Button size="sm" icon={PenLine} href={`#/compose?idea=${idea.id}`}>
                      {d.create}
                    </Button>
                    <Button size="sm" variant="ghost" icon={X} onClick={() => setDeclining(idea)}>
                      {d.decline}
                    </Button>
                  </>
                ) : null}
                {idea.by === me && idea.status === 'new' && !idea.postId && (
                  <Button size="sm" variant="ghost" icon={Undo2} onClick={() => toast({ text: d.withdrawn, icon: Undo2, undo: undoable({ type: 'deleteIdea', id: idea.id }) })}>
                    {d.withdraw}
                  </Button>
                )}
              </footer>
            </article>
          )
        })}
      </div>
      {declining && (
        <DeclineDialog
          idea={declining}
          onClose={() => setDeclining(null)}
          onDecline={(reason) => {
            const at = now.getTime()
            dispatch({ type: 'saveIdea', idea: { ...declining, status: 'declined', reply: reason || undefined } })
            dispatch({ type: 'notify', notices: ideaAnswerNotices(me, declining.by, declining.title, false, at) })
            toast({ text: d.declined, icon: X })
            setDeclining(null)
          }}
        />
      )}
    </>
  )
}

function DeclineDialog({ idea, onClose, onDecline }: { idea: Idea; onClose: () => void; onDecline: (reason: string) => void }) {
  const { t } = useI18n()
  const d = t.collab.ideas
  const { ws } = useWorkspace()
  const [reason, setReason] = useState('')
  const name = ws.team.find((m) => m.id === idea.by)?.name.split(' ')[0] ?? ''
  return (
    <Modal
      open
      onClose={onClose}
      title={d.declineTitle}
      sub={d.declineSub(name)}
      size="sm"
      onSubmit={() => onDecline(reason.trim())}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {d.cancel}
          </Button>
          <Button type="submit" variant="danger">
            {d.decline}
          </Button>
        </>
      }
    >
      <label className="grid gap-1.5">
        <span className="px-0.5 text-2xs font-semibold text-muted">{d.reason}</span>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus className="w-full resize-y rounded-[14px] border border-line-2 bg-glass-2 px-3 py-2.5 text-sm text-text outline-none focus-visible:border-text" />
      </label>
    </Modal>
  )
}

const field = 'h-[46px] w-full min-w-0 rounded-[14px] border border-line-2 bg-glass-2 px-3 text-sm text-text outline-none focus-visible:border-text'
const caption = 'px-0.5 text-2xs font-semibold text-muted'

/** "Suggest an idea": open to anyone who sees a brand, clients included. */
export function IdeaDialog({ now, defaultBrand, onClose }: { now: Date; defaultBrand: string | null; onClose: () => void }) {
  const { t } = useI18n()
  const d = t.collab.ideas
  const { ws, dispatch } = useWorkspace()
  const toast = useToast()
  const me = ws.currentUserId
  const brands = brandsFor(ws)
  const [brandId, setBrandId] = useState(defaultBrand && brands.some((b) => b.id === defaultBrand) ? defaultBrand : (brands[0]?.id ?? ''))
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [wantedBy, setWantedBy] = useState('')
  const [link, setLink] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    if (!title.trim() || !text.trim() || !brandId) return setError(d.missing)
    const at = now.getTime()
    const idea: Idea = {
      id: `idea-${at.toString(36)}`,
      brandId,
      by: me,
      at: new Date(at).toISOString(),
      title: title.trim(),
      text: text.trim(),
      status: 'new',
      ...(wantedBy && { wantedBy }),
      ...(link.trim() && { link: link.trim() }),
    }
    dispatch({ type: 'saveIdea', idea })
    dispatch({ type: 'notify', notices: ideaNotices(ws, me, brandId, idea.title, at) })
    dispatch({ type: 'audit', event: { id: `au-${at.toString(36)}i`, actorId: me, kind: 'review', action: { type: 'suggestedIdea', title: excerpt(idea.title), brandId }, at: idea.at } })
    toast({ text: d.sent, icon: Lightbulb })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={d.title}
      sub={d.sub}
      onSubmit={submit}
      error={error}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {d.cancel}
          </Button>
          <Button type="submit" icon={Lightbulb}>
            {d.send}
          </Button>
        </>
      }
    >
      {brands.length > 1 && (
        <label className="grid gap-1.5">
          <span className={caption}>{d.brand}</span>
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={field}>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="grid gap-1.5">
        <span className={caption}>{d.name}</span>
        <input value={title} onChange={(e) => (setTitle(e.target.value), setError(''))} placeholder={d.namePlaceholder} autoFocus className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className={caption}>{d.text}</span>
        <textarea
          value={text}
          onChange={(e) => (setText(e.target.value), setError(''))}
          placeholder={d.textPlaceholder}
          rows={4}
          className="w-full resize-y rounded-[14px] border border-line-2 bg-glass-2 px-3 py-2.5 text-sm text-text outline-none focus-visible:border-text"
        />
      </label>
      <div className="grid grid-cols-2 gap-3 max-mobile:grid-cols-1">
        <label className="grid gap-1.5">
          <span className={caption}>{d.wantedBy}</span>
          <input type="date" value={wantedBy} min={new Date(now).toISOString().slice(0, 10)} onChange={(e) => setWantedBy(e.target.value)} className={field} />
        </label>
        <label className="grid gap-1.5">
          <span className={caption}>{d.link}</span>
          <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className={field} />
        </label>
      </div>
    </Modal>
  )
}
