import { createHash, createPublicKey, verify } from 'node:crypto'
import type { JsonWebKey } from 'node:crypto'

/**
 * Single sign-on with OpenID Connect: Google Workspace, Microsoft Entra ID
 * (one tenant), or any other OIDC provider (Okta, Auth0, Keycloak…). The
 * browser goes to the provider with a one-time state, a nonce and PKCE; the
 * provider sends back a code, exchanged here for an ID token whose signature,
 * issuer, audience, expiry and nonce are all checked.
 */

export interface SsoProvider {
  id: 'google' | 'microsoft' | 'oidc'
  name: string
  issuer: string
  clientId: string
  clientSecret: string
}

export interface SsoClaims {
  subject: string
  email: string
  name: string
  /** Google Workspace domain, when there is one. */
  domain?: string
}

interface Discovery {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri: string
}

type Fetch = typeof fetch

export class SsoError extends Error {
  code: 'config' | 'denied' | 'token' | 'email'
  constructor(code: SsoError['code'], message: string) {
    super(message)
    this.code = code
  }
}

const b64json = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>

export class Oidc {
  private discovered = new Map<string, { at: number; doc: Discovery }>()
  private keys = new Map<string, { at: number; keys: (JsonWebKey & { kid?: string; alg?: string })[] }>()
  private fetcher: Fetch
  private now: () => number
  constructor(fetcher: Fetch = fetch, now: () => number = Date.now) {
    this.fetcher = fetcher
    this.now = now
  }

  private async json<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await this.fetcher(url, { ...init, signal: AbortSignal.timeout(10_000) })
    const body = (await res.json().catch(() => ({}))) as T & { error?: string; error_description?: string }
    if (!res.ok) throw new SsoError('token', body.error_description || body.error || `HTTP ${res.status} from ${new URL(url).host}`)
    return body
  }

  async discover(p: SsoProvider): Promise<Discovery> {
    const hit = this.discovered.get(p.issuer)
    if (hit && this.now() - hit.at < 3_600_000) return hit.doc
    const doc = await this.json<Discovery>(`${p.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`)
    if (!doc.authorization_endpoint || !doc.token_endpoint || !doc.jwks_uri) throw new SsoError('config', `${p.name}: incomplete OpenID configuration`)
    this.discovered.set(p.issuer, { at: this.now(), doc })
    return doc
  }

  /** Where to send the browser. `challenge` is the PKCE S256 challenge. */
  async authorizeUrl(p: SsoProvider, o: { redirectUri: string; state: string; nonce: string; challenge: string; email?: string }) {
    const d = await this.discover(p)
    const url = new URL(d.authorization_endpoint)
    url.search = new URLSearchParams({
      client_id: p.clientId,
      redirect_uri: o.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: o.state,
      nonce: o.nonce,
      code_challenge: o.challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
      ...(o.email && { login_hint: o.email }),
    }).toString()
    return url.toString()
  }

  /** Swaps the code for an ID token and returns who signed in. */
  async finish(p: SsoProvider, o: { code: string; redirectUri: string; verifier: string; nonce: string }): Promise<SsoClaims> {
    const d = await this.discover(p)
    const token = await this.json<{ id_token?: string }>(d.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: o.code, redirect_uri: o.redirectUri, client_id: p.clientId, client_secret: p.clientSecret, code_verifier: o.verifier }),
    })
    if (!token.id_token) throw new SsoError('token', `${p.name} sent no ID token`)
    const claims = await this.verifyIdToken(p, d, token.id_token, o.nonce)
    return claimsOf(p, claims)
  }

  private async jwks(uri: string, refresh = false) {
    const hit = this.keys.get(uri)
    if (hit && !refresh && this.now() - hit.at < 3_600_000) return hit.keys
    const doc = await this.json<{ keys: (JsonWebKey & { kid?: string })[] }>(uri)
    this.keys.set(uri, { at: this.now(), keys: doc.keys ?? [] })
    return doc.keys ?? []
  }

  async verifyIdToken(p: SsoProvider, d: Discovery, jwt: string, nonce: string) {
    const parts = jwt.split('.')
    if (parts.length !== 3) throw new SsoError('token', 'Malformed ID token')
    const head = b64json(parts[0]!) as { alg?: string; kid?: string }
    const claims = b64json(parts[1]!)
    const alg = head.alg
    if (alg !== 'RS256' && alg !== 'ES256') throw new SsoError('token', `Unsupported ID token algorithm ${alg}`)
    let keys = await this.jwks(d.jwks_uri)
    let jwk = keys.find((k) => k.kid === head.kid)
    // Providers rotate keys: an unknown kid means it's time to fetch them again.
    if (!jwk) {
      keys = await this.jwks(d.jwks_uri, true)
      jwk = keys.find((k) => k.kid === head.kid) ?? (keys.length === 1 ? keys[0] : undefined)
    }
    if (!jwk) throw new SsoError('token', 'ID token signed with an unknown key')
    const key = createPublicKey({ key: jwk, format: 'jwk' })
    const data = Buffer.from(`${parts[0]}.${parts[1]}`)
    const sig = Buffer.from(parts[2]!, 'base64url')
    const ok = alg === 'RS256' ? verify('sha256', data, key, sig) : verify('sha256', data, { key, dsaEncoding: 'ieee-p1363' }, sig)
    if (!ok) throw new SsoError('token', 'ID token signature does not match')
    const now = this.now() / 1000
    const issuer = String(claims.iss ?? '')
    // Google's issuer can come without the scheme.
    const issuers = [d.issuer, p.issuer, ...(p.id === 'google' ? ['accounts.google.com', 'https://accounts.google.com'] : [])]
    if (!issuers.includes(issuer)) throw new SsoError('token', `Unexpected issuer ${issuer}`)
    const aud = claims.aud
    if (!(aud === p.clientId || (Array.isArray(aud) && aud.includes(p.clientId)))) throw new SsoError('token', 'ID token is for another app')
    if (typeof claims.exp !== 'number' || claims.exp < now - 60) throw new SsoError('token', 'ID token expired')
    if (typeof claims.iat === 'number' && claims.iat > now + 300) throw new SsoError('token', 'ID token issued in the future')
    if (claims.nonce !== nonce) throw new SsoError('token', 'ID token nonce does not match')
    return claims
  }
}

function claimsOf(p: SsoProvider, c: Record<string, unknown>): SsoClaims {
  const subject = String(c.sub ?? '')
  // Microsoft puts the work address in preferred_username; within one tenant that is the person's account.
  const email = String(c.email ?? (p.id === 'microsoft' ? (c.preferred_username ?? '') : '')).trim().toLowerCase()
  if (!subject) throw new SsoError('token', 'ID token has no subject')
  if (!email || !email.includes('@')) throw new SsoError('email', `${p.name} didn't share an email address`)
  if (p.id !== 'microsoft' && c.email_verified === false) throw new SsoError('email', `${p.name} hasn't verified ${email}`)
  if (p.id === 'google' && c.email_verified !== true) throw new SsoError('email', `Google hasn't verified ${email}`)
  return { subject, email, name: String(c.name ?? email.split('@')[0]), domain: typeof c.hd === 'string' ? c.hd : undefined }
}

/** The providers configured in the environment. */
export function ssoProviders(env: Record<string, string | undefined>): SsoProvider[] {
  const e = (k: string) => env[k]?.trim() ?? ''
  const out: SsoProvider[] = []
  if (e('KATARU_SSO_GOOGLE_CLIENT_ID') && e('KATARU_SSO_GOOGLE_CLIENT_SECRET'))
    out.push({ id: 'google', name: 'Google', issuer: 'https://accounts.google.com', clientId: e('KATARU_SSO_GOOGLE_CLIENT_ID'), clientSecret: e('KATARU_SSO_GOOGLE_CLIENT_SECRET') })
  const tenant = e('KATARU_SSO_MICROSOFT_TENANT')
  if (tenant && e('KATARU_SSO_MICROSOFT_CLIENT_ID') && e('KATARU_SSO_MICROSOFT_CLIENT_SECRET')) {
    if (['common', 'organizations', 'consumers'].includes(tenant)) throw new Error('KATARU_SSO_MICROSOFT_TENANT must be your tenant ID or domain, not "common"')
    out.push({ id: 'microsoft', name: 'Microsoft', issuer: `https://login.microsoftonline.com/${tenant}/v2.0`, clientId: e('KATARU_SSO_MICROSOFT_CLIENT_ID'), clientSecret: e('KATARU_SSO_MICROSOFT_CLIENT_SECRET') })
  }
  if (e('KATARU_SSO_OIDC_ISSUER') && e('KATARU_SSO_OIDC_CLIENT_ID') && e('KATARU_SSO_OIDC_CLIENT_SECRET'))
    out.push({ id: 'oidc', name: e('KATARU_SSO_OIDC_NAME') || 'SSO', issuer: e('KATARU_SSO_OIDC_ISSUER').replace(/\/$/, ''), clientId: e('KATARU_SSO_OIDC_CLIENT_ID'), clientSecret: e('KATARU_SSO_OIDC_CLIENT_SECRET') })
  return out
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
