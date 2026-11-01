import { COLLECTIONS, keyOf } from './reducer.ts'
import type { CollectionKey } from './reducer.ts'
import { scopeView } from './scope.ts'
import type { Workspace } from './types.ts'

/**
 * How the accounts server tells each browser what changed: per list, the
 * items that are new or different (with where they now stand) and the ones
 * that went; plus any other part (settings, analytics…) that changed, whole.
 * Each person gets the change as it looks from the brands they may see, so a
 * client never receives another brand's posts.
 *
 * Nothing here may import anything but types and other shared files: the
 * server loads this file as is.
 */

export interface ListPatch {
  /** New or changed items, with their index in the new list. */
  put?: { item: unknown; index: number }[]
  /** Items that went (or that this person no longer sees). */
  del?: string[]
  /** The whole order, only when items already there changed places. */
  ids?: string[]
}

export interface Patch {
  lists?: Partial<Record<CollectionKey, ListPatch>>
  set?: Partial<Workspace>
}

/** Fields that belong to one browser, never shared: who is signed in, the brand switcher, the clock. */
const PERSONAL = new Set<keyof Workspace>(['currentUserId', 'brandScope', 'signedIn', 'now'])
const LISTS = new Set<string>(COLLECTIONS)

/** The workspace as one person sees it: only the brands they work on. */
export const viewFor = (ws: Workspace, memberId: string): Workspace => scopeView({ ...ws, currentUserId: memberId, brandScope: null, signedIn: true })

type Item = Record<string, unknown>

function diffList(a: Item[], b: Item[]): ListPatch | null {
  if (a === b) return null
  const was = new Map(a.map((x) => [keyOf(x), x]))
  const now = new Set(b.map((x) => keyOf(x)))
  const put = b.flatMap((item, index) => (was.get(keyOf(item)) === item ? [] : [{ item: item as unknown, index }]))
  const del = a.map((x) => keyOf(x)).filter((id) => !now.has(id))
  // Whether the items in both lists kept their order; if not, the new order goes along.
  const keptA = a.map((x) => keyOf(x)).filter((id) => now.has(id))
  const keptB = b.map((x) => keyOf(x)).filter((id) => was.has(id))
  const moved = keptA.some((id, i) => id !== keptB[i])
  if (!put.length && !del.length && !moved) return null
  return { ...(put.length && { put }), ...(del.length && { del }), ...(moved && { ids: b.map((x) => keyOf(x)) }) }
}

const same = (x: unknown, y: unknown) => x === y || JSON.stringify(x) === JSON.stringify(y)

/** What turns `a` into `b`; null when nothing did. */
export function diff(a: Workspace, b: Workspace): Patch | null {
  if (a === b) return null
  const lists: Patch['lists'] = {}
  const set: Partial<Workspace> = {}
  for (const key of Object.keys(b) as (keyof Workspace)[]) {
    if (PERSONAL.has(key)) continue
    if (LISTS.has(key)) {
      const p = diffList(a[key] as unknown as Item[], b[key] as unknown as Item[])
      if (p) lists[key as CollectionKey] = p
    } else if (!same(a[key], b[key])) Object.assign(set, { [key]: b[key] })
  }
  const out: Patch = {}
  if (Object.keys(lists).length) out.lists = lists
  if (Object.keys(set).length) out.set = set
  return out.lists || out.set ? out : null
}

function applyList(items: Item[], p: ListPatch): Item[] {
  const put = p.put ?? []
  if (p.ids) {
    const byId = new Map(items.map((x) => [keyOf(x), x]))
    for (const { item } of put) byId.set(keyOf(item), item as Item)
    return p.ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
  }
  const gone = new Set(p.del ?? [])
  const changed = new Map(put.map(({ item }) => [keyOf(item), item as Item]))
  const next = items.filter((x) => !gone.has(keyOf(x))).map((x) => changed.get(keyOf(x)) ?? x)
  const have = new Set(next.map((x) => keyOf(x)))
  for (const { item, index } of [...put].sort((x, y) => x.index - y.index)) {
    if (have.has(keyOf(item))) continue
    next.splice(Math.min(index, next.length), 0, item as Item)
  }
  return next
}

export function applyPatch(ws: Workspace, p: Patch): Workspace {
  let next = p.set ? { ...ws, ...p.set } : ws
  for (const [key, lp] of Object.entries(p.lists ?? {}) as [CollectionKey, ListPatch][]) {
    next = { ...next, [key]: applyList(next[key] as unknown as Item[], lp) }
  }
  return next
}
