import type { PublishProvider } from '../src/data/publishing.ts'

/** Everything the service reads from the environment (server/.env.example lists it). */
export interface Config {
  port: number
  publicUrl: string
  appOrigins: string[]
  apiKey: string
  secret: string
  dataDir: string
  maxMediaBytes: number
  meta: { appId: string; appSecret: string; configId: string; version: string }
  threads: { appId: string; appSecret: string }
  linkedin: { clientId: string; clientSecret: string; version: string; organizations: boolean }
  tiktok: { clientKey: string; clientSecret: string; pullPrefixes: string[] }
  google: { clientId: string; clientSecret: string }
}

const list = (v: string | undefined) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

export function readConfig(env: Record<string, string | undefined> = process.env): Config {
  const e = (k: string, fallback = '') => env[k]?.trim() || fallback
  return {
    port: Number(e('PUBLISHER_PORT', '8787')),
    publicUrl: e('PUBLISHER_PUBLIC_URL', `http://localhost:${e('PUBLISHER_PORT', '8787')}`).replace(/\/$/, ''),
    appOrigins: list(e('PUBLISHER_APP_ORIGIN', 'http://localhost:5173')),
    apiKey: e('PUBLISHER_API_KEY'),
    secret: e('PUBLISHER_SECRET'),
    dataDir: e('PUBLISHER_DATA_DIR', './.publisher-data'),
    maxMediaBytes: Number(e('PUBLISHER_MAX_MEDIA_MB', '512')) * 1024 * 1024,
    meta: { appId: e('META_APP_ID'), appSecret: e('META_APP_SECRET'), configId: e('META_CONFIG_ID'), version: e('META_GRAPH_VERSION', 'v26.0') },
    threads: { appId: e('THREADS_APP_ID'), appSecret: e('THREADS_APP_SECRET') },
    linkedin: {
      clientId: e('LINKEDIN_CLIENT_ID'),
      clientSecret: e('LINKEDIN_CLIENT_SECRET'),
      version: e('LINKEDIN_VERSION', '202609'),
      organizations: e('LINKEDIN_ORGANIZATIONS') === 'true',
    },
    tiktok: { clientKey: e('TIKTOK_CLIENT_KEY'), clientSecret: e('TIKTOK_CLIENT_SECRET'), pullPrefixes: list(env.TIKTOK_PULL_PREFIXES) },
    google: { clientId: e('GOOGLE_CLIENT_ID'), clientSecret: e('GOOGLE_CLIENT_SECRET') },
  }
}

/** Which sign-ins have credentials. */
export const configured = (c: Config): Record<PublishProvider, boolean> => ({
  meta: !!(c.meta.appId && c.meta.appSecret),
  threads: !!(c.threads.appId && c.threads.appSecret),
  linkedin: !!(c.linkedin.clientId && c.linkedin.clientSecret),
  tiktok: !!(c.tiktok.clientKey && c.tiktok.clientSecret),
  youtube: !!(c.google.clientId && c.google.clientSecret),
})

/** Refuses to start without the two secrets everything else depends on. */
export function assertRunnable(c: Config) {
  const problems: string[] = []
  if (c.apiKey.length < 24) problems.push('PUBLISHER_API_KEY must be at least 24 characters')
  if (c.secret.length < 32) problems.push('PUBLISHER_SECRET must be at least 32 characters')
  if (!/^https?:\/\//.test(c.publicUrl)) problems.push('PUBLISHER_PUBLIC_URL must be an http(s) URL')
  if (problems.length) throw new Error(`Publisher misconfigured:\n- ${problems.join('\n- ')}`)
}
