import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Server-side only — this file runs as a Vercel serverless function, never
// shipped to the browser. Shopify Admin API tokens and the Supabase
// service-role key are read from plain (non-VITE_) environment variables,
// which are only visible here.

const STORES = [
  { key: 'protees', domainEnv: 'SHOPIFY_PROTEES_DOMAIN', tokenEnv: 'SHOPIFY_PROTEES_TOKEN' },
  { key: 'little_peanuts', domainEnv: 'SHOPIFY_LITTLE_PEANUTS_DOMAIN', tokenEnv: 'SHOPIFY_LITTLE_PEANUTS_TOKEN' },
] as const

const SHOPIFY_API_VERSION = '2024-10'

interface ShopifyAddress {
  city?: string | null
  phone?: string | null
}

interface ShopifyOrder {
  id: number
  name: string
  created_at: string
  total_price: string
  financial_status: string
  email?: string | null
  phone?: string | null
  payment_gateway_names?: string[]
  customer?: { first_name?: string | null; last_name?: string | null; phone?: string | null; default_address?: ShopifyAddress | null } | null
  shipping_address?: ShopifyAddress | null
}

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_URL) must be set.')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

async function isAuthorized(req: VercelRequest): Promise<boolean> {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return false
  const token = auth.slice('Bearer '.length)

  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically
  // when CRON_SECRET is set — this lets the scheduled sync run without a
  // logged-in user.
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true

  // Otherwise, the request must carry a real app user's Supabase session
  // token (the "Sync Now" button) — verified the same way is_app_user()
  // gates every other write in this app.
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return false
  const supabase = createClient(url, anonKey)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return false

  const admin = getSupabaseAdmin()
  const { data: appUser } = await admin.from('app_users').select('id').eq('id', data.user.id).maybeSingle()
  return !!appUser
}

async function fetchPaidOrders(domain: string, token: string): Promise<ShopifyOrder[]> {
  const orders: ShopifyOrder[] = []
  let url: string | null =
    `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&financial_status=paid&limit=250`

  while (url) {
    const res: Response = await fetch(url, { headers: { 'X-Shopify-Access-Token': token } })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Shopify API error ${res.status}: ${body.slice(0, 300)}`)
    }
    const json = (await res.json()) as { orders: ShopifyOrder[] }
    orders.push(...json.orders)

    const link = res.headers.get('link')
    const nextMatch = link?.match(/<([^>]+)>;\s*rel="next"/)
    url = nextMatch ? nextMatch[1] : null
  }

  return orders
}

function mapOrder(order: ShopifyOrder, storeKey: string) {
  const customerName = [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ').trim() || order.email || null
  const customerPhone = order.customer?.phone ?? order.shipping_address?.phone ?? order.phone ?? null
  const customerCity = order.shipping_address?.city ?? order.customer?.default_address?.city ?? null

  return {
    shopify_order_id: String(order.id),
    order_number: order.name,
    order_date: order.created_at,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_city: customerCity,
    total_amount: Number(order.total_price),
    payment_method: order.payment_gateway_names?.[0] ?? null,
    financial_status: order.financial_status,
    store_key: storeKey,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  if (!(await isAuthorized(req))) {
    res.status(401).json({ error: 'Unauthorized.' })
    return
  }

  const admin = getSupabaseAdmin()
  let totalImported = 0
  let storesSynced = 0
  const errors: string[] = []

  for (const store of STORES) {
    const domain = process.env[store.domainEnv]
    const token = process.env[store.tokenEnv]
    if (!domain || !token) continue // store not configured yet — skip silently

    try {
      const orders = await fetchPaidOrders(domain, token)
      const rows = orders.map((o) => mapOrder(o, store.key))

      if (rows.length > 0) {
        const { error: upsertErr } = await admin.from('shopify_orders').upsert(rows, { onConflict: 'shopify_order_id' })
        if (upsertErr) throw upsertErr
      }

      await admin
        .from('shopify_stores')
        .update({ store_domain: domain, is_connected: true, last_synced_at: new Date().toISOString(), last_sync_error: null })
        .eq('store_key', store.key)

      totalImported += rows.length
      storesSynced += 1
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown sync error.'
      errors.push(`${store.key}: ${message}`)
      await admin.from('shopify_stores').update({ is_connected: false, last_sync_error: message }).eq('store_key', store.key)
    }
  }

  if (storesSynced === 0 && errors.length === 0) {
    res.status(200).json({ message: 'No Shopify stores are configured yet — add SHOPIFY_*_DOMAIN and SHOPIFY_*_TOKEN in Vercel.' })
    return
  }

  if (errors.length > 0 && storesSynced === 0) {
    res.status(502).json({ error: errors.join(' | ') })
    return
  }

  res.status(200).json({
    message: `Synced ${totalImported} paid order(s) from ${storesSynced} store(s).${errors.length ? ` Errors: ${errors.join(' | ')}` : ''}`,
  })
}
