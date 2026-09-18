import type { VercelRequest } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export const SHOPIFY_API_VERSION = '2024-10'

// Shopify Dev Dashboard ("client credentials") apps — no static Admin API
// token. Each store's Client ID + Client Secret are exchanged for a short
// access token per request via the OAuth client_credentials grant.
export const STORES = [
  {
    key: 'protees',
    domainEnv: 'SHOPIFY_PROTEES_DOMAIN',
    clientIdEnv: 'SHOPIFY_PROTEES_CLIENT_ID',
    clientSecretEnv: 'SHOPIFY_PROTEES_CLIENT_SECRET',
  },
  {
    key: 'little_peanuts',
    domainEnv: 'SHOPIFY_LITTLE_PEANUTS_DOMAIN',
    clientIdEnv: 'SHOPIFY_LITTLE_PEANUTS_CLIENT_ID',
    clientSecretEnv: 'SHOPIFY_LITTLE_PEANUTS_CLIENT_SECRET',
  },
] as const

export type StoreKey = (typeof STORES)[number]['key']

export function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_URL) must be set.')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

/** Cheaply checks whether specific columns exist on a table by probing
 * each with a trivial `select(col).limit(1)` — cheaper and more reliable
 * than a system-catalog query (which PostgREST doesn't expose by
 * default). Used to validate schema *before* a sync starts (so a missing
 * migration fails fast with a clear message instead of mid-sync with a
 * cryptic PostgREST error), and to build write payloads that only
 * include columns the live database actually has, so an optional field
 * from a not-yet-run migration degrades gracefully instead of failing
 * the whole sync. */
export async function detectAvailableColumns(
  admin: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  candidateColumns: readonly string[]
): Promise<{ available: string[]; missing: string[] }> {
  const available: string[] = []
  const missing: string[] = []
  await Promise.all(
    candidateColumns.map(async (col) => {
      const { error } = await admin.from(table).select(col).limit(1)
      if (error) missing.push(col)
      else available.push(col)
    })
  )
  return { available, missing }
}

/** Authorizes a request either as the scheduled Vercel Cron (Bearer
 * CRON_SECRET) or as a logged-in app user (Bearer <supabase access token>,
 * checked against app_users — mirrors is_app_user()). Returns a reason
 * string on failure so the caller can log/return exactly why. */
export async function checkAuthorized(req: VercelRequest): Promise<{ ok: true } | { ok: false; reason: string }> {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return { ok: false, reason: 'No Authorization: Bearer header on the request.' }
  const token = auth.slice('Bearer '.length)

  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return { ok: true }

  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return { ok: false, reason: 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set on the server.' }

  const supabase = createClient(url, anonKey)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return { ok: false, reason: `Supabase session token invalid or expired: ${error?.message ?? 'no user'}.` }

  const admin = getSupabaseAdmin()
  const { data: appUser } = await admin.from('app_users').select('id').eq('id', data.user.id).maybeSingle()
  if (!appUser) return { ok: false, reason: 'Signed-in user is not an app_users row (not is_app_user()).' }
  return { ok: true }
}

export function storeConfig(storeKey: string) {
  return STORES.find((s) => s.key === storeKey) ?? null
}

/** Normalizes whatever was pasted into the Vercel env var (with or
 * without a protocol/trailing slash/path) down to a bare host, so a
 * pasted "https://protees.myshopify.com/" doesn't produce a malformed
 * "https://https://..." request URL. */
export function normalizeDomain(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '')
}

function mask(secret: string): string {
  if (secret.length <= 10) return '***'
  return `${secret.slice(0, 6)}…${secret.slice(-4)} (${secret.length} chars)`
}

export interface TokenExchangeLog {
  requestUrl: string
  requestBody: string
  status: number | null
  responseBody: string | null
}

export interface TokenExchangeResult {
  ok: boolean
  accessToken?: string
  scope?: string
  error?: string
  log: TokenExchangeLog
}

/** Exchanges a Dev Dashboard app's Client ID + Client Secret for a fresh
 * Admin API access token via Shopify's OAuth client_credentials grant —
 * the app is installed on the target store but has no static token, so
 * this runs before every sync/test call. Logs each step (request, status,
 * response) with secrets masked, both to console (Vercel function logs)
 * and in the returned `log` so the caller can surface it directly in the
 * UI without needing Vercel log access. */
export async function exchangeClientCredentials(domain: string, clientId: string, clientSecret: string): Promise<TokenExchangeResult> {
  const requestUrl = `https://${domain}/admin/oauth/access_token`
  const maskedBody = `grant_type=client_credentials&client_id=${mask(clientId)}&client_secret=${mask(clientSecret)}`
  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }).toString()

  console.log(`[shopify-auth:${domain}] Token request -> POST ${requestUrl}`)
  console.log(`[shopify-auth:${domain}] Token request body (masked): ${maskedBody}`)

  try {
    const res = await fetch(requestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    })
    const rawText = await res.text()
    console.log(`[shopify-auth:${domain}] Token response status: ${res.status}`)
    console.log(`[shopify-auth:${domain}] Token response body: ${rawText.slice(0, 500)}`)

    if (!res.ok) {
      return {
        ok: false,
        error: `Token exchange failed: POST ${requestUrl} -> HTTP ${res.status}: ${rawText.slice(0, 500)}`,
        log: { requestUrl, requestBody: maskedBody, status: res.status, responseBody: rawText.slice(0, 500) },
      }
    }

    let json: { access_token?: string; scope?: string }
    try {
      json = JSON.parse(rawText)
    } catch {
      return {
        ok: false,
        error: `Token exchange returned a non-JSON body: ${rawText.slice(0, 300)}`,
        log: { requestUrl, requestBody: maskedBody, status: res.status, responseBody: rawText.slice(0, 500) },
      }
    }

    if (!json.access_token) {
      return {
        ok: false,
        error: `Token exchange response had no access_token field: ${rawText.slice(0, 500)}`,
        log: { requestUrl, requestBody: maskedBody, status: res.status, responseBody: rawText.slice(0, 500) },
      }
    }

    console.log(`[shopify-auth:${domain}] Access token received: ${mask(json.access_token)}, scope=${json.scope ?? '(none returned)'}`)

    return {
      ok: true,
      accessToken: json.access_token,
      scope: json.scope,
      log: {
        requestUrl,
        requestBody: maskedBody,
        status: res.status,
        responseBody: `access_token=${mask(json.access_token)}, scope=${json.scope ?? '(none returned)'}`,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error during token exchange.'
    console.error(`[shopify-auth:${domain}] Token exchange threw: ${message}`)
    return { ok: false, error: message, log: { requestUrl, requestBody: maskedBody, status: null, responseBody: null } }
  }
}
