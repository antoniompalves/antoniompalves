import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, ChevronDown, Plus, RotateCcw, UserPlus, X } from 'lucide-react'
import type { Brand, Conversation, Post, Sentiment, TeamMember } from '../../data/types'
import { KIND_LABEL, fmtStamp, lastMessage } from '../../data/inbox'
import { NETWORK_LABEL, ago, clip, compact } from '../../data/selectors'
import { photo } from '../../data/assets'
import { Avatar, BrandMark, Button, NetIcon, cn } from '../ui'
import { Face, KIND_ICON } from './ConversationList'
import { AssignMenu, ibIc } from './Thread'
import { TagPopover } from './TagPopover'

const SEGS: { value: Sentiment; label: string; dot: string }[] = [
  { value: 'positive', label: 'Positive', dot: 'bg-good' },
  { value: 'neutral', label: 'Neutral', dot: 'bg-faint' },
  { value: 'negative', label: 'Negative', dot: 'bg-coral' },
]

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="border-b border-line px-[18px] py-3.5">
    <h4 className="mb-2 text-[12.5px] font-bold uppercase tracking-[0.06em] text-muted">{title}</h4>
    {children}
  </section>
)

const Row = ({ k, children, stack, id }: { k: string; children: ReactNode; stack?: boolean; id?: string }) => (
  <div className={cn('flex min-h-[30px] text-xs', stack ? 'flex-col items-stretch gap-1.5' : 'items-center justify-between gap-3')}>
    <dt id={id} className="text-muted">
      {k}
    </dt>
    <dd className={cn('min-w-0 font-semibold', !stack && 'text-right')}>{children}</dd>
  </div>
)

interface ContactInfoProps {
  c: Conversation
  brand: Brand
  post?: Post
  team: Map<string, TeamMember>
  assignable: TeamMember[]
  me: TeamMember
  now: Date
  tagSuggestions: string[]
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  tagOpen: boolean
  setTagOpen: (v: boolean) => void
  onClose: () => void
  onSentiment: (s: Sentiment) => void
  onAssign: (id: string | null) => void
  onPriority: () => void
  onDone: () => void
  onOpenPost: () => void
}

/** Third column (".ib-info"): who they are, how the conversation stands, who owns it. */
export function ContactInfo(props: ContactInfoProps) {
  const { c, brand, post, team, assignable, me, now, tagSuggestions, tagOpen, setTagOpen, onClose } = props
  const assignBtn = useRef<HTMLButtonElement>(null)
  const tagBtn = useRef<HTMLButtonElement>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const assignee = c.assigneeId ? team.get(c.assigneeId) : undefined
  const sent = c.messages.filter((m) => !m.note)
  const inbound = sent.filter((m) => m.from === 'them').length
  const KindIcon = KIND_ICON[c.kind]

  return (
    <aside
      aria-label="Contact info"
      className="flex min-h-0 flex-col border-l border-line bg-ib-bar max-desk:absolute max-desk:inset-y-0 max-desk:right-0 max-desk:z-[6] max-desk:w-[min(340px,100%)] max-desk:shadow-pop max-mobile:fixed max-mobile:inset-0 max-mobile:z-[72] max-mobile:w-auto max-mobile:border-l-0 max-mobile:pb-[env(safe-area-inset-bottom)] max-mobile:pt-[env(safe-area-inset-top)] max-mobile:shadow-none"
    >
      <header className="flex h-[60px] shrink-0 items-center gap-2 border-b border-line px-2.5">
        <button type="button" aria-label="Close contact info" title="Close contact info" onClick={onClose} className={ibIc}>
          <X size={20} aria-hidden />
        </button>
        <h3 className="text-md font-bold">Contact info</h3>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[18px] [scrollbar-width:thin]">
        <div className="grid justify-items-center gap-[3px] border-b border-line px-[18px] pb-[18px] pt-[22px] text-center">
          <Face c={c} size="xl" />
          <h2 className="text-xl font-bold tracking-[-0.015em]">{c.contact.name}</h2>
          <p className="text-2xs text-muted">@{c.contact.handle}</p>
          <p className="mb-2 inline-flex items-center gap-1.5 text-2xs text-muted">
            <NetIcon network={c.network} />
            {NETWORK_LABEL[c.network]} · {compact(c.contact.followers)} followers
          </p>
          <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-2xs font-semibold">
            <BrandMark brand={brand} size="xs" />
            {brand.name}
          </span>
        </div>

        <Section title="Conversation">
          <dl className="grid gap-2.5">
            <Row k="Kind">
              <span className="inline-flex items-center gap-1.5">
                <KindIcon size={16} className="text-muted" aria-hidden />
                {KIND_LABEL[c.kind].one}
              </span>
            </Row>
            <Row k="Status">
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-0.5 text-[12.5px] font-bold',
                  c.status === 'done' ? 'bg-[color-mix(in_srgb,var(--pine)_16%,transparent)] text-good' : 'bg-[color-mix(in_srgb,var(--sea)_14%,transparent)] text-ib-acc-text',
                )}
              >
                {c.status === 'done' ? 'Done' : 'Open'}
              </span>
            </Row>
            <Row k="Sentiment" stack>
              <div role="group" aria-label="Sentiment" className="grid grid-cols-3 rounded-full bg-well p-0.5">
                {SEGS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={c.sentiment === s.value}
                    onClick={() => props.onSentiment(s.value)}
                    className={cn(
                      'inline-flex h-7 min-w-0 cursor-pointer items-center justify-center gap-[5px] rounded-full px-[9px] text-[12.5px] font-semibold',
                      c.sentiment === s.value ? 'bg-float text-text shadow-[0_1px_3px_color-mix(in_srgb,var(--text)_14%,transparent)]' : 'text-muted',
                    )}
                  >
                    <i className={cn('size-[9px] shrink-0 rounded-full', s.dot)} />
                    {s.label}
                  </button>
                ))}
              </div>
            </Row>
            <Row k="Priority" id="ib-pri-l">
              <button
                type="button"
                role="switch"
                aria-checked={c.priority}
                aria-labelledby="ib-pri-l"
                onClick={props.onPriority}
                className={cn(
                  "relative inline-block h-7 w-[46px] cursor-pointer rounded-full transition-colors after:absolute after:left-[3px] after:top-[3px] after:size-[22px] after:rounded-full after:bg-white after:shadow-[0_1px_3px_rgb(0_0_0/0.2)] after:transition-transform after:duration-300 after:ease-soft after:content-['']",
                  c.priority ? 'bg-pine after:translate-x-[18px]' : 'bg-line-2',
                )}
              />
            </Row>
          </dl>
        </Section>

        <Section title="Assignee">
          <button
            ref={assignBtn}
            type="button"
            aria-haspopup="menu"
            aria-expanded={assignOpen}
            onClick={() => setAssignOpen((v) => !v)}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-[14px] bg-well px-2.5 py-2 text-left"
          >
            {assignee ? (
              <Avatar src={assignee.avatar} name={assignee.name} size="sm" />
            ) : (
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-float text-muted">
                <UserPlus size={16} aria-hidden />
              </span>
            )}
            <span className="grid min-w-0 flex-1">
              <b className="text-xs font-bold">{assignee ? assignee.name : 'Unassigned'}</b>
              <small className="text-[12.5px] text-muted">{assignee ? assignee.title : 'Hand this to a teammate'}</small>
            </span>
            <ChevronDown size={17} className="text-muted" aria-hidden />
          </button>
          <AssignMenu
            open={assignOpen}
            onClose={() => setAssignOpen(false)}
            anchor={assignBtn}
            placement="bottom-start"
            assignable={assignable}
            current={c.assigneeId}
            me={me}
            onAssign={props.onAssign}
          />
        </Section>

        <Section title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {c.tags.map((t) => (
              <span key={t} className="inline-flex h-[30px] items-center gap-0.5 rounded-full bg-well pl-[11px] pr-[3px] text-2xs font-semibold">
                {t}
                <button
                  type="button"
                  aria-label={`Remove tag ${t.slice(1)}`}
                  onClick={() => props.onRemoveTag(t)}
                  className="inline-grid size-6 cursor-pointer place-items-center rounded-full text-muted hover:bg-line [@media(pointer:coarse)]:size-[34px]"
                >
                  <X size={13} aria-hidden />
                </button>
              </span>
            ))}
            <button
              ref={tagBtn}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={tagOpen}
              onClick={() => setTagOpen(!tagOpen)}
              className="inline-flex h-[30px] cursor-pointer items-center gap-[7px] rounded-full border border-line bg-glass-2 px-[11px] text-2xs font-semibold hover:bg-glass-3"
            >
              <Plus size={16} aria-hidden />
              Tag
            </button>
          </div>
          <TagPopover
            open={tagOpen}
            onClose={() => setTagOpen(false)}
            anchor={tagBtn}
            suggestions={tagSuggestions}
            onAdd={props.onAddTag}
          />
        </Section>

        {post && (
          <Section title="On this post">
            <button type="button" onClick={props.onOpenPost} className="flex w-full cursor-pointer items-center gap-3 text-left text-2xs text-muted">
              <span className="size-[72px] shrink-0 overflow-hidden rounded-xl bg-well">
                {post.image && <img src={photo(post.image, 160)} alt="" className="size-full object-cover" />}
              </span>
              <span>{clip(post.text, 88)}</span>
            </button>
          </Section>
        )}

        <Section title="Activity">
          <dl className="grid gap-2.5">
            <Row k="Messages">
              {sent.length}{' '}
              <small className="text-[smaller] font-medium text-muted">
                · {inbound} in · {sent.length - inbound} out
              </small>
            </Row>
            <Row k="First contact">{fmtStamp(c.messages[0].at)}</Row>
            <Row k="Last message">{ago(lastMessage(c).at, now)}</Row>
          </dl>
        </Section>

        <div className="px-[18px] pt-4">
          {c.status === 'done' ? (
            <Button variant="ghost" icon={RotateCcw} className="w-full" onClick={props.onDone}>
              Reopen
            </Button>
          ) : (
            <Button variant="pine" icon={Check} className="w-full" onClick={props.onDone}>
              Mark done
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
}
