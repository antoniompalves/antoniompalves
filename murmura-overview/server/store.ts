import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { JobStatus, PublishErrorCode, PublishNetwork, PublishPost } from '../src/data/publishing.ts'
import { seal, unseal } from './crypto.ts'
import type { Connection, PublishResult } from './providers/types.ts'

export interface Job {
  id: string
  batchId: string
  accountId: string
  connectionId: string
  network: PublishNetwork
  post: PublishPost
  publishAt: number
  status: JobStatus
  attempts: number
  nextAttemptAt?: number
  ref?: string
  result?: PublishResult
  error?: { code: PublishErrorCode; message: string }
  createdAt: number
  updatedAt: number
}

export interface MediaRecord {
  id: string
  mime: string
  size: number
  createdAt: number
}

interface Data {
  version: 1
  connections: Connection[]
  jobs: Job[]
  media: MediaRecord[]
}

/**
 * Everything the service keeps, in one file encrypted with PUBLISHER_SECRET
 * (tokens never touch the disk in the clear). Writes are serialised and
 * atomic (temp file + rename). One process owns the file.
 */
export class Store {
  data: Data = { version: 1, connections: [], jobs: [], media: [] }
  private file: string
  private key: Buffer
  private writing: Promise<void> = Promise.resolve()

  constructor(dir: string, key: Buffer) {
    this.file = join(dir, 'store.sealed')
    this.key = key
  }

  async load() {
    await mkdir(join(this.file, '..'), { recursive: true })
    try {
      this.data = JSON.parse(unseal(this.key, await readFile(this.file, 'utf8')))
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error(`Can't read ${this.file}: wrong PUBLISHER_SECRET or a damaged file (${(e as Error).message})`)
    }
    return this
  }

  save() {
    const snapshot = seal(this.key, JSON.stringify(this.data))
    this.writing = this.writing.then(async () => {
      await writeFile(`${this.file}.tmp`, snapshot, { mode: 0o600 })
      await rename(`${this.file}.tmp`, this.file)
    })
    return this.writing
  }

  connection(id: string) {
    return this.data.connections.find((c) => c.id === id)
  }

  /** The connection that holds an account, and the account. */
  account(accountId: string) {
    for (const connection of this.data.connections) {
      const account = connection.accounts.find((a) => a.id === accountId)
      if (account) return { connection, account }
    }
    return null
  }

  /** Same person on the same network signing in again replaces their connection. */
  upsert(c: Connection) {
    const i = this.data.connections.findIndex((x) => x.provider === c.provider && x.subject === c.subject)
    if (i >= 0) this.data.connections[i] = { ...c, id: this.data.connections[i].id, createdAt: this.data.connections[i].createdAt }
    else this.data.connections.push(c)
    return this.data.connections[i >= 0 ? i : this.data.connections.length - 1]
  }

  job(id: string) {
    return this.data.jobs.find((j) => j.id === id)
  }

  patchJob(id: string, patch: Partial<Job>) {
    const j = this.job(id)
    if (j) Object.assign(j, patch, { updatedAt: Date.now() })
    return j
  }
}
