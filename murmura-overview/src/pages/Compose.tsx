import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Calendar, CalendarDays, Check, Copy, FileText, History, Image as ImageIcon, Lightbulb, Link as LinkIcon, Plus, Repeat as RepeatIcon, Send, Shield, ShieldCheck, Sparkles, Trash2, TriangleAlert } from 'lucide-react'
import { PageTitle, Stat } from '../components/PageHead'
import { useToast } from '../components/Toast'
import { usePostActions } from '../components/usePostActions'
import { PostDrawer } from '../components/calendar/PostDrawer'
import { Editor, issueText } from '../components/compose/Editor'
import { DraftsCard, PreviewCard, PublishBar, WhenCard } from '../components/compose/Panels'
import { Avatar, Button, PostStatusPill, cn, toneFill } from '../components/ui'
import { assist, bestTimes, defaultTime, editableLink, finalLink, isBlocking, issuesOf, myDrafts, networksOf, nextFreeSlot, sameDay, withHashtags } from '../data/compose'
import type { AssistAction, Draft } from '../data/compose'
import { tidyExtras, viewOn } from '../data/formats'
import { approversFor, can, member, needsApproval } from '../data/permissions'
import { NETWORK_LABEL } from '../data/selectors'
import { useWorkspace } from '../data/store'
import { clientNotices, excerpt, ideaAnswerNotices, submittedNotices } from '../data/notices'
import { clientsOf, firstStage, needsClient, occurrenceAt, occurrenceText } from '../data/workflow'
import { CollabCard, RepeatCard } from '../components/collab/Repeat'
import { addToLibrary } from '../data/lightMedia'
import { api } from '../data/server'
import { Presence } from '../components/collab/Presence'
import type { AuditAction, AuditEvent, NetworkId, Post, PostStatus, PostVersion, RepeatRule, Template } from '../data/types'
import { useI18n } from '../i18n'

const DAY = 86_400_000

/**
 * Compose (#/compose, #/compose/:postId, #/compose?at=…): write a post once
 * for every network of a brand, see it as each network shows it, pick a time
 * (best times, the next free slot) and schedule it, publish it now, send it
 * for approval or keep it as a draft. Laid out like the reference: editor |
 * preview | when, the publish bar and your drafts.
 */
export function Compose({ now, hash }: { now: Date; hash: string }) {
  const { ws, dispatch, undoable, mode } = useWorkspace()
  const { t } = useI18n()
  const toast = useToast()
  const c = t.compose
  const me = ws.currentUserId
  const nowMs = Math.floor(now.getTime() / 60_000) * 60_000

  const [, path = '', query = ''] = hash.match(/^#\/compose\/?([^?]*)\??(.*)$/) ?? []
  const editId = path || null
  const askedAt = Number(new URLSearchParams(query).get('at')) || null
  const askedIdea = new URLSearchParams(query).get('idea')
  const idea = (ws.ideas ?? []).find((i) => i.id === askedIdea) ?? null

  const liveChannels = (brandId: string) => ws.channels.filter((ch) => ch.brandId === brandId && ch.status !== 'disconnected')

  const blank = (brandId = ws.brands[0]?.id ?? '', channels?: string[], at?: number | null): Draft => {
    const ids = channels ?? liveChannels(brandId).map((ch) => ch.id)
    const nets = networksOf(ws.channels, ids)
    return {
      brandId,
      channels: ids,
      text: '',
      media: [],
      firstComment: '',
      link: '',
      utm: ws.settings.utm,
      campaignId: '',
      at: at && at > nowMs ? at : defaultTime(ws, brandId, nets, nowMs),
      formats: {},
      versions: {},
      titles: {},
      alt: {},
    }
  }

  const fromPost = (p: Post): Draft => {
    const own = ws.channels.filter((ch) => ch.brandId === p.brandId)
    const { link, utm } = editableLink(p.link, ws.settings.utm)
    return {
      brandId: p.brandId,
      channels: own.filter((ch) => p.networks.includes(ch.network)).map((ch) => ch.id),
      text: p.text,
      media: [...p.media],
      firstComment: p.firstComment ?? '',
      link,
      utm,
      campaignId: p.campaignId ?? '',
      at: Date.parse(p.scheduledAt),
      formats: { ...p.formats },
      versions: { ...p.versions },
      titles: { ...p.titles },
      alt: { ...p.alt },
    }
  }

  // The composer follows the address: a post id loads that post, the bare route starts a new one.
  const seed = useRef<Draft | null>(null)
  const load = (): { key: string; draft: Draft } => {
    const key = `${editId ?? 'new'}|${askedAt ?? ''}|${askedIdea ?? ''}`
    const post = editId ? ws.posts.find((p) => p.id === editId) : undefined
    // From an idea: its brand, its brief as the first text, and its date when it has one.
    const fromIdea = idea && !post ? { ...blank(idea.brandId, undefined, idea.wantedBy ? Date.parse(`${idea.wantedBy}T10:00:00Z`) : askedAt), text: idea.text } : null
    const draft = seed.current ?? (post ? fromPost(post) : (fromIdea ?? blank(undefined, undefined, askedAt)))
    seed.current = null
    return { key, draft }
  }
  const [state, setState] = useState(() => ({ ...load(), pristine: '' }))
  const routeKey = `${editId ?? 'new'}|${askedAt ?? ''}|${askedIdea ?? ''}`
  const [repeat, setRepeat] = useState<RepeatRule | null>(null)
  if (state.key !== routeKey) {
    const next = load()
    setState({ ...next, pristine: JSON.stringify(next.draft) })
    setRepeat(null)
  }
  const draft = state.draft
  const pristine = state.pristine || JSON.stringify(draft)
  const dirty = JSON.stringify(draft) !== pristine
  const setDraft = (patch: Partial<Draft>) => setState((s) => ({ ...s, pristine: s.pristine || JSON.stringify(s.draft), draft: { ...s.draft, ...patch } }))

  const [history, setHistory] = useState<{ label: string; text: string; tab: NetworkId | 'all' }[]>([])
  // The text box edits the main text, or one network's own version.
  const [tabPick, setTab] = useState<NetworkId | 'all'>('all')
  const [shake, setShake] = useState(0)
  const [previewNet, setPreviewNet] = useState<NetworkId | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const { publish, duplicate, remove } = usePostActions(now, () => setOpenId(null))

  const post = editId ? ws.posts.find((p) => p.id === editId) : undefined
  const missing = !!editId && !post
  const readOnly = post?.status === 'published'
  const brand = ws.brands.find((b) => b.id === draft.brandId) ?? ws.brands[0]
  const channels = ws.channels.filter((ch) => ch.brandId === brand.id)
  const nets = networksOf(ws.channels, draft.channels)
  const network = nets.includes(previewNet as NetworkId) ? previewNet : (nets[0] ?? null)
  const tab: NetworkId | 'all' = tabPick !== 'all' && nets.includes(tabPick) ? tabPick : 'all'
  const text = tab === 'all' ? draft.text : (draft.versions[tab] ?? draft.text)
  const setText = (next: string, on: NetworkId | 'all' = tab) => setDraft(on === 'all' ? { text: next } : { versions: { ...draft.versions, [on]: next } })
  const issues = useMemo(() => issuesOf(draft, ws.channels, nowMs, ws.media), [draft, ws.channels, nowMs, ws.media])
  const blocking = issues.filter(isBlocking)
  const blockingNow = blocking.filter((i) => i.kind !== 'past')
  const clientStep = needsClient(ws, brand.id)
  const approval = needsApproval(ws, me) || clientStep
  const stage = firstStage(ws, me, brand.id)
  const approvers = stage === 'client' ? clientsOf(ws, brand.id) : approversFor(ws, brand.id).filter((m) => m.id !== me && (!clientStep || m.role !== 'client'))
  const ideaId = post?.ideaId ?? idea?.id
  const fromIdea = ideaId ? (ws.ideas ?? []).find((i) => i.id === ideaId) : undefined
  const best = bestTimes(nets, nowMs)
  const day = sameDay(ws, brand.id, draft.at, editId)
  const link = finalLink(draft, ws)
  const { toFinish, waiting } = myDrafts(ws, me)

  const go = (target: string) => {
    window.location.hash = target
  }
  const bump = () => setShake((n) => n + 1)
  const audit = (kind: AuditEvent['kind'], action: AuditAction) =>
    dispatch({ type: 'audit', event: { id: `au-${Date.now().toString(36)}`, actorId: me, kind, action, at: new Date(nowMs).toISOString() } })

  useEffect(() => {
    if (!missing) return
    // A deleted or unknown post: say so and start a new one.
    toast({ text: c.toast.gone, icon: TriangleAlert })
    window.location.hash = '#/compose'
  }, [missing, toast, c.toast.gone])

  /** Start over with `next` (a fresh post, or a copy), leaving any post being edited. */
  const restart = (next: Draft) => {
    setHistory([])
    if (editId || askedAt) {
      seed.current = next
      go('#/compose')
    } else setState({ key: routeKey, draft: next, pristine: JSON.stringify(next) })
  }

  /* ───── saving ───── */

  const save = (mode: 'draft' | 'schedule' | 'now' | 'approval') => {
    const id = post?.id ?? `p-${Date.now().toString(36)}`
    const at = new Date(mode === 'now' ? nowMs : draft.at).toISOString()
    const nowIso = new Date(nowMs).toISOString()
    const status: PostStatus = mode === 'draft' ? 'draft' : mode === 'approval' ? 'awaiting_approval' : mode === 'now' ? 'published' : 'scheduled'
    const saved: Post = {
      id,
      brandId: brand.id,
      authorId: post?.authorId ?? me,
      text: draft.text.trim(),
      media: [...draft.media],
      networks: nets,
      status,
      scheduledAt: at,
      createdAt: post?.createdAt ?? nowIso,
      reviews: mode === 'approval' ? [...(post?.reviews ?? []), { by: me, at: nowIso, decision: 'submitted' }] : (post?.reviews ?? []),
      ...(draft.campaignId && { campaignId: draft.campaignId }),
      ...(draft.firstComment.trim() && nets.includes('instagram') && { firstComment: draft.firstComment.trim() }),
      ...(link && { link }),
      ...(status === 'published' && { metrics: { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, views: 0 } }),
      // Sent to the client straight away when a manager sends it; the team first otherwise.
      ...(mode === 'approval' && clientStep && { stage }),
      ...(ideaId && { ideaId }),
      ...(post?.seriesId && { seriesId: post.seriesId, occurrence: post.occurrence }),
      ...(post?.evergreen && { evergreen: post.evergreen }),
      ...(post?.recycledFrom && { recycledFrom: post.recycledFrom }),
    }
    // Formats, versions, titles and alt text, for the networks and photos still in the post.
    for (const [k, v] of Object.entries(tidyExtras(nets, draft.media, draft, draft.text))) if (v) (saved as unknown as Record<string, unknown>)[k] = v
    // A new post that repeats: one post per time, the text taking turns with the variations.
    const series = !post && repeat && mode !== 'now' ? Array.from({ length: repeat.count }, (_, k) => k) : [0]
    const posts: Post[] = series.map((k) =>
      k === 0
        ? series.length > 1
          ? { ...saved, seriesId: id, occurrence: 0, repeat: { ...repeat!, variations: repeat!.variations.filter((v) => v.trim()) } }
          : saved
        : {
            ...saved,
            id: `${id}-${k}`,
            seriesId: id,
            occurrence: k,
            text: occurrenceText(saved.text, repeat!, k),
            scheduledAt: new Date(occurrenceAt(Date.parse(at), repeat!, k)).toISOString(),
            versions: undefined,
          },
    )
    for (const p of posts) dispatch({ type: 'savePost', post: p, by: me, at: nowIso })
    // The idea it came from is taken up, and whoever had it hears so.
    if (fromIdea && !fromIdea.postId) {
      dispatch({ type: 'saveIdea', idea: { ...fromIdea, status: 'accepted', postId: id } })
      dispatch({ type: 'notify', notices: ideaAnswerNotices(me, fromIdea.by, fromIdea.title, true, nowMs) })
    }
    const quote = excerpt(saved.text) || c.untitled
    const isNew = !post
    if (series.length > 1) audit('schedule', { type: 'scheduledSeries', excerpt: quote, count: series.length })
    if (mode === 'draft') {
      audit('schedule', { type: 'savedDraft', brandId: brand.id })
      toast({ text: series.length > 1 ? t.collab.repeat.saved(series.length) : c.toast.draftSaved, icon: FileText })
      seed.current = draft
      setRepeat(null)
      setState((s) => ({ ...s, pristine: JSON.stringify(draft) }))
      if (isNew) go(`#/compose/${id}`)
      return
    }
    if (mode === 'approval') {
      audit('approval', { type: 'sentForApproval', excerpt: quote, brandId: brand.id })
      dispatch({ type: 'notify', notices: stage === 'client' && clientStep ? clientNotices(ws, me, saved, nowMs) : submittedNotices(ws, me, saved, nowMs) })
      const text = series.length > 1 ? t.collab.repeat.sent(series.length) : stage === 'client' && clientStep ? t.collab.client.sent(t.collab.list(approvers.map((m) => m.name.split(' ')[0]!))) : c.toast.sent(approvers.length)
      toast({ text, icon: Shield, ...(isNew && { action: { label: c.toast.view, run: () => go('#/approvals') } }) })
    } else if (mode === 'now') {
      audit('schedule', { type: 'publishedPost', excerpt: quote, networks: nets.length })
      toast({ text: c.toast.published(nets.map((n) => NETWORK_LABEL[n])), icon: Send })
    } else {
      audit('schedule', { type: 'scheduledPost', excerpt: quote, at })
      toast({ text: series.length > 1 ? t.collab.repeat.scheduled(series.length) : c.toast.scheduled(t.dates.dayStamp(new Date(at), now)), icon: Check, ...(isNew && { action: { label: c.toast.view, run: () => go('#/calendar') } }) })
    }
    // Start the next post for the same brand and channels.
    restart(blank(brand.id, draft.channels))
  }

  /** An earlier version back in the editor (saved only when the post is). */
  const restoreVersion = (v: PostVersion) => {
    const before = draft
    const own = ws.channels.filter((ch) => ch.brandId === brand.id)
    setDraft({ text: v.text, media: [...v.media], channels: own.filter((ch) => v.networks.includes(ch.network)).map((ch) => ch.id) })
    toast({ text: t.collab.versions.restored, icon: History, undo: () => setDraft(before) })
  }

  const onAction = (kind: 'main' | 'now' | 'draft') => {
    if (kind === 'draft') {
      if (!draft.text.trim() && !draft.media.length) {
        bump()
        return toast({ text: c.toast.writeBeforeDraft, icon: FileText })
      }
      return save('draft')
    }
    const stop = kind === 'now' ? blockingNow : blocking
    if (stop.length) {
      bump()
      return toast({ text: issueText(t, stop[0]) || c.toast.fixFirst, icon: TriangleAlert })
    }
    save(kind === 'now' ? 'now' : approval ? 'approval' : 'schedule')
  }

  const startNew = () => {
    if (!editId && !dirty) {
      bump()
      document.getElementById('cm-text')?.focus()
      return
    }
    restart(blank(brand.id, draft.channels))
  }

  const duplicateIntoNew = () => {
    restart({ ...blank(brand.id, draft.channels), text: draft.text, media: [...draft.media], formats: { ...draft.formats }, versions: { ...draft.versions }, titles: { ...draft.titles }, alt: { ...draft.alt } })
    toast({ text: c.toast.duplicated, icon: Copy })
  }

  const deleteDraft = (p: Post) => {
    toast({ text: c.toast.deleted, icon: Trash2, undo: undoable({ type: 'delete', id: p.id }) })
    if (p.id === editId) go('#/compose')
  }

  /* ───── tools ───── */

  const runAssist = (action: AssistAction) => {
    const a = c.assist[action]
    if (!text.trim()) {
      bump()
      return toast({ text: c.assist.writeFirst, icon: Sparkles })
    }
    const set = ws.hashtagSets.find((h) => h.brandId === brand.id)
    const next = assist(action, text, {
      nets: tab === 'all' ? nets : [tab],
      tags: set?.tags ?? [`#${brand.handle}`, '#socialmediamarketing', '#contentstrategy', '#agencylife'],
      cta: c.assist.ctaLine(brand.id),
      link,
      greeting: c.assist.greeting,
      hello: c.assist.hello,
      emoji: { eo: '☕', hh: '🛋️', vg: '✨', wb: '🌿', ns: '👋' }[brand.id],
    })
    if (next === text) return toast({ text: a.same, icon: Sparkles })
    const before = text
    const on = tab
    setHistory((h) => [...h, { label: a.label, text: before, tab: on }])
    setText(next)
    toast({ text: a.done, icon: Sparkles, undo: () => setText(before, on) })
  }

  const undoAssist = () => {
    const last = history[history.length - 1]
    if (!last) return
    setHistory((h) => h.slice(0, -1))
    setText(last.text, last.tab)
    toast({ text: c.assist.undone(last.label), icon: Sparkles })
  }

  const addTags = (name: string, tags: string[]) => {
    const next = withHashtags(text, tags)
    if (!next) return toast({ text: c.assist.tags.same })
    setText(next)
    toast({ text: c.toast.tagsAdded(name) })
  }

  const insertTemplate = (tpl: Template) => {
    setText(text.trim() ? `${text.trimEnd()}\n\n${tpl.text}` : tpl.text)
    toast({ text: c.toast.templateInserted(tpl.name), icon: FileText })
  }

  /* ───── uploads: a light copy each, added to the brand's library and to this post ───── */
  const [uploading, setUploading] = useState(false)
  const upload = async (files: File[]) => {
    setUploading(true)
    try {
      // The original goes to the server only when posts are published from Kataru (connected accounts).
      const keepOriginal = mode === 'server' && (await api<unknown[]>('GET', '/accounts').catch(() => [])).length > 0
      const added: string[] = []
      for (const f of files) {
        try {
          const asset = await addToLibrary(f, { server: mode === 'server', keepOriginal, brandId: brand.id, by: me, now })
          dispatch({ type: 'saveMedia', asset })
          added.push(asset.seed)
          const kept = t.data.bytes(asset.bytes ?? 0)
          const of = t.data.bytes(asset.originalBytes ?? 0)
          toast({ text: asset.kind === 'video' ? t.data.upload.video(kept, of) : t.data.upload.done(kept, of), icon: ImageIcon })
        } catch {
          toast({ text: t.data.upload.failed, icon: TriangleAlert })
        }
      }
      if (added.length) setDraft({ media: [...draft.media, ...added].slice(0, 20) })
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (seedId: string) => {
    const before = draft.media
    setDraft({ media: draft.media.filter((s) => s !== seedId) })
    toast({ text: c.toast.photoRemoved, undo: () => setDraft({ media: before }) })
  }

  const resetVersion = (n: NetworkId) => {
    const before = draft.versions
    const rest = { ...draft.versions }
    delete rest[n]
    setDraft({ versions: rest })
    toast({ text: c.toast.versionReset(NETWORK_LABEL[n]), icon: FileText, undo: () => setDraft({ versions: before }) })
  }

  const copyLink = () => {
    navigator.clipboard?.writeText(link).catch(() => {})
    toast({ text: c.toast.linkCopied, icon: LinkIcon })
  }
  const insertLink = () => {
    if (!link || text.includes(link)) return
    setText(`${text.trimEnd()}${text.trim() ? '\n\n' : ''}${link}`)
    toast({ text: c.toast.linkAdded, icon: LinkIcon })
  }

  const changeBrand = (id: string) => {
    setDraft({ brandId: id, channels: liveChannels(id).map((ch) => ch.id), media: [], campaignId: '', alt: {} })
  }

  /* ───── notes over the editor ───── */

  const notes: ReactNode[] = []
  const note = 'flex flex-wrap items-start gap-3 rounded-[20px] px-4 py-3.5 text-xs [&>svg]:mt-px [&>svg]:size-5 [&>svg]:shrink-0'
  const noteText = 'min-w-0 flex-[240px] [&>b]:mb-0.5 [&>b]:block [&>b]:text-sm [&>b]:font-bold'
  if (fromIdea) {
    const by = member(ws, fromIdea.by)
    notes.push(
      <div key="idea" className={cn(note, toneFill.butter)}>
        <Lightbulb aria-hidden />
        <p className={noteText}>
          <b>{t.collab.ideas.fromIdea(by?.name.split(' ')[0] ?? '', fromIdea.title)}</b>
          {fromIdea.text}
        </p>
      </div>,
    )
  }
  if (post?.seriesId) {
    const n = ws.posts.filter((p) => p.seriesId === post.seriesId).length
    notes.push(
      <div key="series" className={cn(note, 'border border-line bg-glass-2')}>
        <RepeatIcon aria-hidden />
        <p className={noteText}>
          <b>{t.collab.repeat.series((post.occurrence ?? 0) + 1, n)}</b>
        </p>
      </div>,
    )
  }
  if (post) {
    const reviews = [...post.reviews].reverse()
    const changes = reviews.find((r) => r.decision === 'changes')
    const sent = reviews.find((r) => r.decision === 'submitted')
    if (post.status === 'published')
      notes.push(
        <div key="pub" className={cn(note, toneFill.pine)}>
          <Check aria-hidden />
          <p className={noteText}>
            <b>{c.notes.published(t.dates.ago(post.scheduledAt, now))}</b>
            {c.notes.publishedText}
          </p>
        </div>,
      )
    else if (changes && (post.status === 'changes_requested' || (post.status === 'draft' && reviews[0] === changes))) {
      const by = member(ws, changes.by)
      notes.push(
        <div key="changes" className={cn(note, toneFill.coral)}>
          {by && <Avatar src={by.avatar} name={by.name} />}
          <p className={noteText}>
            <b>{c.notes.changes(by?.name.split(' ')[0] ?? '')}</b>
            <q className="my-1 block text-md font-semibold leading-[1.4] [quotes:'“'_'”'] max-mobile:text-sm">{changes.note || c.notes.noNote}</q>
            <small className="block text-2xs opacity-82">{c.notes.fixIt(t.dates.ago(changes.at, now))}</small>
          </p>
        </div>,
      )
    } else if (post.status === 'awaiting_approval') {
      const atClient = needsClient(ws, post.brandId) && (post.stage ?? 'team') === 'client'
      const who = atClient ? clientsOf(ws, post.brandId) : approversFor(ws, post.brandId).filter((m) => m.id !== post.authorId && (!needsClient(ws, post.brandId) || m.role !== 'client'))
      notes.push(
        <div key="pending" className={cn(note, toneFill.butter)}>
          {who.length ? (
            <span className="inline-flex">
              {who.slice(0, 4).map((m, i) => (
                <Avatar key={m.id} src={m.avatar} name={m.name} size="sm" className={cn('shadow-[0_0_0_2px_var(--butter)]', i > 0 && '-ml-2')} />
              ))}
            </span>
          ) : (
            <ShieldCheck aria-hidden />
          )}
          <p className={noteText}>
            <b>
              {c.notes.waiting(
                who.length
                  ? who
                      .slice(0, 3)
                      .map((m) => m.name.split(' ')[0])
                      .join(', ')
                  : c.notes.anApprover,
              )}
            </b>
            {c.notes.sentBy(post.authorId === me ? c.notes.you : (member(ws, post.authorId)?.name.split(' ')[0] ?? ''), t.dates.ago(sent?.at ?? post.createdAt, now))}
          </p>
        </div>,
      )
    } else if (post.status === 'scheduled')
      notes.push(
        <div key="sched" className={cn(note, toneFill.sea)}>
          <Calendar aria-hidden />
          <p className={noteText}>
            <b>{c.notes.scheduled(t.dates.dayStamp(new Date(post.scheduledAt), now))}</b>
            {approval ? c.notes.backForApproval : c.notes.keeps}
          </p>
        </div>,
      )
    else if (post.status === 'failed' && post.failure)
      notes.push(
        <div key="failed" className={cn(note, toneFill.coral)}>
          <TriangleAlert aria-hidden />
          <p className={noteText}>
            <b>{c.notes.failed}</b>
            {t.failure(NETWORK_LABEL[post.failure.network], brand.name)}
          </p>
        </div>,
      )
  }

  /* ───── labels ───── */

  const when = new Date(draft.at)
  const caption = readOnly ? c.when.wentOut(t.dates.ago(post!.scheduledAt, now)) : draft.at < nowMs ? c.when.passed : c.when.goesOut(t.dates.fromNow(when, now))
  const mainLabel = approval ? (post?.status === 'awaiting_approval' ? c.bar.resend : c.bar.send) : post?.status === 'scheduled' ? c.bar.update : c.bar.schedule
  const why = blocking.length ? c.bar.fix(blocking.length) : approval ? c.bar.notify : c.bar.goesOut(t.dates.fromNow(when, now))
  const view = network ? viewOn(draft, network, ws.media) : null
  // With no media, the preview says what this network still needs.
  const need = network ? issues.find((i) => 'network' in i && i.network === network && (i.kind === 'needsPhoto' || i.kind === 'needsVideo' || (i.kind === 'format' && i.problem !== 'title' && i.problem !== 'max'))) : undefined
  const empty = need ? issueText(t, need) : undefined

  const s = {
    drafts: toFinish.length,
    waiting: waiting.length,
    scheduled: ws.posts.filter((p) => p.status === 'scheduled' && Date.parse(p.scheduledAt) > nowMs && Date.parse(p.scheduledAt) <= nowMs + 7 * DAY).length,
  }
  const open = openId ? (ws.posts.find((p) => p.id === openId) ?? null) : null

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center gap-x-[clamp(28px,4vw,72px)] gap-y-[18px] max-mobile:mb-[18px] max-mobile:gap-y-3">
        <PageTitle lines={[c.title]} label={c.title} />
        <dl className="flex flex-wrap gap-x-[clamp(24px,3.2vw,56px)] gap-y-3.5 max-mobile:grid max-mobile:w-full max-mobile:grid-cols-2 max-mobile:gap-x-3.5 max-mobile:gap-y-2.5">
          <Stat icon={FileText} value={t.numbers.int(s.drafts)} label={c.stats.drafts} />
          <Stat icon={Shield} value={t.numbers.int(s.waiting)} label={c.stats.waiting} />
          <Stat icon={CalendarDays} value={t.numbers.int(s.scheduled)} label={c.stats.scheduled} />
        </dl>
        <div className="ml-auto flex flex-wrap items-center gap-2.5 max-mobile:ml-0 max-mobile:w-full">
          <Button variant="ghost" icon={Plus} onClick={startNew} className="max-mobile:flex-1">
            {c.newPost}
          </Button>
        </div>
      </header>

      <div className="cm-grid">
        <Editor
          title={post ? (readOnly ? c.editor.viewTitle : c.editor.editTitle) : c.editor.newTitle}
          titleExtra={
            post && (
              <>
                <PostStatusPill status={post.status} />
                <Presence where={`#/compose/${post.id}`} editing />
              </>
            )
          }
          notes={notes.length ? notes : undefined}
          brands={ws.brands}
          brand={brand}
          onBrand={changeBrand}
          channels={channels}
          canFixChannels={can(ws, me, 'channels.manage')}
          draft={draft}
          onChange={setDraft}
          readOnly={readOnly}
          nets={nets}
          issues={readOnly ? [] : issues}
          shake={shake}
          media={ws.media.filter((m) => m.brandId === brand.id)}
          hashtagSets={ws.hashtagSets.filter((h) => h.brandId === brand.id)}
          suggestedTags={[`#${brand.handle}`, '#socialmediamarketing', '#contentstrategy', '#agencylife']}
          templates={ws.templates.filter((tpl) => tpl.brandId === null || tpl.brandId === brand.id)}
          campaigns={ws.campaigns.filter((cp) => cp.brandId === brand.id)}
          link={link}
          onAssist={runAssist}
          undoLabel={history[history.length - 1]?.label ?? null}
          onUndoAssist={undoAssist}
          onHashtags={addTags}
          onTemplate={insertTemplate}
          onRemovePhoto={removePhoto}
          onUpload={(files) => void upload(files)}
          uploading={uploading}
          onCopyLink={copyLink}
          onInsertLink={insertLink}
          tab={tab}
          onTab={(k) => {
            setTab(k)
            // The preview follows the network being written for.
            if (k !== 'all') setPreviewNet(k)
          }}
          text={text}
          onText={(v) => setText(v)}
          onResetVersion={resetVersion}
        />
        <PreviewCard brand={brand} nets={nets} network={network} onNetwork={setPreviewNet} view={view} stamp={t.dates.dayStamp(when, now)} empty={empty} />
        <WhenCard
          at={draft.at}
          now={new Date(nowMs)}
          onAt={(at) => setDraft({ at })}
          readOnly={readOnly}
          caption={caption}
          zone={ws.timeZone}
          nets={nets}
          best={best}
          onNextFree={() => {
            const at = nextFreeSlot(ws, brand.id, nowMs, editId)
            setDraft({ at })
            toast({ text: c.when.nextFreeToast(t.dates.slot(new Date(at), now)) })
          }}
          day={day}
          brand={brand.name}
        />
        {!readOnly && !post && <RepeatCard rule={repeat} onRule={setRepeat} at={draft.at} />}
        <PublishBar
          approval={approval}
          approvers={approvers}
          channels={draft.channels.length}
          when={t.dates.slot(when, now)}
          mainLabel={mainLabel}
          blocked={blocking.length}
          blockedNow={blockingNow.length}
          nowLocked={approval && (ws.settings.approval === 'all' || clientStep)}
          why={why}
          onAction={onAction}
          readOnly={readOnly ? { published: true, when: t.dates.dayStamp(new Date(post!.scheduledAt), now), onOpen: () => setOpenId(post!.id), onDuplicate: duplicateIntoNew, onNew: startNew } : null}
        />
        {post && <CollabCard post={post} now={now} onRestore={restoreVersion} />}
        <DraftsCard toFinish={toFinish} waiting={waiting} current={editId} brands={ws.brands} now={now} onDelete={deleteDraft} />
      </div>

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
