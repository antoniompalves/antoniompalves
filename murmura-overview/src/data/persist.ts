import { loadSetting, saveSetting } from '../storage'
import type { Workspace } from './types'

/**
 * The workspace is saved per browser ("kataru-workspace") after every change,
 * so posts, conversations, channels and the rest survive a reload. A save
 * only counts for the mock it came from: when the starting data changes
 * shape (a new build), old saves are dropped instead of crashing on fields
 * they don't have.
 */

const NAME = 'workspace'
/** Bump when the saved shape changes without the mock changing. */
const VERSION = 1

export const STORAGE_KEY = `kataru-${NAME}`

interface Saved {
  version: number
  /** Fingerprint of the starting data the save grew from. */
  seed: string
  /** The mock clock when it was saved, so time doesn't run backwards on reload. */
  clock: string
  workspace: Workspace
}

/** FNV-1a over the seed's JSON: cheap, and any edit to the mock changes it. */
export function fingerprint(seed: Workspace) {
  const s = JSON.stringify(seed)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${VERSION}-${(h >>> 0).toString(36)}`
}

/** A saved workspace from this seed, or null (none, another seed, unreadable). */
export function parseSaved(raw: string | null, seed: string): { workspace: Workspace; clock: string } | null {
  if (!raw) return null
  try {
    const saved = JSON.parse(raw) as Saved
    if (saved.version !== VERSION || saved.seed !== seed || !saved.workspace) return null
    return { workspace: saved.workspace, clock: saved.clock }
  } catch {
    return null
  }
}

export const loadWorkspace = (seed: string) => parseSaved(loadSetting(NAME), seed)

/** Saves the workspace; when storage is full or blocked the change only lasts for this visit. */
export function saveWorkspace(workspace: Workspace, seed: string, clock: number) {
  const saved: Saved = { version: VERSION, seed, clock: new Date(clock).toISOString(), workspace }
  saveSetting(NAME, JSON.stringify(saved))
}
