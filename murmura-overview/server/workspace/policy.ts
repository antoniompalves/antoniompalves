import { can, member } from '../../src/data/access.ts'
import { COLLECTIONS, keyOf, reduce } from '../../src/data/reducer.ts'
import type { CollectionKey, WorkspaceAction } from '../../src/data/reducer.ts'
import { viewFor } from '../../src/data/sync.ts'
import { mayGoOut } from '../../src/data/workflow.ts'
import type { Permission, Workspace } from '../../src/data/types.ts'

/**
 * Whether a teammate may make these changes, decided on the server whatever
 * the browser allowed: the role must have the permission for each kind of
 * change, and every item changed must belong to a brand they work on.
 */

export class Refused extends Error {
  code: 'forbidden' | 'invalid'
  constructor(code: Refused['code'], message: string) {
    super(message)
    this.code = code
  }
}

type Rule = Permission[] | 'anyone' | 'never'

/** Any one of the listed permissions will do. */
const RULES: Record<WorkspaceAction['type'], Rule> = {
  move: ['calendar.edit'],
  publish: ['post.publish'],
  duplicate: ['post.create'],
  delete: ['post.delete', 'post.create'], // post.create alone: only their own drafts (below)
  savePost: ['post.create', 'post.approve', 'post.publish'],
  conversation: ['inbox.reply', 'inbox.assign'],
  send: ['inbox.reply'],
  readAll: ['inbox.reply', 'inbox.assign'],
  addReport: ['analytics.view'],
  removeReport: ['analytics.view'],
  setWebsites: ['analytics.export', 'settings.manage'],
  channel: ['channels.manage'],
  saveChannel: ['channels.manage'],
  saveInboxAccount: ['channels.manage'],
  removeInboxAccount: ['channels.manage'],
  saveCreator: ['creators.manage'],
  saveCreatorCampaign: ['creators.manage'],
  saveDeliverable: ['creators.manage'],
  deleteDeliverable: ['creators.manage'],
  deleteCreatorCampaign: ['creators.manage'],
  deleteCreator: ['creators.manage'],
  putBack: 'anyone', // checked per list below
  audit: 'anyone',
  unaudit: 'anyone', // only their own entries (below)
  track: ['listening.manage'],
  untrack: ['listening.manage'],
  mention: ['listening.manage', 'inbox.reply'],
  mentionToInbox: ['listening.manage', 'inbox.reply'],
  notify: 'anyone',
  readNotices: 'anyone',
  commentPost: 'anyone',
  resolveComment: 'anyone',
  deleteComment: 'anyone', // only their own (below)
  saveIdea: 'anyone', // others' ideas need post.create (below)
  deleteIdea: 'anyone', // their own, or post.delete (below)
  saveKeyDate: ['calendar.edit', 'settings.manage'],
  deleteKeyDate: ['calendar.edit', 'settings.manage'],
  saveCampaign: ['calendar.edit', 'settings.manage'],
  deleteCampaign: ['calendar.edit', 'settings.manage'],
  seen: 'anyone',
  unseen: 'anyone',
  saveBrand: ['settings.manage'],
  settings: ['settings.manage'],
  // Through the team endpoints only, which also look after the sign-in accounts.
  saveMember: 'never',
  removeMember: 'never',
  // This browser only.
  load: 'never',
  scope: 'never',
  signIn: 'never',
  signOut: 'never',
  mentionArrived: 'never',
}

/** Who may change each list (for undo, which puts items back in any list). */
const LIST_RULES: Partial<Record<CollectionKey, Permission[]>> = {
  posts: ['post.create', 'post.approve', 'post.publish', 'calendar.edit', 'post.delete'],
  conversations: ['inbox.reply', 'inbox.assign'],
  reports: ['analytics.view'],
  ideas: ['post.create', 'post.approve'],
  keyDates: ['calendar.edit', 'settings.manage'],
  campaigns: ['calendar.edit', 'settings.manage'],
  channels: ['channels.manage'],
  inboxAccounts: ['channels.manage'],
  creators: ['creators.manage'],
  creatorCampaigns: ['creators.manage'],
  deliverables: ['creators.manage'],
  keywords: ['listening.manage'],
  mentions: ['listening.manage', 'inbox.reply'],
}

/** Lists only the team endpoints change. */
const TEAM_LISTS = new Set<CollectionKey>(['team', 'roles'])

const allowed = (ws: Workspace, me: string, rule: Rule) => rule === 'anyone' || (rule !== 'never' && rule.some((p) => can(ws, me, p)))

/** The changes as they will be applied: audit entries always carry who made them. */
function clean(me: string, a: WorkspaceAction): WorkspaceAction {
  if (a.type === 'audit') return { ...a, event: { ...a.event, actorId: me } }
  if (a.type === 'commentPost') return { ...a, comment: { ...a.comment, by: me } }
  if (a.type === 'readNotices') return { ...a, by: me }
  if (a.type === 'seen' || a.type === 'unseen') return { ...a, by: me }
  if (a.type === 'savePost' && a.at) return { ...a, by: me }
  return a
}

/**
 * Checks `actions` by `memberId` against the shared workspace and returns
 * them ready to apply, with the result; throws Refused otherwise.
 */
export function vet(ws: Workspace, memberId: string, actions: unknown): { actions: WorkspaceAction[]; next: Workspace } {
  if (!Array.isArray(actions) || !actions.length || actions.length > 200) throw new Refused('invalid', 'Expected 1–200 changes')
  const me = member(ws, memberId)
  if (!me || me.status !== 'active') throw new Refused('forbidden', 'This account is not active')
  const out: WorkspaceAction[] = []
  let next = ws
  for (const raw of actions) {
    const a = raw as WorkspaceAction
    if (!a || typeof a !== 'object' || typeof a.type !== 'string' || !(a.type in RULES)) throw new Refused('invalid', `Unknown change ${String((a as { type?: unknown })?.type)}`)
    const rule = RULES[a.type]
    if (!allowed(next, memberId, rule)) throw new Refused('forbidden', `Your role can't do "${a.type}"`)
    if (a.type === 'delete' && !can(next, memberId, 'post.delete')) {
      const post = next.posts.find((p) => p.id === a.id)
      if (post && !(post.status === 'draft' && post.authorId === memberId)) throw new Refused('forbidden', 'Your role can only delete your own drafts')
    }
    if (a.type === 'unaudit' && next.audit.some((e) => e.id === a.id && e.actorId !== memberId)) throw new Refused('forbidden', 'Only your own activity can be taken back')
    if (a.type === 'putBack') {
      for (const key of Object.keys(a.changes ?? {}) as CollectionKey[]) {
        const listRule = LIST_RULES[key]
        if (!listRule || !allowed(next, memberId, listRule)) throw new Refused('forbidden', `Your role can't undo changes to ${key}`)
      }
    }
    if (a.type === 'deleteComment' && next.posts.find((p) => p.id === a.postId)?.comments?.some((x) => x.id === a.id && x.by !== memberId)) throw new Refused('forbidden', 'Only your own notes can be deleted')
    if (a.type === 'saveIdea') {
      const was = (next.ideas ?? []).find((i) => i.id === a.idea.id)
      if (!was && a.idea.by !== memberId) throw new Refused('forbidden', 'Ideas are suggested in your own name')
      if (was && was.by !== memberId && !can(next, memberId, 'post.create')) throw new Refused('forbidden', "Only the content team can answer someone else's idea")
    }
    if (a.type === 'deleteIdea' && (next.ideas ?? []).some((i) => i.id === a.id && i.by !== memberId) && !can(next, memberId, 'post.delete')) throw new Refused('forbidden', 'Only your own ideas can be withdrawn')
    const c = clean(memberId, a)
    const after = reduce(next, c)
    reach(next, after, memberId, c)
    signedOff(next, after)
    out.push(c)
    next = after
  }
  return { actions: out, next }
}

/** Posts of brands with client approval go out only once the brand's client signed them off. */
function signedOff(before: Workspace, after: Workspace) {
  if (before.posts === after.posts) return
  const was = new Map(before.posts.map((p) => [p.id, p]))
  for (const p of after.posts) {
    const old = was.get(p.id)
    if (old === p || (p.status !== 'scheduled' && p.status !== 'published')) continue
    if (old && old.status === p.status && old.text === p.text && old.media.join() === p.media.join()) continue
    if (!mayGoOut(after, p)) throw new Refused('forbidden', "This brand's client has to approve the post before it goes out")
  }
}

/** Every item the change touched must be one this person sees, before and after. */
function reach(before: Workspace, after: Workspace, memberId: string, a: WorkspaceAction) {
  if (before === after) return
  const seenBefore = viewFor(before, memberId)
  const seenAfter = viewFor(after, memberId)
  for (const key of Object.keys(after) as (keyof Workspace)[]) {
    if (before[key] === after[key]) continue
    if (!(COLLECTIONS as readonly string[]).includes(key)) {
      if (key === 'settings' && a.type === 'settings') continue
      throw new Refused('forbidden', `"${a.type}" can't change ${key}`)
    }
    const k = key as CollectionKey
    if (TEAM_LISTS.has(k)) throw new Refused('forbidden', 'People and roles change through the team settings')
    const was = new Map((before[k] as unknown[]).map((x) => [keyOf(x), x]))
    const now = new Map((after[k] as unknown[]).map((x) => [keyOf(x), x]))
    const visibleBefore = new Set((seenBefore[k] as unknown[]).map(keyOf))
    const visibleAfter = new Set((seenAfter[k] as unknown[]).map(keyOf))
    for (const id of new Set([...was.keys(), ...now.keys()])) {
      if (was.get(id) === now.get(id)) continue
      if ((was.has(id) && !visibleBefore.has(id)) || (now.has(id) && !visibleAfter.has(id))) throw new Refused('forbidden', `That belongs to a brand you don't work on`)
    }
  }
}
