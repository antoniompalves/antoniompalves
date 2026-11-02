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
  /** Originals nobody scheduled are deleted after this many days (light previews stay). */
  keepOriginalDays: number
  meta: { appId: string; appSecret: string; configId: string; version: string }
  threads: { appId: string; appSecret: string }
  linkedin: { clientId: string; clientSecret: string; version: string; organizations: boolean }
  tiktok: { clientKey: string; clientSecret: string; pullPrefixes: string[] }
  google: { clientId: string; clientSecret: string }
  accounts: AccountsConfig
}

/** Sign-in accounts and the shared workspace (docs/ACCOUNTS.md). */
export interface AccountsConfig {
  enabled: boolean
  databaseUrl: string
  /** Where people open Kataru, for the links in emails (defaults to this server when it serves the app). */
  appUrl: string
  /** The built app (`dist`) to serve at /, so the app and the API share one address. */
  staticDir: string
  /** When the app lives under a path, e.g. /kataru. */
  basePath: string
  /** Needed once, on the setup screen; generated and logged when empty. */
  setupCode: string
  cookieSecure: boolean
  trustProxy: boolean
  smtpUrl: string
  mailFrom: string
  /** Email domains whose people may join through single sign-on without an invitation. */
  ssoDomains: string[]
  ssoRole: string
  env: Record<string, string | undefined>
}

const list = (v: string | undefined) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

export function readConfig(env: Record<string, string | undefined> = process.env): Config {
  const e = (k: string, fallback = '') => env[k]?.trim() || fallback
  return {
    // cPanel/Passenger hands the app its port in PORT.
    port: Number(e('PORT', e('PUBLISHER_PORT', '8787'))),
    publicUrl: e('KATARU_PUBLIC_URL', e('PUBLISHER_PUBLIC_URL', `http://localhost:${e('PUBLISHER_PORT', e('PORT', '8787'))}`)).replace(/\/$/, ''),
    appOrigins: list(e('PUBLISHER_APP_ORIGIN', 'http://localhost:5173')),
    apiKey: e('PUBLISHER_API_KEY'),
    secret: e('KATARU_SECRET', e('PUBLISHER_SECRET')),
    dataDir: e('PUBLISHER_DATA_DIR', './.publisher-data'),
    maxMediaBytes: Number(e('PUBLISHER_MAX_MEDIA_MB', '512')) * 1024 * 1024,
    keepOriginalDays: Number(e('PUBLISHER_KEEP_ORIGINAL_DAYS', '30')),
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
    accounts: readAccounts(env),
  }
}

function readAccounts(env: Record<string, string | undefined>): AccountsConfig {
  const e = (k: string, fallback = '') => env[k]?.trim() || fallback
  const publicUrl = e('KATARU_PUBLIC_URL', e('PUBLISHER_PUBLIC_URL', `http://localhost:${e('PUBLISHER_PORT', e('PORT', '8787'))}`)).replace(/\/$/, '')
  const basePath = e('KATARU_BASE_PATH').replace(/\/$/, '')
  const staticDir = e('KATARU_STATIC_DIR')
  const appOrigin = list(e('PUBLISHER_APP_ORIGIN', 'http://localhost:5173'))[0]!
  return {
    enabled: e('KATARU_ACCOUNTS', 'on') !== 'off',
    databaseUrl: e('DATABASE_URL', `sqlite:${e('PUBLISHER_DATA_DIR', './.publisher-data')}/kataru.db`),
    appUrl: e('KATARU_APP_URL', staticDir ? `${publicUrl}${basePath}` : appOrigin).replace(/\/$/, ''),
    staticDir,
    basePath,
    setupCode: e('KATARU_SETUP_CODE'),
    cookieSecure: e('KATARU_COOKIE_SECURE', publicUrl.startsWith('https:') ? 'true' : 'false') === 'true',
    // Behind Apache/Passenger (cPanel) or another proxy, the visitor's address is in X-Forwarded-For.
    trustProxy: e('KATARU_TRUST_PROXY', env.PASSENGER_APP_ENV || env.PASSENGER_BASE_URI !== undefined ? 'true' : 'false') === 'true',
    smtpUrl: e('SMTP_URL'),
    mailFrom: e('MAIL_FROM', 'Kataru <no-reply@localhost>'),
    ssoDomains: list(env.KATARU_SSO_DOMAINS).map((d) => d.toLowerCase().replace(/^@/, '')),
    ssoRole: e('KATARU_SSO_ROLE', 'analyst'),
    env,
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
  // With accounts on, people sign in instead; the API key is only for other services.
  if (c.apiKey ? c.apiKey.length < 24 : !c.accounts.enabled) problems.push('PUBLISHER_API_KEY must be at least 24 characters')
  if (c.secret.length < 32) problems.push('PUBLISHER_SECRET (or KATARU_SECRET) must be at least 32 characters')
  if (!/^https?:\/\//.test(c.publicUrl)) problems.push('PUBLISHER_PUBLIC_URL must be an http(s) URL')
  if (problems.length) throw new Error(`Publisher misconfigured:\n- ${problems.join('\n- ')}`)
}
