import { useEffect, useMemo, useState } from 'react'
import { CheckCheck, ChevronDown, Clock, Inbox as InboxIcon, Layers, Lock, PenLine, Shield, Undo2 } from 'lucide-react'
import { PageTitle, Stat } from '../components/PageHead'
import { useToast } from '../components/Toast'
import { usePostActions } from '../components/usePostActions'
import { PostDrawer } from '../components/calendar/PostDrawer'
import { ApprovalCard } from '../components/approvals/ApprovalCard'
import { RequestChangesDialog, RuleCard, WhoCard } from '../components/approvals/Side'
import { BrandMark, Button, cn } from '../components/ui'
import { APPROVAL_TABS, approvalStats, approve, canReview, queue, sendBack, withdraw } from '../data/approvals'
import type { ApprovalTab } from '../data/approvals'
import { can, member } from '../data/permissions'
import { useWorkspace } from '../data/store'
import type { AuditAction, AuditEvent, Post } from '../data/types'
import { useI18n } from '../i18n'

const excerpt = (text: string) => {
  const line = text.split('\n')[0] ?? ''
  return line.length > 46 ? `${line.slice(0, 44)}…` : line
}

const TAB_COUNT: Partial<Record<ApprovalTab, string>> = { mine: 'bg-butter text-[#16191d]', changes: 'bg-coral text-on-coral' }

/**
 * Approvals (#/approvals): the posts waiting for sign-off, sent back, sent by
 * me or recently approved, filtered by brand; approve (one or many), send back
 * with a note or withdraw, next to the rule in force and who approves each brand.
 */
export function Approvals({ now }: { now: Date }) {
  const { ws, dispatch } = useWorkspace()
  const { t } = useI18n()
  const toast = useToast()
  const a = t.approvals
  const me = ws.currentUserId
  const nowMs = Math.floor(now.getTime() / 60_000) * 60_000
  const reviewer = can(ws, me, 'post.approve')

  const [tab, setTab] = useState<ApprovalTab>(reviewer ? 'mine' : 'submitted')
  const [brandId, setBrandId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [asking, setAsking] = useState<Post | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [stamped, setStamped] = useState<string | null>(null)
  // Phones list six posts until "Show more".
  const [all, setAll] = useState(false)
  const { publish, duplicate, remove } = usePostActions(now, () => setOpenId(null))

  const list = useMemo(() => queue(ws, me, tab, nowMs, brandId), [ws, me, tab, nowMs, brandId])
  const counts = useMemo(() => Object.fromEntries(APPROVAL_TABS.map((k) => [k, queue(ws, me, k, nowMs, brandId).length])) as Record<ApprovalTab, number>, [ws, me, nowMs, brandId])
  const stats = approvalStats(ws, me, nowMs)
  const reviewable = list.filter((p) => p.status === 'awaiting_approval' && canReview(ws, me, p))
  const chosen = [...selected].filter((id) => reviewable.some((p) => p.id === id))

  // Selection only spans what's on screen.
  useEffect(() => {
    setSelected(new Set())
    setAll(false)
  }, [tab, brandId])

  const audit = (kind: AuditEvent['kind'], action: AuditAction) =>
    dispatch({ type: 'audit', event: { id: `au-${Date.now().toString(36)}`, actorId: me, kind, action, at: new Date(nowMs).toISOString() } })
  const firstName = (id: string) => member(ws, id)?.name.split(' ')[0] ?? ''

  const approveAll = (posts: Post[]) => {
    const before = ws.posts
    const done = posts.map((p) => approve(p, me, nowMs))
    done.forEach((p) => dispatch({ type: 'savePost', post: p }))
    setSelected(new Set())
    const undo = () => dispatch({ type: 'restore', posts: before })
    if (done.length === 1) {
      audit('approval', { type: 'approved', excerpt: excerpt(done[0].text), brandId: done[0].brandId })
      toast({ text: a.toast.approved(t.dates.dayStamp(new Date(done[0].scheduledAt), now)), icon: CheckCheck, undo })
    } else {
      audit('approval', { type: 'approvedMany', count: done.length })
      toast({ text: a.toast.approvedMany(done.length), icon: CheckCheck, undo })
    }
  }

  const approveOne = (p: Post) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setStamped(p.id)
    window.setTimeout(
      () => {
        setStamped(null)
        approveAll([p])
      },
      reduced ? 0 : 650,
    )
  }

  const sendBackWith = (p: Post, note: string) => {
    setAsking(null)
    dispatch({ type: 'savePost', post: sendBack(p, me, note, nowMs) })
    audit('approval', { type: 'sentBack', excerpt: excerpt(p.text) })
    toast({ text: a.toast.sentBack(firstName(p.authorId)), icon: Undo2 })
  }

  const withdrawOne = (p: Post) => {
    const before = ws.posts
    dispatch({ type: 'savePost', post: withdraw(p, me, nowMs, a.toast.withdrawNote) })
    audit('approval', { type: 'withdrew', excerpt: excerpt(p.text) })
    toast({ text: a.toast.withdrawn, icon: Undo2, undo: () => dispatch({ type: 'restore', posts: before }) })
  }

  const empty = (() => {
    const elsewhere = brandId ? queue(ws, me, tab, nowMs).length : 0
    if (brandId && elsewhere) return { title: a.empty.brandTitle, text: a.empty.brandText(ws.brands.find((b) => b.id === brandId)?.name ?? '', elsewhere), icon: Layers, action: <Button variant="ghost" icon={Layers} onClick={() => setBrandId(null)}>{a.empty.everyBrand}</Button> }
    if (tab === 'mine') return reviewer ? { ...a.empty.mine, icon: InboxIcon } : { ...a.empty.notReviewer, icon: Lock, action: <Button variant="ghost" onClick={() => setTab('submitted')}>{a.tabs.submitted}</Button> }
    if (tab === 'submitted') return { ...a.empty.submitted, icon: PenLine, action: <Button icon={PenLine} href="#/compose">{a.empty.write}</Button> }
    return { ...a.empty[tab], icon: CheckCheck }
  })()

  const open = openId ? ws.posts.find((p) => p.id === openId) ?? null : null
  const chip = 'inline-flex h-[34px] shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-full border text-2xs font-semibold transition-colors pointer-coarse:h-11'

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center gap-x-[clamp(28px,4vw,72px)] gap-y-[18px] max-mobile:mb-[18px] max-mobile:gap-y-3">
        <PageTitle lines={[a.title]} label={a.title} />
        <dl className="flex flex-wrap gap-x-[clamp(24px,3.2vw,56px)] gap-y-3.5 max-mobile:grid max-mobile:w-full max-mobile:grid-cols-2 max-mobile:gap-x-3.5 max-mobile:gap-y-2.5">
          <Stat icon={Shield} value={t.numbers.int(stats.first)} badge={stats.oldest ? a.stats.oldest(t.dates.ago(stats.oldest, now)) : undefined} badgeTone="butter" label={reviewer ? a.stats.waiting : a.stats.yours} />
          <Stat icon={Undo2} value={t.numbers.int(stats.changes)} label={a.stats.changes} />
          <Stat icon={CheckCheck} value={t.numbers.int(stats.week)} label={a.stats.week} />
          <Stat icon={Clock} value={a.duration(stats.average)} label={a.stats.average} />
        </dl>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="min-w-0 max-w-full overflow-x-auto rounded-full [scrollbar-width:none] max-mobile:-mx-3.5 max-mobile:w-[calc(100%+28px)] max-mobile:rounded-none max-mobile:px-3.5">
          <div role="group" aria-label={a.queue} className="inline-flex w-max rounded-full bg-well p-[3px]">
            {APPROVAL_TABS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={tab === k}
                onClick={() => setTab(k)}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-semibold transition-[background-color,color,box-shadow] duration-300 ease-soft pointer-coarse:min-h-11',
                  tab === k ? 'bg-glass-3 text-text shadow-[0_2px_8px_rgb(0_0_0/0.08)] dark:bg-white/14' : 'text-muted',
                )}
              >
                {a.tabs[k]}
                {counts[k] > 0 && <span className={cn('inline-grid h-[21px] min-w-[21px] place-items-center rounded-full px-1.5 text-[12.5px] font-bold', TAB_COUNT[k] ?? 'bg-line-2 text-text')}>{counts[k]}</span>}
              </button>
            ))}
          </div>
        </div>
        <span className="flex-1 max-mobile:hidden" />
        <div role="group" aria-label={a.brands} className="flex flex-wrap gap-1.5 max-mobile:-mx-3.5 max-mobile:w-[calc(100%+28px)] max-mobile:flex-nowrap max-mobile:overflow-x-auto max-mobile:px-3.5 max-mobile:[scrollbar-width:none]">
          <button type="button" aria-pressed={!brandId} onClick={() => setBrandId(null)} className={cn(chip, 'px-3.5', !brandId ? 'border-transparent bg-pill text-on-pill' : 'border-rim bg-glass-2 hover:bg-glass-3')}>
            {a.all}
          </button>
          {ws.brands.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={brandId === b.id}
              onClick={() => setBrandId(brandId === b.id ? null : b.id)}
              className={cn(chip, 'pl-1.5 pr-3', brandId === b.id ? 'border-transparent bg-pill text-on-pill' : 'border-rim bg-glass-2 hover:bg-glass-3')}
            >
              <BrandMark brand={b} size="xs" className={brandId === b.id ? 'shadow-[0_0_0_2px_var(--on-pill)]' : undefined} />
              {b.name.split(' ')[0]}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={reviewable.length > 0 && chosen.length === reviewable.length}
          disabled={!reviewable.length}
          onClick={() => setSelected(chosen.length === reviewable.length ? new Set() : new Set(reviewable.map((p) => p.id)))}
          className={cn(chip, 'px-3 disabled:cursor-not-allowed disabled:opacity-45 max-mobile:px-3.5', chosen.length && chosen.length === reviewable.length ? 'border-transparent bg-pill text-on-pill' : 'border-rim bg-glass-2 enabled:hover:bg-glass-3')}
        >
          <CheckCheck size={18} aria-hidden className="max-mobile:size-4" />
          {a.selectAll}
        </button>
      </div>

      <div className="grid items-start gap-4 grid-cols-[minmax(0,1fr)_340px] max-[1240px]:grid-cols-[minmax(0,1fr)_300px] max-[1060px]:grid-cols-1">
        <div className="grid min-w-0 gap-3.5">
          {list.length ? (
            <div role="list" aria-label={a.posts} className={cn('grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] items-stretch gap-4 max-mobile:gap-3.5', !all && 'max-mobile:[&>:nth-child(n+7)]:hidden')}>
              {list.map((p) => (
                <div role="listitem" key={p.id} className="grid">
                  <ApprovalCard
                    post={p}
                    ws={ws}
                    me={me}
                    now={now}
                    reviewable={p.status === 'awaiting_approval' && canReview(ws, me, p)}
                    selected={selected.has(p.id)}
                    onSelect={(on) =>
                      setSelected((s) => {
                        const next = new Set(s)
                        if (on) next.add(p.id)
                        else next.delete(p.id)
                        return next
                      })
                    }
                    onApprove={() => approveOne(p)}
                    onRequestChanges={() => setAsking(p)}
                    onWithdraw={() => withdrawOne(p)}
                    onOpen={() => setOpenId(p.id)}
                    stamped={stamped === p.id}
                  />
                </div>
              ))}
            </div>
          ) : null}
          {list.length > 6 && !all && (
            <div className="hidden justify-center max-mobile:flex">
              <Button variant="ghost" icon={ChevronDown} onClick={() => setAll(true)} className="h-[46px] bg-glass-2 px-[22px]">
                {a.more(list.length - 6)}
              </Button>
            </div>
          )}
          {!list.length && (
            <div className="grid justify-items-center gap-2 rounded-card border border-rim bg-glass px-6 py-[clamp(36px,6vw,72px)] text-center shadow-card">
              <div aria-hidden className="relative mb-3.5 h-[120px] w-[170px]">
                <span className="absolute left-0 top-3.5 grid h-[98px] w-[82px] -rotate-12 place-items-center rounded-[20px] border border-line-2 bg-glass-2 shadow-[0_18px_30px_-18px_rgb(30_20_10/0.5)]" />
                <span className="absolute right-0 top-3.5 grid h-[98px] w-[82px] rotate-12 place-items-center rounded-[20px] bg-butter shadow-[0_18px_30px_-18px_rgb(30_20_10/0.5)]" />
                <span className="absolute inset-x-0 top-0 z-[1] mx-auto grid h-[98px] w-[82px] place-items-center rounded-[20px] bg-pine text-on-pine shadow-[0_18px_30px_-18px_rgb(30_20_10/0.5)]">
                  <empty.icon size={30} aria-hidden />
                </span>
              </div>
              <p className="text-[22px] font-bold tracking-[-0.02em]">{empty.title}</p>
              <p className="max-w-[380px] text-sm text-muted">{empty.text}</p>
              {'action' in empty && empty.action && <div className="mt-2">{empty.action}</div>}
            </div>
          )}
        </div>
        <aside aria-label={a.rule.title} className="sticky top-[18px] grid min-w-0 gap-4 max-[1060px]:static max-[1060px]:grid-cols-2 max-[1060px]:items-start max-mobile:grid-cols-1">
          <RuleCard ws={ws} me={me} />
          <WhoCard ws={ws} brandId={brandId} onBrand={(id) => setBrandId(brandId === id ? null : id)} />
        </aside>
      </div>

      {chosen.length > 0 && (
        <div role="region" aria-label={a.bulk.region} className="fixed inset-x-0 bottom-6 z-[35] mx-auto flex w-fit max-w-[calc(100vw-24px)] animate-rise items-center gap-2.5 rounded-full bg-pill py-[7px] pl-5 pr-[7px] text-on-pill shadow-pop max-mobile:bottom-[calc(76px+env(safe-area-inset-bottom))]">
          <span className="mr-1 whitespace-nowrap text-xs font-semibold">
            <b className="inline-block text-lg tabular-nums">{chosen.length}</b> {a.bulk.selected}
          </span>
          <Button variant="pine" icon={CheckCheck} onClick={() => approveAll(reviewable.filter((p) => chosen.includes(p.id)))}>
            {a.bulk.approve}
          </Button>
          <button type="button" onClick={() => setSelected(new Set())} className="inline-flex h-11 cursor-pointer items-center rounded-full border border-on-pill/30 px-4 text-sm font-semibold">
            {a.bulk.clear}
          </button>
        </div>
      )}

      {asking && <RequestChangesDialog author={member(ws, asking.authorId)?.name ?? ''} onSend={(note) => sendBackWith(asking, note)} onClose={() => setAsking(null)} />}
      <PostDrawer
        post={open}
        brand={open ? ws.brands.find((b) => b.id === open.brandId) : undefined}
        author={open ? ws.team.find((m) => m.id === open.authorId) : undefined}
        now={now}
        onClose={() => setOpenId(null)}
        onPublish={publish}
        onDuplicate={duplicate}
        onDelete={remove}
      />
    </>
  )
}
