import type {
  AuditEvent,
  Brand,
  Campaign,
  Idea,
  KeyDate,
  MediaAsset,
  PostComment,
  Channel,
  Conversation,
  Creator,
  CreatorCampaign,
  Deliverable,
  InboxAccount,
  Keyword,
  Mention,
  Message,
  Notice,
  Post,
  ScheduledReport,
  TeamMember,
  Website,
  Workspace,
  WorkspaceSettings,
} from './types.ts'

/**
 * Every change to the workspace, as data, and the one function that applies
 * them. The browser runs it on its own copy (store.tsx); the accounts server
 * runs the very same code on the shared copy (server/workspace), so a change
 * made by one person lands identically for everyone.
 *
 * Nothing here may import anything but types: the server loads this file
 * as is.
 */

export type WorkspaceAction =
  | { type: 'move'; id: string; to: string }
  | { type: 'publish'; id: string; at: string }
  | { type: 'duplicate'; id: string; newId: string; at: string }
  | { type: 'delete'; id: string }
  /**
   * Insert a post, or replace the one with its id (the composer's saves). With
   * `by` and `at`, a change to its text, media or networks keeps the old version.
   */
  | { type: 'savePost'; post: Post; by?: string; at?: string }
  /** The team's notes on a post. */
  | { type: 'commentPost'; postId: string; comment: PostComment }
  | { type: 'resolveComment'; postId: string; id: string; resolved: boolean }
  | { type: 'deleteComment'; postId: string; id: string }
  /** Ideas for posts: add or replace by id, or remove. */
  | { type: 'saveIdea'; idea: Idea }
  | { type: 'deleteIdea'; id: string }
  /** The editorial calendar: the team's own dates, and campaigns or themes. */
  | { type: 'saveKeyDate'; date: KeyDate }
  | { type: 'deleteKeyDate'; id: string }
  | { type: 'saveCampaign'; campaign: Campaign }
  | { type: 'deleteCampaign'; id: string }
  /** Conversations `by` has opened (read for them only), or wants back as unread. */
  | { type: 'seen'; ids: string[]; by: string }
  | { type: 'unseen'; id: string; by: string }
  | { type: 'conversation'; id: string; patch: Partial<Conversation> }
  | { type: 'send'; id: string; message: Message; close?: boolean }
  /** Marks these open conversations read (the ones on screen). */
  | { type: 'readAll'; ids: string[] }
  | { type: 'addReport'; report: ScheduledReport }
  | { type: 'removeReport'; id: string }
  | { type: 'setWebsites'; websites: Website[] }
  | { type: 'channel'; id: string; patch: Partial<Channel> }
  /** Add a channel, or replace the one with its id. */
  | { type: 'saveChannel'; channel: Channel }
  /** A WhatsApp number or Google location for a brand's inbox: add, or remove by id. */
  | { type: 'saveInboxAccount'; account: InboxAccount }
  | { type: 'removeInboxAccount'; id: string }
  /** Creators page: add or replace by id; deleting a campaign or a creator takes their deliverables along. */
  | { type: 'saveCreator'; creator: Creator }
  | { type: 'saveCreatorCampaign'; campaign: CreatorCampaign }
  | { type: 'saveDeliverable'; deliverable: Deliverable }
  | { type: 'deleteDeliverable'; id: string }
  | { type: 'deleteCreatorCampaign'; id: string }
  | { type: 'deleteCreator'; id: string }
  /** Undo: put these items back as they were (see revertOf), leaving everything else alone. */
  | { type: 'putBack'; changes: PutBack }
  | { type: 'audit'; event: AuditEvent }
  /** Take an activity entry back out (an undone action). */
  | { type: 'unaudit'; id: string }
  /** `index` puts a keyword back where it was (undoing "Stop tracking"). */
  | { type: 'track'; keyword: Keyword; mentions: Mention[]; index?: number }
  | { type: 'untrack'; id: string }
  | { type: 'mentionArrived'; mention: Mention }
  | { type: 'mention'; id: string; patch: Partial<Mention> }
  | { type: 'mentionToInbox'; id: string; conversation: Conversation }
  | { type: 'notify'; notices: Notice[] }
  /** Notifications read; by `by` only when given (everyone otherwise, as in the demo). */
  | { type: 'readNotices'; ids: string[]; by?: string }
  /* People, brands and settings: sent by the accounts server (invites, roles, sign-ins). */
  | { type: 'saveMember'; member: TeamMember }
  | { type: 'removeMember'; id: string }
  | { type: 'saveBrand'; brand: Brand }
  | { type: 'settings'; patch: Partial<WorkspaceSettings> }
  /** Old items leaving the live workspace for the archive, or coming back (sent by the server). */
  | { type: 'archive'; lists: Partial<Record<CollectionKey, string[]>> }
  | { type: 'unarchive'; lists: Partial<Record<CollectionKey, unknown[]>> }
  /** A photo or video added to a brand's library (its light copy), or changed. */
  | { type: 'saveMedia'; asset: MediaAsset }
  /* This browser only: never sent to the server. */
  /** Replace everything: a reset, a save from another tab, or what the server sent. */
  | { type: 'load'; ws: Workspace }
  | { type: 'scope'; brandId: string | null }
  | { type: 'signIn'; userId: string }
  | { type: 'signOut' }

/** Changes that only concern the person at this browser. */
export const LOCAL_ACTIONS = new Set<WorkspaceAction['type']>(['load', 'scope', 'signIn', 'signOut', 'mentionArrived'])

/** The workspace's lists of things with an id (media files are keyed by their seed). */
export const COLLECTIONS = [
  'brands',
  'campaigns',
  'team',
  'roles',
  'channels',
  'websites',
  'posts',
  'reports',
  'conversations',
  'keywords',
  'mentions',
  'competitors',
  'savedReplies',
  'inboxAccounts',
  'waTemplates',
  'creators',
  'creatorCampaigns',
  'deliverables',
  'media',
  'templates',
  'hashtagSets',
  'ideas',
  'keyDates',
  'audit',
  'notices',
] as const satisfies readonly (keyof Workspace)[]

export type CollectionKey = (typeof COLLECTIONS)[number]
type Item = { id?: string; seed?: string }

export const keyOf = (x: unknown) => {
  const it = x as Item
  return (it.id ?? it.seed) as string
}

const list = (ws: Workspace, key: CollectionKey) => ws[key] as unknown as Item[]

/** Items to put back per list: `ids` were touched; `items` are the ones that existed, with where they stood. */
export type PutBack = Partial<Record<CollectionKey, { ids: string[]; items: { item: unknown; index: number }[] }>>

/** Undo never takes back the activity log or notifications, only the work. */
const NOT_UNDONE = new Set<CollectionKey>(['audit', 'notices'])

/**
 * What undoes `actions` applied to `before`: the items they changed, as they
 * were. Only those items go back, so whatever teammates changed meanwhile
 * stays changed.
 */
export function revertOf(before: Workspace, actions: WorkspaceAction[]): { after: Workspace; undo: WorkspaceAction } {
  const after = actions.reduce(reduce, before)
  const changes: PutBack = {}
  for (const key of COLLECTIONS) {
    if (NOT_UNDONE.has(key) || before[key] === after[key]) continue
    const was = new Map(list(before, key).map((x, index) => [keyOf(x), { item: x as unknown, index }]))
    const now = new Map(list(after, key).map((x) => [keyOf(x), x as unknown]))
    const ids = [...new Set([...was.keys(), ...now.keys()])].filter((id) => was.get(id)?.item !== now.get(id))
    if (ids.length) changes[key] = { ids, items: ids.flatMap((id) => (was.has(id) ? [was.get(id)!] : [])) }
  }
  return { after, undo: { type: 'putBack', changes } }
}

/** Replace the item with the same id, or add it at the end. */
const upsert = <T extends { id: string }>(items: T[], item: T) => (items.some((x) => x.id === item.id) ? items.map((x) => (x.id === item.id ? item : x)) : [...items, item])

const newestFirst = (mentions: Mention[]) => [...mentions].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))

export function reduce(ws: Workspace, action: WorkspaceAction): Workspace {
  const update = (id: string, patch: (p: Post) => Post) => ({
    ...ws,
    posts: ws.posts.map((p) => (p.id === id ? patch(p) : p)),
  })
  switch (action.type) {
    case 'move':
      return update(action.id, (p) => ({ ...p, scheduledAt: action.to }))
    case 'publish':
      return update(action.id, (p) => ({ ...p, status: 'published', scheduledAt: action.at, failure: undefined }))
    case 'duplicate': {
      const source = ws.posts.find((p) => p.id === action.id)
      if (!source) return ws
      return { ...ws, posts: [...ws.posts, { ...source, id: action.newId, status: 'draft', createdAt: action.at, reviews: [], metrics: undefined, failure: undefined }] }
    }
    case 'delete':
      return { ...ws, posts: ws.posts.filter((p) => p.id !== action.id) }
    case 'savePost': {
      const before = ws.posts.find((p) => p.id === action.post.id)
      if (!before) return { ...ws, posts: [...ws.posts, action.post] }
      const changed = before.text !== action.post.text || before.media.join() !== action.post.media.join() || before.networks.join() !== action.post.networks.join()
      const history = changed && action.by && action.at ? [...(before.history ?? []), { by: action.by, at: action.at, text: before.text, media: before.media, networks: before.networks }].slice(-15) : before.history
      // A save from the composer doesn't carry the notes and versions: they stay.
      const next: Post = { ...action.post, comments: action.post.comments ?? before.comments, history: action.post.history ?? history }
      if (!next.comments) delete next.comments
      if (!next.history) delete next.history
      return { ...ws, posts: ws.posts.map((p) => (p.id === next.id ? next : p)) }
    }
    case 'commentPost':
      return update(action.postId, (p) => ({ ...p, comments: [...(p.comments ?? []), action.comment] }))
    case 'resolveComment':
      return update(action.postId, (p) => ({ ...p, comments: (p.comments ?? []).map((c) => (c.id === action.id ? { ...c, resolved: action.resolved } : c)) }))
    case 'deleteComment':
      return update(action.postId, (p) => ({ ...p, comments: (p.comments ?? []).filter((c) => c.id !== action.id) }))
    case 'saveIdea':
      return { ...ws, ideas: upsert(ws.ideas ?? [], action.idea) }
    case 'deleteIdea':
      return { ...ws, ideas: (ws.ideas ?? []).filter((i) => i.id !== action.id) }
    case 'saveKeyDate':
      return { ...ws, keyDates: upsert(ws.keyDates ?? [], action.date) }
    case 'deleteKeyDate':
      return { ...ws, keyDates: (ws.keyDates ?? []).filter((d) => d.id !== action.id) }
    case 'saveCampaign':
      return { ...ws, campaigns: upsert(ws.campaigns, action.campaign) }
    case 'deleteCampaign':
      return { ...ws, campaigns: ws.campaigns.filter((c) => c.id !== action.id), posts: ws.posts.map((p) => (p.campaignId === action.id ? { ...p, campaignId: undefined } : p)) }
    case 'seen':
      return {
        ...ws,
        conversations: ws.conversations.map((c) => (action.ids.includes(c.id) && c.unread && !c.seenBy?.includes(action.by) ? { ...c, seenBy: [...(c.seenBy ?? []), action.by] } : c)),
      }
    case 'unseen':
      return { ...ws, conversations: ws.conversations.map((c) => (c.id === action.id ? { ...c, unread: true, seenBy: (c.seenBy ?? []).filter((x) => x !== action.by) } : c)) }
    case 'conversation':
      return { ...ws, conversations: ws.conversations.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) }
    case 'send':
      return {
        ...ws,
        conversations: ws.conversations.map((c) =>
          c.id === action.id
            ? { ...c, unread: false, messages: [...c.messages, action.message], ...(action.close && { status: 'done' as const }) }
            : c,
        ),
      }
    case 'readAll':
      return { ...ws, conversations: ws.conversations.map((c) => (action.ids.includes(c.id) && c.status === 'open' && c.unread ? { ...c, unread: false } : c)) }
    case 'addReport':
      return { ...ws, reports: [...ws.reports, action.report] }
    case 'removeReport':
      return { ...ws, reports: ws.reports.filter((r) => r.id !== action.id) }
    case 'setWebsites':
      return { ...ws, websites: action.websites }
    case 'channel':
      return { ...ws, channels: ws.channels.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) }
    case 'saveChannel':
      return { ...ws, channels: upsert(ws.channels, action.channel) }
    case 'saveCreator':
      return { ...ws, creators: upsert(ws.creators, action.creator) }
    case 'saveCreatorCampaign':
      return { ...ws, creatorCampaigns: upsert(ws.creatorCampaigns, action.campaign) }
    case 'saveDeliverable':
      return { ...ws, deliverables: upsert(ws.deliverables, action.deliverable) }
    case 'deleteDeliverable':
      return { ...ws, deliverables: ws.deliverables.filter((d) => d.id !== action.id) }
    case 'deleteCreatorCampaign':
      return { ...ws, creatorCampaigns: ws.creatorCampaigns.filter((c) => c.id !== action.id), deliverables: ws.deliverables.filter((d) => d.campaignId !== action.id) }
    case 'deleteCreator':
      return { ...ws, creators: ws.creators.filter((c) => c.id !== action.id), deliverables: ws.deliverables.filter((d) => d.creatorId !== action.id) }
    case 'saveInboxAccount':
      return { ...ws, inboxAccounts: [...ws.inboxAccounts.filter((a) => a.id !== action.account.id), action.account] }
    case 'removeInboxAccount':
      return { ...ws, inboxAccounts: ws.inboxAccounts.filter((a) => a.id !== action.id) }
    case 'putBack': {
      let next = ws
      for (const [key, change] of Object.entries(action.changes) as [CollectionKey, NonNullable<PutBack[CollectionKey]>][]) {
        if (!(COLLECTIONS as readonly string[]).includes(key) || !change) continue
        const touched = new Set(change.ids)
        const items = list(next, key).filter((x) => !touched.has(keyOf(x)))
        for (const { item, index } of [...change.items].sort((a, b) => a.index - b.index)) items.splice(Math.min(Math.max(index, 0), items.length), 0, item as Item)
        next = { ...next, [key]: items }
      }
      return next
    }
    case 'audit':
      return { ...ws, audit: [action.event, ...ws.audit] }
    case 'unaudit':
      return { ...ws, audit: ws.audit.filter((e) => e.id !== action.id) }
    case 'track': {
      const keywords = [...ws.keywords]
      keywords.splice(action.index ?? keywords.length, 0, action.keyword)
      return { ...ws, keywords, mentions: newestFirst([...ws.mentions, ...action.mentions]) }
    }
    case 'untrack':
      return { ...ws, keywords: ws.keywords.filter((k) => k.id !== action.id), mentions: ws.mentions.filter((m) => m.keywordId !== action.id) }
    case 'mentionArrived':
      return { ...ws, mentions: [action.mention, ...ws.mentions] }
    case 'mention':
      return { ...ws, mentions: ws.mentions.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)) }
    case 'mentionToInbox':
      return {
        ...ws,
        conversations: [action.conversation, ...ws.conversations],
        mentions: ws.mentions.map((m) => (m.id === action.id ? { ...m, conversationId: action.conversation.id } : m)),
      }
    case 'notify':
      // Newest first, and only the latest 40 are kept.
      return { ...ws, notices: [...action.notices, ...ws.notices].slice(0, 40) }
    case 'readNotices':
      return {
        ...ws,
        notices: ws.notices.map((n) => {
          if (!action.ids.includes(n.id)) return n
          if (!action.by) return { ...n, read: true }
          return n.readBy?.includes(action.by) ? n : { ...n, readBy: [...(n.readBy ?? []), action.by] }
        }),
      }
    case 'saveMember':
      return { ...ws, team: upsert(ws.team, action.member) }
    case 'removeMember':
      return { ...ws, team: ws.team.filter((m) => m.id !== action.id) }
    case 'saveBrand':
      return { ...ws, brands: upsert(ws.brands, action.brand) }
    case 'settings':
      return { ...ws, settings: { ...ws.settings, ...action.patch } }
    case 'saveMedia':
      return { ...ws, media: [...ws.media.filter((m) => m.seed !== action.asset.seed), action.asset] }
    case 'archive': {
      let next = ws
      for (const [key, ids] of Object.entries(action.lists) as [CollectionKey, string[]][]) {
        if (!(COLLECTIONS as readonly string[]).includes(key) || !ids?.length) continue
        const gone = new Set(ids)
        next = { ...next, [key]: list(next, key).filter((x) => !gone.has(keyOf(x))) }
      }
      return next
    }
    case 'unarchive': {
      let next = ws
      for (const [key, items] of Object.entries(action.lists) as [CollectionKey, unknown[]][]) {
        if (!(COLLECTIONS as readonly string[]).includes(key) || !items?.length) continue
        const back = new Set(items.map(keyOf))
        next = { ...next, [key]: [...list(next, key).filter((x) => !back.has(keyOf(x))), ...(items as Item[])] }
      }
      return next
    }
    case 'load':
      return action.ws
    case 'scope':
      return { ...ws, brandScope: action.brandId }
    case 'signIn': {
      const who = ws.team.find((m) => m.id === action.userId)
      // A brand they can't see falls back to every brand.
      const keep = !ws.brandScope || !who || who.brands === 'all' || who.brands.includes(ws.brandScope)
      return { ...ws, currentUserId: action.userId, signedIn: true, brandScope: keep ? ws.brandScope : null }
    }
    case 'signOut':
      return { ...ws, signedIn: false }
    default:
      return ws
  }
}
