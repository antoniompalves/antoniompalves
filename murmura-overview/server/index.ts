import { createServer } from 'node:http'
import { buildProviders, createHandler } from './app.ts'
import { assertRunnable, configured, readConfig } from './config.ts'
import { keyFrom } from './crypto.ts'
import { MediaLibrary } from './media.ts'
import { startScheduler } from './publish.ts'
import { Store } from './store.ts'

/** Kataru's publishing service: `npm run publisher` (reads server/.env). See docs/PUBLISHING.md. */
const config = readConfig()
assertRunnable(config)
const store = await new Store(config.dataDir, keyFrom(config.secret)).load()
const providers = buildProviders(config)
const media = new MediaLibrary(config.dataDir, store, config.publicUrl, config.maxMediaBytes)
const deps = { store, providers, media }
const scheduler = startScheduler(deps)
const server = createServer(createHandler(config, deps))

server.listen(config.port, () => {
  const on = Object.entries(configured(config))
    .map(([p, ok]) => `${p} ${ok ? '✓' : '·'}`)
    .join('  ')
  console.log(`Kataru publisher on :${config.port} (public ${config.publicUrl})\n  ${on}`)
})

const stop = () => {
  scheduler.stop()
  server.close(() => process.exit(0))
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
