import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/**
 * The accounts database: SQLite on a laptop or a small server (a file, no
 * setup), MySQL or MariaDB on shared hosting such as cPanel. Both speak the
 * same few statements through this interface, with `?` placeholders.
 *
 *   DATABASE_URL=sqlite:./.kataru-data/kataru.db
 *   DATABASE_URL=mysql://user:password@localhost:3306/kataru
 */

export type Dialect = 'sqlite' | 'mysql'
export type Param = string | number | null

export interface Db {
  dialect: Dialect
  all<T>(sql: string, params?: Param[]): Promise<T[]>
  get<T>(sql: string, params?: Param[]): Promise<T | undefined>
  run(sql: string, params?: Param[]): Promise<{ changes: number }>
  /** Runs `fn` in a transaction: all of it, or none of it. */
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>
  close(): Promise<void>
}

/** Insert a row, or update it when its key is taken. */
export function upsert(db: Db, table: string, keys: string[], row: Record<string, Param>) {
  const cols = Object.keys(row)
  const rest = cols.filter((c) => !keys.includes(c))
  const marks = cols.map(() => '?').join(', ')
  const sql =
    db.dialect === 'mysql'
      ? `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${marks}) ON DUPLICATE KEY UPDATE ${rest.map((c) => `${c} = VALUES(${c})`).join(', ')}`
      : `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${marks}) ON CONFLICT (${keys.join(', ')}) DO UPDATE SET ${rest.map((c) => `${c} = excluded.${c}`).join(', ')}`
  return db.run(sql, cols.map((c) => row[c]!))
}

/* ───────────── SQLite (node:sqlite, Node 22.13+) ───────────── */

interface SqliteStatement {
  all(...p: Param[]): unknown[]
  get(...p: Param[]): unknown
  run(...p: Param[]): { changes: number | bigint }
}
interface SqliteDatabase {
  prepare(sql: string): SqliteStatement
  exec(sql: string): void
  close(): void
}

async function openSqlite(file: string): Promise<Db> {
  const { DatabaseSync } = (await import('node:sqlite')) as unknown as { DatabaseSync: new (path: string) => SqliteDatabase }
  if (file !== ':memory:') mkdirSync(dirname(resolve(file)), { recursive: true })
  const raw = new DatabaseSync(file)
  raw.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  const cache = new Map<string, SqliteStatement>()
  const stmt = (sql: string) => {
    let s = cache.get(sql)
    if (!s) cache.set(sql, (s = raw.prepare(sql)))
    return s
  }
  // One thing at a time: a transaction holds the line until it ends.
  let line: Promise<unknown> = Promise.resolve()
  const exclusive = <T>(fn: () => Promise<T> | T): Promise<T> => {
    const next = line.then(fn, fn)
    line = next.catch(() => undefined)
    return next
  }
  const direct: Omit<Db, 'tx' | 'close'> = {
    dialect: 'sqlite',
    all: async <T>(sql: string, p: Param[] = []) => stmt(sql).all(...p) as T[],
    get: async <T>(sql: string, p: Param[] = []) => (stmt(sql).get(...p) ?? undefined) as T | undefined,
    run: async (sql: string, p: Param[] = []) => ({ changes: Number(stmt(sql).run(...p).changes) }),
  }
  const inner: Db = { ...direct, tx: (fn) => fn(inner), close: async () => undefined }
  return {
    dialect: 'sqlite',
    all: (sql, p) => exclusive(() => direct.all(sql, p)),
    get: (sql, p) => exclusive(() => direct.get(sql, p)),
    run: (sql, p) => exclusive(() => direct.run(sql, p)),
    tx: (fn) =>
      exclusive(async () => {
        raw.exec('BEGIN IMMEDIATE')
        try {
          const out = await fn(inner)
          raw.exec('COMMIT')
          return out
        } catch (e) {
          raw.exec('ROLLBACK')
          throw e
        }
      }),
    close: () => exclusive(() => raw.close()),
  }
}

/* ───────────── MySQL / MariaDB (mysql2) ───────────── */

interface MysqlConn {
  query(sql: string, params?: Param[]): Promise<[unknown, unknown]>
  beginTransaction(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  release(): void
}
interface MysqlPool {
  query(sql: string, params?: Param[]): Promise<[unknown, unknown]>
  getConnection(): Promise<MysqlConn>
  end(): Promise<void>
}

async function openMysql(url: string): Promise<Db> {
  const mysql = (await import('mysql2/promise')) as unknown as { createPool(o: Record<string, unknown>): MysqlPool }
  const u = new URL(url)
  const pool = mysql.createPool({
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.slice(1)),
    // cPanel's MySQL usually listens on a socket at localhost: `?socket=/var/lib/mysql/mysql.sock`.
    ...(u.searchParams.get('socket') && { socketPath: u.searchParams.get('socket') }),
    ...(u.searchParams.get('ssl') === 'true' && { ssl: {} }),
    charset: 'utf8mb4',
    connectionLimit: Number(u.searchParams.get('pool') ?? 5),
    supportBigNumbers: true,
    bigNumberStrings: false,
    timezone: 'Z',
  })
  const over = (q: MysqlPool | MysqlConn): Omit<Db, 'tx' | 'close'> => ({
    dialect: 'mysql',
    all: async <T>(sql: string, p: Param[] = []) => (await q.query(sql, p))[0] as T[],
    get: async <T>(sql: string, p: Param[] = []) => ((await q.query(sql, p))[0] as T[])[0],
    run: async (sql: string, p: Param[] = []) => ({ changes: Number(((await q.query(sql, p))[0] as { affectedRows?: number }).affectedRows ?? 0) }),
  })
  return {
    ...over(pool),
    async tx(fn) {
      const conn = await pool.getConnection()
      const inner: Db = { ...over(conn), tx: (f) => f(inner), close: async () => undefined }
      try {
        await conn.beginTransaction()
        const out = await fn(inner)
        await conn.commit()
        return out
      } catch (e) {
        await conn.rollback().catch(() => undefined)
        throw e
      } finally {
        conn.release()
      }
    },
    close: () => pool.end(),
  }
}

/* ───────────── schema ───────────── */

/** Tables, oldest first; a migration never changes once released. */
const MIGRATIONS: ((d: Dialect) => string[])[] = [
  (d) => {
    const text = d === 'mysql' ? 'LONGTEXT' : 'TEXT'
    const tail = d === 'mysql' ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : ''
    const index = (name: string, table: string, cols: string) => (d === 'mysql' ? `CREATE INDEX ${name} ON ${table} (${cols})` : `CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${cols})`)
    return [
      `CREATE TABLE IF NOT EXISTS kt_users (
        id VARCHAR(40) NOT NULL PRIMARY KEY,
        member_id VARCHAR(64) NOT NULL UNIQUE,
        email VARCHAR(254) NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        password_hash VARCHAR(255) NULL,
        totp_secret TEXT NULL,
        totp_last BIGINT NULL,
        recovery TEXT NULL,
        password_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
      )${tail}`,
      `CREATE TABLE IF NOT EXISTS kt_sessions (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        user_id VARCHAR(40) NOT NULL,
        stage VARCHAR(8) NOT NULL,
        method VARCHAR(32) NOT NULL,
        created_at BIGINT NOT NULL,
        seen_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        ip VARCHAR(64) NULL,
        agent VARCHAR(255) NULL
      )${tail}`,
      index('kt_sessions_user', 'kt_sessions', 'user_id'),
      `CREATE TABLE IF NOT EXISTS kt_tokens (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        kind VARCHAR(16) NOT NULL,
        user_id VARCHAR(40) NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        used_at BIGINT NULL
      )${tail}`,
      index('kt_tokens_user', 'kt_tokens', 'user_id'),
      `CREATE TABLE IF NOT EXISTS kt_identities (
        provider VARCHAR(32) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        user_id VARCHAR(40) NOT NULL,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (provider, subject)
      )${tail}`,
      `CREATE TABLE IF NOT EXISTS kt_attempts (
        k VARCHAR(255) NOT NULL,
        at BIGINT NOT NULL
      )${tail}`,
      index('kt_attempts_k', 'kt_attempts', 'k'),
      `CREATE TABLE IF NOT EXISTS kt_ephemeral (
        k VARCHAR(100) NOT NULL PRIMARY KEY,
        v TEXT NOT NULL,
        expires_at BIGINT NOT NULL
      )${tail}`,
      `CREATE TABLE IF NOT EXISTS kt_workspace (
        id SMALLINT NOT NULL PRIMARY KEY,
        version BIGINT NOT NULL,
        doc ${text} NOT NULL,
        updated_at BIGINT NOT NULL
      )${tail}`,
      `CREATE TABLE IF NOT EXISTS kt_events (
        version BIGINT NOT NULL PRIMARY KEY,
        user_id VARCHAR(40) NULL,
        at BIGINT NOT NULL,
        actions ${text} NOT NULL
      )${tail}`,
    ]
  },
]

MIGRATIONS.push((d) => {
  const text = d === 'mysql' ? 'LONGTEXT' : 'TEXT'
  const tail = d === 'mysql' ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : ''
  const index = (name: string, table: string, cols: string) => (d === 'mysql' ? `CREATE INDEX ${name} ON ${table} (${cols})` : `CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${cols})`)
  return [
    // Old items out of the live workspace, one row each, searchable.
    `CREATE TABLE IF NOT EXISTS kt_archive (
      list VARCHAR(32) NOT NULL,
      id VARCHAR(100) NOT NULL,
      brand_id VARCHAR(80) NULL,
      at BIGINT NOT NULL,
      title VARCHAR(255) NOT NULL,
      archived_at BIGINT NOT NULL,
      doc ${text} NOT NULL,
      PRIMARY KEY (list, id)
    )${tail}`,
    index('kt_archive_at', 'kt_archive', 'list, at'),
    // Copies of the whole workspace: gzip, base64.
    `CREATE TABLE IF NOT EXISTS kt_backups (
      id VARCHAR(40) NOT NULL PRIMARY KEY,
      kind VARCHAR(16) NOT NULL,
      created_at BIGINT NOT NULL,
      version BIGINT NOT NULL,
      size BIGINT NOT NULL,
      data ${text} NOT NULL
    )${tail}`,
  ]
})

async function migrate(db: Db) {
  await db.run(`CREATE TABLE IF NOT EXISTS kt_meta (k VARCHAR(64) NOT NULL PRIMARY KEY, v TEXT NOT NULL)${db.dialect === 'mysql' ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : ''}`)
  const row = await db.get<{ v: string }>('SELECT v FROM kt_meta WHERE k = ?', ['schema'])
  const at = row ? Number(row.v) : 0
  for (let i = at; i < MIGRATIONS.length; i++) {
    for (const sql of MIGRATIONS[i]!(db.dialect)) {
      // MySQL has no CREATE INDEX IF NOT EXISTS: an index already there (a migration cut short) is fine.
      await db.run(sql).catch((e: Error) => {
        if (!/Duplicate key name/i.test(e.message)) throw e
      })
    }
    await upsert(db, 'kt_meta', ['k'], { k: 'schema', v: String(i + 1) })
  }
}

/** Opens the database at `url` and brings its tables up to date. */
export async function openDb(url: string): Promise<Db> {
  const db = url.startsWith('mysql://') || url.startsWith('mariadb://') ? await openMysql(url.replace(/^mariadb:/, 'mysql:')) : url.startsWith('sqlite:') ? await openSqlite(url.slice(7) || ':memory:') : null
  if (!db) throw new Error(`DATABASE_URL must start with sqlite: or mysql:// (got "${url.split(':')[0]}")`)
  await migrate(db)
  return db
}
