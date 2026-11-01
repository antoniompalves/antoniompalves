import { createServer } from 'node:http'
import { buildProviders, createHandler } from './app.ts'
import { assertRunnable, configured, readConfig } from './config.ts'
import { keyFrom } from './crypto.ts'
import { openDb } from './db.ts'
import { createKataru } from './kataru.ts'
import { MediaLibrary } from './media.ts'
import { startScheduler } from './publish.ts'
import { Store } from './store.ts'

/**
 * Kataru's server: sign-in accounts and the shared workspace (docs/ACCOUNTS.md),
 * the publishing service (docs/PUBLISHING.md) and, with KATARU_STATIC_DIR, the
 * app itself. `npm run server` reads server/.env.
 */
const config = readConfig()
assertRunnable(config)
const store = await new Store(config.dataDir, keyFrom(config.secret)).load()
const providers = buildProviders(config)
const media = new MediaLibrary(config.dataDir, store, `${config.publicUrl}${config.accounts.basePath}`, config.maxMediaBytes)
const db = config.accounts.enabled ? await openDb(config.accounts.databaseUrl) : null
const kataru = db ? await createKataru(config, { db }) : undefined
const deps = { store, providers, media, kataru }
const scheduler = startScheduler(deps)
const server = createServer(createHandler(config, deps))

server.listen(config.port, () => {
  const on = Object.entries(configured(config))
    .map(([p, ok]) => `${p} ${ok ? '✓' : '·'}`)
    .join('  ')
  const accounts = db ? `accounts on ${db.dialect}${config.accounts.staticDir ? ', serving the app' : ''}` : 'accounts off'
  console.log(`Kataru server on :${config.port} (public ${config.publicUrl}) — ${accounts}\n  publishing: ${on}`)
})

const stop = () => {
  scheduler.stop()
  server.close(() => void (async () => {
    await kataru?.close()
    await db?.close()
    process.exit(0)
  })())
  // Live connections (SSE) don't block shutting down for long.
  setTimeout(() => process.exit(0), 3000).unref()
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
