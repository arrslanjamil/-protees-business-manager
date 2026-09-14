import type { VercelRequest } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export const SHOPIFY_API_VERSION = '2024-10'

export const STORES = [
  { key: 'protees', domainEnv: 'SHOPIFY_PROTEES_DOMAIN', tokenEnv: 'SHOPIFY_PROTEES_TOKEN' },
  { key: 'little_peanuts', domainEnv: 'SHOPIFY_LITTLE_PEANUTS_DOMAIN', tokenEnv: 'SHOPIFY_LITTLE_PEANUTS_TOKEN' },
] as const

export type StoreKey = (typeof STORES)[number]['key']

export function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_URL) must be set.')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
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
