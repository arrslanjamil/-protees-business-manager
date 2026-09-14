import type { VercelRequest, VercelResponse } from '@vercel/node'
import { checkAuthorized, getSupabaseAdmin, normalizeDomain, SHOPIFY_API_VERSION, STORES } from './_shared.js'

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

async function fetchPaidOrders(domain: string, token: string): Promise<ShopifyOrder[]> {
  const orders: ShopifyOrder[] = []
  let url: string | null = `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&financial_status=paid&limit=250`

  while (url) {
    const requestUrl: string = url
    const res: Response = await fetch(requestUrl, { headers: { 'X-Shopify-Access-Token': token } })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`GET ${requestUrl} -> HTTP ${res.status}: ${body.slice(0, 500)}`)
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

  for (const store of STORES) {
    const rawDomain = process.env[store.domainEnv]
    const rawToken = process.env[store.tokenEnv]
    if (!rawDomain || !rawToken) continue // store not configured yet — skip silently
    const domain = normalizeDomain(rawDomain)
    // Defensive: a trailing newline/space from copy-paste makes Shopify
    // reject an otherwise-correct token with the same generic "Invalid
    // API key or access token" error as a genuinely wrong one.
    const token = rawToken.trim()

    try {
      const orders = await fetchPaidOrders(domain, token)
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
