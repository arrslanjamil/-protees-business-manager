import type { VercelRequest, VercelResponse } from '@vercel/node'
import { checkAuthorized, exchangeClientCredentials, normalizeDomain, SHOPIFY_API_VERSION, storeConfig } from './_shared.js'

/** Diagnostic endpoint for the "Test Connection" button — runs the same
 * client_credentials token exchange the sync job uses, then (if that
 * succeeds) calls Shopify's `GET /shop.json` plus a paid-order count.
 * Returns the exact token-exchange request/response and the shop-call
 * request URL, response status, and response body either way, so a
 * failure is never a guess. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const auth = await checkAuthorized(req)
  if (!auth.ok) {
    res.status(401).json({ error: 'Unauthorized.', reason: auth.reason })
    return
  }

  const storeKey = typeof req.query.store === 'string' ? req.query.store : Array.isArray(req.query.store) ? req.query.store[0] : ''
  const store = storeConfig(storeKey)
  if (!store) {
    res.status(400).json({ error: `Unknown store "${storeKey}". Expected one of: protees, little_peanuts.` })
    return
  }

  const rawDomain = process.env[store.domainEnv]
  const clientId = process.env[store.clientIdEnv]?.trim()
  const clientSecret = process.env[store.clientSecretEnv]?.trim()
  if (!rawDomain || !clientId || !clientSecret) {
    const missing = !rawDomain ? store.domainEnv : !clientId ? store.clientIdEnv : store.clientSecretEnv
    res.status(200).json({
      ok: false,
      store: storeKey,
      requestUrl: null,
      status: null,
      body: `Missing environment variable: ${missing}. Set it in Vercel -> Settings -> Environment Variables, then redeploy.`,
    })
    return
  }

  const domain = normalizeDomain(rawDomain)

  const exchange = await exchangeClientCredentials(domain, clientId, clientSecret)
  if (!exchange.ok || !exchange.accessToken) {
    res.status(200).json({
      ok: false,
      store: storeKey,
      requestUrl: exchange.log.requestUrl,
      status: exchange.log.status,
      body: exchange.error ?? 'Token exchange failed.',
      tokenExchange: exchange.log,
    })
    return
  }

  const accessToken = exchange.accessToken
  const shopUrl = `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/shop.json`

  try {
    const shopRes = await fetch(shopUrl, { headers: { 'X-Shopify-Access-Token': accessToken } })
    const bodyText = await shopRes.text()

    if (!shopRes.ok) {
      res.status(200).json({
        ok: false,
        store: storeKey,
        requestUrl: shopUrl,
        status: shopRes.status,
        body: bodyText.slice(0, 1000),
        tokenExchange: exchange.log,
      })
      return
    }

    const shopJson = JSON.parse(bodyText) as { shop?: { name?: string; myshopify_domain?: string } }

    const countUrl = `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders/count.json?status=any&financial_status=paid`
    const countRes = await fetch(countUrl, { headers: { 'X-Shopify-Access-Token': accessToken } })
    const countBodyText = await countRes.text()
    const paidOrderCount = countRes.ok ? ((JSON.parse(countBodyText) as { count?: number }).count ?? null) : null

    res.status(200).json({
      ok: true,
      store: storeKey,
      requestUrl: shopUrl,
      status: shopRes.status,
      shopName: shopJson.shop?.name ?? null,
      shopDomain: shopJson.shop?.myshopify_domain ?? null,
      paidOrderCount,
      tokenExchange: exchange.log,
    })
  } catch (err) {
    res.status(200).json({
      ok: false,
      store: storeKey,
      requestUrl: shopUrl,
      status: null,
      body: err instanceof Error ? err.message : 'Network error calling Shopify.',
      tokenExchange: exchange.log,
    })
  }
}
