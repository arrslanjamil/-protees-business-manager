import type { VercelRequest, VercelResponse } from '@vercel/node'
import { checkAuthorized, exchangeClientCredentials, getSupabaseAdmin, normalizeDomain, SHOPIFY_API_VERSION, STORES } from './_shared.js'

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

/** Start of the current UTC calendar month, as an ISO8601 string — used
 * to scope every sync to "this month" via Shopify's own created_at_min
 * filter (server-side, so we never pull more than we need) rather than
 * fetching full history and filtering client-side. */
function currentMonthStartISO(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

// Hard ceiling regardless of date scoping — protects against an
// unexpectedly large month or a pagination bug looping forever.
const MAX_PAGES = 40

async function fetchPaidOrders(domain: string, accessToken: string, createdAtMin: string): Promise<ShopifyOrder[]> {
  const orders: ShopifyOrder[] = []
  let url: string | null =
    `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&financial_status=paid&limit=250&created_at_min=${encodeURIComponent(createdAtMin)}`
  let page = 0

  console.log(`[shopify-orders:${domain}] Starting sync — orders created at/after ${createdAtMin}, up to ${MAX_PAGES} pages of 250.`)

  while (url) {
    page += 1
    if (page > MAX_PAGES) {
      console.error(`[shopify-orders:${domain}] Hit MAX_PAGES=${MAX_PAGES} safety cap (${orders.length} orders fetched so far) — stopping early.`)
      break
    }

    const requestUrl: string = url
    console.log(`[shopify-orders:${domain}] Page ${page} request -> GET ${requestUrl}`)
    const res: Response = await fetch(requestUrl, { headers: { 'X-Shopify-Access-Token': accessToken } })
    const bodyText = await res.text()
    console.log(`[shopify-orders:${domain}] Page ${page} response status: ${res.status}`)

    if (!res.ok) {
      console.error(`[shopify-orders:${domain}] Page ${page} response body: ${bodyText.slice(0, 500)}`)
      throw new Error(`GET ${requestUrl} -> HTTP ${res.status}: ${bodyText.slice(0, 500)}`)
    }

    const json = JSON.parse(bodyText) as { orders: ShopifyOrder[] }
    orders.push(...json.orders)
    console.log(`[shopify-orders:${domain}] Page ${page}: ${json.orders.length} order(s) this page, ${orders.length} total so far.`)

    const link = res.headers.get('link')
    const nextMatch = link?.match(/<([^>]+)>;\s*rel="next"/)
    url = nextMatch ? nextMatch[1] : null
    console.log(`[shopify-orders:${domain}] Page ${page}: next page_info ${url ? 'present, continuing' : 'absent, done'}.`)
  }

  console.log(`[shopify-orders:${domain}] Finished: ${orders.length} paid order(s) across ${page} page(s).`)
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

  const auth = await checkAuthorized(req)
  if (!auth.ok) {
    res.status(401).json({ error: 'Unauthorized.', reason: auth.reason })
    return
  }

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server misconfigured.' })
    return
  }

  let totalImported = 0
  let storesSynced = 0
  const errors: string[] = []
  const perStoreCounts: string[] = []

  for (const store of STORES) {
    const rawDomain = process.env[store.domainEnv]
    const clientId = process.env[store.clientIdEnv]?.trim()
    const clientSecret = process.env[store.clientSecretEnv]?.trim()
    if (!rawDomain || !clientId || !clientSecret) continue // store not configured yet — skip silently
    const domain = normalizeDomain(rawDomain)

    console.log(`[shopify-sync] Starting store "${store.key}" (${domain}).`)

    try {
      const exchange = await exchangeClientCredentials(domain, clientId, clientSecret)
      if (!exchange.ok || !exchange.accessToken) {
        throw new Error(exchange.error ?? 'Token exchange failed for an unknown reason.')
      }

      const orders = await fetchPaidOrders(domain, exchange.accessToken, currentMonthStartISO())
      const rows = orders.map((o) => mapOrder(o, store.key))

      if (rows.length > 0) {
        const { error: upsertErr } = await admin.from('shopify_orders').upsert(rows, { onConflict: 'shopify_order_id' })
        if (upsertErr) throw new Error(`Supabase upsert failed: ${upsertErr.message}`)
      }

      await admin
        .from('shopify_stores')
        .update({ store_domain: domain, is_connected: true, last_synced_at: new Date().toISOString(), last_sync_error: null })
        .eq('store_key', store.key)

      totalImported += rows.length
      storesSynced += 1
      perStoreCounts.push(`${store.key}: ${rows.length}`)
      console.log(`[shopify-sync] Finished store "${store.key}": ${rows.length} order(s) imported.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown sync error.'
      errors.push(`${store.key}: ${message}`)
      console.error(`[shopify-sync] Store "${store.key}" failed: ${message}`)
      await admin.from('shopify_stores').update({ is_connected: false, last_sync_error: message }).eq('store_key', store.key)
    }
  }

  if (storesSynced === 0 && errors.length === 0) {
    res.status(200).json({ message: 'No Shopify stores are configured yet — add SHOPIFY_*_DOMAIN, SHOPIFY_*_CLIENT_ID and SHOPIFY_*_CLIENT_SECRET in Vercel.' })
    return
  }

  if (errors.length > 0 && storesSynced === 0) {
    res.status(502).json({ error: errors.join(' | ') })
    return
  }

  res.status(200).json({
    message: `Synced ${totalImported} paid order(s) from ${storesSynced} store(s) this month (${perStoreCounts.join(', ')}).${errors.length ? ` Errors: ${errors.join(' | ')}` : ''}`,
  })
}
