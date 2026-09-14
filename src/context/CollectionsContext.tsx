import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { todayISO } from '@/lib/utils'
import type {
  BankAccount,
  BankAccountWithBalance,
  BankTransaction,
  CashSettings,
  CashTransaction,
  CashTransactionType,
  CashTransfer,
  Courier,
  CourierCollection,
  CourierWithBalance,
  Creditor,
  CreditorBill,
  CreditorPayment,
  CreditorWithBalance,
  PaymentType,
  ShopifyOrder,
  ShopifySettings,
  ShopifyStore,
} from '@/lib/types'

const DEFAULT_CASH_OPENING_BALANCE = 0

interface AddCourierInput {
  name: string
  paymentMethod: PaymentType
  bankAccountId?: number | null
}

interface AddCourierCollectionInput {
  courierId: number
  invoiceNumber?: string
  invoiceDate?: string
  amount: number
  notes?: string
}

interface RecordCashTransactionInput {
  type: CashTransactionType
  category: string
  amount: number
  date?: string
  notes?: string
}

interface TransferCashToOfficeInput {
  bankAccountId: number
  amount: number
  date?: string
  notes?: string
}

interface AddCreditorInput {
  name: string
  category?: string | null
  contactPerson?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
  openingBalance?: number
}

interface AddCreditorBillInput {
  creditorId: number
  billDate?: string
  amount: number
  description?: string
  referenceNumber?: string
  notes?: string
}

interface AddCreditorPaymentInput {
  creditorId: number
  amount: number
  paymentDate?: string
  paymentType: PaymentType
  bankAccountId?: number | null
  notes?: string
}

export interface ShopifyConnectionTestResult {
  ok: boolean
  store: string
  requestUrl: string | null
  status: number | null
  body?: string | null
  shopName?: string | null
  shopDomain?: string | null
  paidOrderCount?: number | null
  tokenExchange?: {
    requestUrl: string
    requestBody: string
    status: number | null
    responseBody: string | null
  } | null
}

interface CollectionsContextValue {
  loading: boolean
  error: string | null

  couriers: Courier[]
  couriersWithBalance: CourierWithBalance[]
  courierCollections: CourierCollection[]

  bankAccounts: BankAccount[]
  bankAccountsWithBalance: BankAccountWithBalance[]
  bankTransactions: BankTransaction[]

  cashTransactions: CashTransaction[]
  cashTransfers: CashTransfer[]
  cashSettings: CashSettings | null
  cashBalance: number

  shopifyOrders: ShopifyOrder[]
  shopifySettings: ShopifySettings | null
  shopifyStores: ShopifyStore[]
  shopifySyncing: boolean

  creditors: Creditor[]
  creditorsWithBalance: CreditorWithBalance[]
  creditorBills: CreditorBill[]
  creditorPayments: CreditorPayment[]
  totalOutstandingCreditors: number

  refreshAll: () => Promise<void>
  updateShopifyStoreDomain: (storeKey: string, domain: string) => Promise<void>
  syncShopifyNow: () => Promise<{ ok: boolean; message: string }>
  testShopifyConnection: (storeKey: string) => Promise<ShopifyConnectionTestResult>

  addCourier: (input: AddCourierInput) => Promise<Courier>
  updateCourier: (id: number, input: AddCourierInput) => Promise<void>
  addCourierCollection: (input: AddCourierCollectionInput) => Promise<void>
  deleteCourierCollection: (id: number) => Promise<void>

  addBankAccount: (name: string) => Promise<BankAccount>
  recordCashTransaction: (input: RecordCashTransactionInput) => Promise<void>
  deleteCashTransaction: (id: number) => Promise<void>
  updateCashOpeningBalance: (amount: number, date?: string) => Promise<void>
  transferCashToOffice: (input: TransferCashToOfficeInput) => Promise<void>
  deleteCashTransfer: (id: number) => Promise<void>

  addCreditor: (input: AddCreditorInput) => Promise<Creditor>
  updateCreditor: (id: number, input: AddCreditorInput) => Promise<void>
  setCreditorActive: (id: number, isActive: boolean) => Promise<void>
  addCreditorBill: (input: AddCreditorBillInput) => Promise<void>
  deleteCreditorBill: (id: number) => Promise<void>
  addCreditorPayment: (input: AddCreditorPaymentInput) => Promise<void>
  deleteCreditorPayment: (id: number) => Promise<void>
}

const CollectionsContext = createContext<CollectionsContextValue | null>(null)

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [couriers, setCouriers] = useState<Courier[]>([])
  const [courierCollections, setCourierCollections] = useState<CourierCollection[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([])
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([])
  const [cashTransfers, setCashTransfers] = useState<CashTransfer[]>([])
  const [cashSettings, setCashSettings] = useState<CashSettings | null>(null)
  const [shopifyOrders, setShopifyOrders] = useState<ShopifyOrder[]>([])
  const [shopifySettings, setShopifySettings] = useState<ShopifySettings | null>(null)
  const [shopifyStores, setShopifyStores] = useState<ShopifyStore[]>([])
  const [shopifySyncing, setShopifySyncing] = useState(false)
  const [creditors, setCreditors] = useState<Creditor[]>([])
  const [creditorBills, setCreditorBills] = useState<CreditorBill[]>([])
  const [creditorPayments, setCreditorPayments] = useState<CreditorPayment[]>([])

  const hasLoadedOnceRef = useRef(false)

  const refreshAll = useCallback(async () => {
    if (!appUser) {
      setLoading(false)
      return
    }
    if (!hasLoadedOnceRef.current) setLoading(true)
    setError(null)
    try {
      const [c, cc, ba, bt, ct, cf, cs, so, ss, sst, cr, crb, crp] = await Promise.all([
        supabase.from('couriers').select('*').order('name'),
        supabase.from('courier_collections').select('*').order('invoice_date', { ascending: false }),
        supabase.from('bank_accounts').select('*').order('name'),
        supabase.from('bank_transactions').select('*').order('date', { ascending: false }),
        supabase.from('cash_transactions').select('*').order('date', { ascending: false }),
        supabase.from('cash_transfers').select('*').order('date', { ascending: false }),
        supabase.from('cash_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('shopify_orders').select('*').order('order_date', { ascending: false }),
        supabase.from('shopify_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('shopify_stores').select('*').order('store_key'),
        supabase.from('creditors').select('*').order('name'),
        supabase.from('creditor_bills').select('*').order('bill_date', { ascending: false }),
        supabase.from('creditor_payments').select('*').order('payment_date', { ascending: false }),
      ])
      const firstError = [c, cc, ba, bt, ct, cf, cs, so, ss, sst, cr, crb, crp].find((r) => r.error)?.error
      if (firstError) throw firstError

      setCouriers(c.data ?? [])
      setCourierCollections(cc.data ?? [])
      setBankAccounts(ba.data ?? [])
      setBankTransactions(bt.data ?? [])
      setCashTransactions(ct.data ?? [])
      setCashTransfers(cf.data ?? [])
      setCashSettings(cs.data ?? null)
      setShopifyOrders(so.data ?? [])
      setShopifySettings(ss.data ?? null)
      setShopifyStores(sst.data ?? [])
      setCreditors(cr.data ?? [])
      setCreditorBills(crb.data ?? [])
      setCreditorPayments(crp.data ?? [])
      hasLoadedOnceRef.current = true
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load collections data from Supabase.'
      setError(message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.id])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  // --- Computed: Courier collection totals --------------------------------
  const bankNameByIdMap = useMemo(() => new Map(bankAccounts.map((b) => [b.id, b.name])), [bankAccounts])
  const couriersWithBalance = useMemo<CourierWithBalance[]>(
    () =>
      couriers.map((courier) => {
        const collections = courierCollections.filter((c) => c.courier_id === courier.id)
        const totalCollected = collections.reduce((s, c) => s + Number(c.amount), 0)
        const lastCollectionDate = collections.reduce<string | null>(
          (latest, c) => (!latest || c.invoice_date > latest ? c.invoice_date : latest),
          null
        )
        return {
          ...courier,
          bankAccountName: courier.bank_account_id ? bankNameByIdMap.get(courier.bank_account_id) ?? null : null,
          totalCollected,
          collectionCount: collections.length,
          lastCollectionDate,
        }
      }),
    [couriers, courierCollections, bankNameByIdMap]
  )

  // --- Computed: Bank balances --------------------------------------------------
  const bankAccountsWithBalance = useMemo<BankAccountWithBalance[]>(
    () =>
      bankAccounts.map((bank) => {
        const txns = bankTransactions.filter((t) => t.bank_account_id === bank.id)
        const credits = txns.filter((t) => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0)
        const debits = txns.filter((t) => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0)
        return { ...bank, balance: credits - debits }
      }),
    [bankAccounts, bankTransactions]
  )

  // --- Computed: Cash balance ---------------------------------------------------
  const cashBalance = useMemo(() => {
    const opening = cashSettings?.opening_balance ?? DEFAULT_CASH_OPENING_BALANCE
    const cashIn = cashTransactions.filter((t) => t.type === 'cash_in').reduce((s, t) => s + Number(t.amount), 0)
    const cashOut = cashTransactions.filter((t) => t.type === 'cash_out').reduce((s, t) => s + Number(t.amount), 0)
    return opening + cashIn - cashOut
  }, [cashSettings, cashTransactions])

  // --- Computed: Creditor outstanding balances ------------------------------
  // Never stored — same ledger-derivation pattern as advances/couriers:
  // opening balance + sum(bills) - sum(payments), recomputed live.
  const creditorsWithBalance = useMemo<CreditorWithBalance[]>(
    () =>
      creditors.map((creditor) => {
        const bills = creditorBills.filter((b) => b.creditor_id === creditor.id)
        const payments = creditorPayments.filter((p) => p.creditor_id === creditor.id)
        const totalBilled = bills.reduce((s, b) => s + Number(b.amount), 0)
        const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
        const lastActivityDate = [...bills.map((b) => b.bill_date), ...payments.map((p) => p.payment_date)].reduce<string | null>(
          (latest, d) => (!latest || d > latest ? d : latest),
          null
        )
        return {
          ...creditor,
          totalBilled,
          totalPaid,
          outstandingBalance: Number(creditor.opening_balance) + totalBilled - totalPaid,
          lastActivityDate,
        }
      }),
    [creditors, creditorBills, creditorPayments]
  )
  const totalOutstandingCreditors = creditorsWithBalance.reduce((s, c) => s + Math.max(0, c.outstandingBalance), 0)

  // --- Couriers (one-time payment configuration) ---------------------------------
  const addCourier: CollectionsContextValue['addCourier'] = async ({ name, paymentMethod, bankAccountId }) => {
    const trimmed = name.trim()
    const { data, error: err } = await supabase
      .from('couriers')
      .insert({ name: trimmed, payment_method: paymentMethod, bank_account_id: paymentMethod === 'bank_transfer' ? (bankAccountId ?? null) : null })
      .select()
      .single()
    if (err) throw err
    await refreshAll()
    return data
  }

  const updateCourier: CollectionsContextValue['updateCourier'] = async (id, { name, paymentMethod, bankAccountId }) => {
    const { error: err } = await supabase
      .from('couriers')
      .update({ name: name.trim(), payment_method: paymentMethod, bank_account_id: paymentMethod === 'bank_transfer' ? (bankAccountId ?? null) : null })
      .eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  /** Recording a collection automatically posts to the courier's
   * configured money location — a bank credit or a cash-in — no
   * per-entry bank/payment-type selection needed. */
  const addCourierCollection: CollectionsContextValue['addCourierCollection'] = async ({ courierId, invoiceNumber, invoiceDate, amount, notes }) => {
    const courier = couriers.find((c) => c.id === courierId)
    if (!courier) throw new Error('Select a courier.')
    const date = invoiceDate ?? todayISO()

    const { data: collection, error: collErr } = await supabase
      .from('courier_collections')
      .insert({ courier_id: courierId, invoice_number: invoiceNumber ?? null, invoice_date: date, amount, notes: notes ?? null })
      .select()
      .single()
    if (collErr) throw collErr

    if (courier.payment_method === 'bank_transfer' && courier.bank_account_id) {
      const { error: bankErr } = await supabase.from('bank_transactions').insert({
        bank_account_id: courier.bank_account_id,
        type: 'credit',
        amount,
        date,
        reference_type: 'courier_collection',
        reference_id: collection.id,
      })
      if (bankErr) throw bankErr
    } else {
      const { error: cashErr } = await supabase.from('cash_transactions').insert({
        type: 'cash_in',
        category: 'Courier Cash Collection',
        amount,
        date,
        reference_type: 'courier_collection',
        reference_id: collection.id,
      })
      if (cashErr) throw cashErr
    }

    await refreshAll()
  }

  const deleteCourierCollection: CollectionsContextValue['deleteCourierCollection'] = async (id) => {
    await supabase.from('bank_transactions').delete().eq('reference_type', 'courier_collection').eq('reference_id', id)
    await supabase.from('cash_transactions').delete().eq('reference_type', 'courier_collection').eq('reference_id', id)
    const { error: err } = await supabase.from('courier_collections').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  // --- Bank accounts ---------------------------------------------------------
  const addBankAccount: CollectionsContextValue['addBankAccount'] = async (name) => {
    const trimmed = name.trim()
    const existing = bankAccounts.find((b) => b.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing
    const { data, error: err } = await supabase.from('bank_accounts').insert({ name: trimmed }).select().single()
    if (err) throw err
    await refreshAll()
    return data
  }

  /** Manual Cash In / Cash Out — for entries with no dedicated flow of
   * their own (bank-to-cash movements use transferCashToOffice; expenses
   * post their own linked cash-out automatically). */
  const recordCashTransaction: CollectionsContextValue['recordCashTransaction'] = async ({ type, category, amount, date, notes }) => {
    const { error: err } = await supabase.from('cash_transactions').insert({
      type,
      category,
      amount,
      date: date ?? todayISO(),
      reference_type: 'other',
      notes: notes ?? null,
    })
    if (err) throw err
    await refreshAll()
  }

  const deleteCashTransaction: CollectionsContextValue['deleteCashTransaction'] = async (id) => {
    const { error: err } = await supabase.from('cash_transactions').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  const updateCashOpeningBalance: CollectionsContextValue['updateCashOpeningBalance'] = async (amount, date) => {
    const { error: err } = await supabase
      .from('cash_settings')
      .upsert({ id: 1, opening_balance: amount, opening_date: date ?? todayISO(), updated_at: new Date().toISOString() })
    if (err) throw err
    await refreshAll()
  }

  /** Transfer Cash To Office — moves money from a bank account into
   * Office Cash. Debits the bank, credits cash, atomically. */
  const transferCashToOffice: CollectionsContextValue['transferCashToOffice'] = async ({ bankAccountId, amount, date, notes }) => {
    const txnDate = date ?? todayISO()
    const { data: transfer, error: transferErr } = await supabase
      .from('cash_transfers')
      .insert({ bank_account_id: bankAccountId, amount, date: txnDate, notes: notes ?? null })
      .select()
      .single()
    if (transferErr) throw transferErr

    const { error: bankErr } = await supabase.from('bank_transactions').insert({
      bank_account_id: bankAccountId,
      type: 'debit',
      amount,
      date: txnDate,
      reference_type: 'cash_transfer',
      reference_id: transfer.id,
    })
    if (bankErr) throw bankErr

    const { error: cashErr } = await supabase.from('cash_transactions').insert({
      type: 'cash_in',
      category: 'Bank Transfer to Office',
      amount,
      date: txnDate,
      reference_type: 'cash_transfer',
      reference_id: transfer.id,
      bank_account_id: bankAccountId,
    })
    if (cashErr) throw cashErr

    await refreshAll()
  }

  const deleteCashTransfer: CollectionsContextValue['deleteCashTransfer'] = async (id) => {
    await supabase.from('bank_transactions').delete().eq('reference_type', 'cash_transfer').eq('reference_id', id)
    await supabase.from('cash_transactions').delete().eq('reference_type', 'cash_transfer').eq('reference_id', id)
    const { error: err } = await supabase.from('cash_transfers').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  // --- Creditors & Supplier Ledger ------------------------------------------
  const addCreditor: CollectionsContextValue['addCreditor'] = async ({ name, category, contactPerson, phone, address, notes, openingBalance }) => {
    const { data, error: err } = await supabase
      .from('creditors')
      .insert({
        name: name.trim(),
        category: category ?? null,
        contact_person: contactPerson ?? null,
        phone: phone ?? null,
        address: address ?? null,
        notes: notes ?? null,
        opening_balance: openingBalance ?? 0,
      })
      .select()
      .single()
    if (err) throw err
    await refreshAll()
    return data
  }

  const updateCreditor: CollectionsContextValue['updateCreditor'] = async (id, { name, category, contactPerson, phone, address, notes, openingBalance }) => {
    const { error: err } = await supabase
      .from('creditors')
      .update({
        name: name.trim(),
        category: category ?? null,
        contact_person: contactPerson ?? null,
        phone: phone ?? null,
        address: address ?? null,
        notes: notes ?? null,
        opening_balance: openingBalance ?? 0,
      })
      .eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  const setCreditorActive: CollectionsContextValue['setCreditorActive'] = async (id, isActive) => {
    const { error: err } = await supabase.from('creditors').update({ is_active: isActive }).eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  /** A bill increases what the business owes — no cash/bank movement. */
  const addCreditorBill: CollectionsContextValue['addCreditorBill'] = async ({ creditorId, billDate, amount, description, referenceNumber, notes }) => {
    const { error: err } = await supabase.from('creditor_bills').insert({
      creditor_id: creditorId,
      bill_date: billDate ?? todayISO(),
      amount,
      description: description ?? null,
      reference_number: referenceNumber ?? null,
      notes: notes ?? null,
    })
    if (err) throw err
    await refreshAll()
  }

  const deleteCreditorBill: CollectionsContextValue['deleteCreditorBill'] = async (id) => {
    const { error: err } = await supabase.from('creditor_bills').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  /** A payment reduces what the business owes AND posts a matching
   * cash-out (Office Cash) or bank debit — the chosen payment method is
   * per-payment, not fixed on the creditor (unlike couriers, where WE
   * receive money on a fixed configured channel; here WE choose how to
   * pay each time). */
  const addCreditorPayment: CollectionsContextValue['addCreditorPayment'] = async ({ creditorId, amount, paymentDate, paymentType, bankAccountId, notes }) => {
    const date = paymentDate ?? todayISO()
    const { data: payment, error: payErr } = await supabase
      .from('creditor_payments')
      .insert({
        creditor_id: creditorId,
        amount,
        payment_date: date,
        payment_type: paymentType,
        bank_account_id: paymentType === 'bank_transfer' ? (bankAccountId ?? null) : null,
        notes: notes ?? null,
      })
      .select()
      .single()
    if (payErr) throw payErr

    if (paymentType === 'bank_transfer' && bankAccountId) {
      const { error: bankErr } = await supabase.from('bank_transactions').insert({
        bank_account_id: bankAccountId,
        type: 'debit',
        amount,
        date,
        reference_type: 'creditor_payment',
        reference_id: payment.id,
      })
      if (bankErr) throw bankErr
    } else {
      const { error: cashErr } = await supabase.from('cash_transactions').insert({
        type: 'cash_out',
        category: 'Creditor Payment',
        amount,
        date,
        reference_type: 'creditor_payment',
        reference_id: payment.id,
      })
      if (cashErr) throw cashErr
    }

    await refreshAll()
  }

  const deleteCreditorPayment: CollectionsContextValue['deleteCreditorPayment'] = async (id) => {
    await supabase.from('bank_transactions').delete().eq('reference_type', 'creditor_payment').eq('reference_id', id)
    await supabase.from('cash_transactions').delete().eq('reference_type', 'creditor_payment').eq('reference_id', id)
    const { error: err } = await supabase.from('creditor_payments').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  // --- Shopify (multi-store) ---------------------------------------------------
  // Store domain is not secret — it can be edited from the client. Access
  // tokens are never stored here; they live only in server-only Vercel env
  // vars, read by /api/shopify-sync.
  const updateShopifyStoreDomain: CollectionsContextValue['updateShopifyStoreDomain'] = async (storeKey, domain) => {
    const { error: err } = await supabase.from('shopify_stores').update({ store_domain: domain.trim() || null }).eq('store_key', storeKey)
    if (err) throw err
    await refreshAll()
  }

  /** Calls the server-side sync function, authenticated as the current app
   * user (verified server-side against app_users, mirroring is_app_user()).
   * The function fetches paid orders from every store with credentials
   * configured in Vercel and upserts them into shopify_orders. */
  const syncShopifyNow: CollectionsContextValue['syncShopifyNow'] = async () => {
    setShopifySyncing(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) return { ok: false, message: 'Not signed in.' }

      const res = await fetch('/api/shopify-sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const rawBody = await res.text()
      const body = (() => {
        try {
          return JSON.parse(rawBody)
        } catch {
          return null
        }
      })()
      await refreshAll()
      if (!res.ok) {
        // A non-JSON body means the request never reached our function at
        // all (a platform/routing 404, an HTML error page, etc.) — surface
        // that distinctly instead of a generic message, since it points to
        // a deployment/domain issue rather than a Shopify credentials one.
        const base = body?.error ?? (rawBody ? rawBody.slice(0, 200) : `HTTP ${res.status} with an empty body`)
        const detail = body?.reason ? `${base} — ${body.reason}` : base
        return { ok: false, message: `Sync failed (${res.status}): ${detail}` }
      }
      return { ok: true, message: body?.message ?? 'Sync complete.' }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Sync failed.' }
    } finally {
      setShopifySyncing(false)
    }
  }

  /** Calls /api/shopify-test-connection for one store — a lightweight
   * GET /shop.json + paid-order count, returning the exact request URL,
   * response status, and body either way. Used by the "Test Connection"
   * button so a failure is never a guess. */
  const testShopifyConnection: CollectionsContextValue['testShopifyConnection'] = async (storeKey) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return { ok: false, store: storeKey, requestUrl: null, status: null, body: 'Not signed in.' }

    try {
      const res = await fetch(`/api/shopify-test-connection?store=${encodeURIComponent(storeKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const rawBody = await res.text()
      let parsed: Record<string, unknown> | null = null
      try {
        parsed = JSON.parse(rawBody)
      } catch {
        parsed = null
      }

      if (!parsed) {
        return {
          ok: false,
          store: storeKey,
          requestUrl: `/api/shopify-test-connection?store=${storeKey}`,
          status: res.status,
          body: rawBody ? rawBody.slice(0, 500) : `HTTP ${res.status} with an empty (non-JSON) body — the request likely never reached the function.`,
        }
      }

      // The endpoint's own 401/405 responses ({ error, reason }) don't
      // match ShopifyConnectionTestResult's shape (no `ok`/`store` field)
      // — normalize so the reason is never silently dropped.
      if (typeof parsed.ok !== 'boolean') {
        const base = typeof parsed.error === 'string' ? parsed.error : `HTTP ${res.status}`
        const reason = typeof parsed.reason === 'string' ? ` — ${parsed.reason}` : ''
        return { ok: false, store: storeKey, requestUrl: `/api/shopify-test-connection?store=${storeKey}`, status: res.status, body: `${base}${reason}` }
      }

      return parsed as unknown as ShopifyConnectionTestResult
    } catch (err) {
      return { ok: false, store: storeKey, requestUrl: null, status: null, body: err instanceof Error ? err.message : 'Network error.' }
    }
  }

  const value: CollectionsContextValue = {
    loading,
    error,
    couriers,
    couriersWithBalance,
    courierCollections,
    bankAccounts,
    bankAccountsWithBalance,
    bankTransactions,
    cashTransactions,
    cashTransfers,
    cashSettings,
    cashBalance,
    shopifyOrders,
    shopifySettings,
    shopifyStores,
    shopifySyncing,
    creditors,
    creditorsWithBalance,
    creditorBills,
    creditorPayments,
    totalOutstandingCreditors,
    refreshAll,
    updateShopifyStoreDomain,
    syncShopifyNow,
    testShopifyConnection,
    addCourier,
    updateCourier,
    addCourierCollection,
    deleteCourierCollection,
    addBankAccount,
    recordCashTransaction,
    deleteCashTransaction,
    updateCashOpeningBalance,
    transferCashToOffice,
    deleteCashTransfer,
    addCreditor,
    updateCreditor,
    setCreditorActive,
    addCreditorBill,
    deleteCreditorBill,
    addCreditorPayment,
    deleteCreditorPayment,
  }

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>
}

export function useCollections(): CollectionsContextValue {
  const ctx = useContext(CollectionsContext)
  if (!ctx) throw new Error('useCollections must be used within a CollectionsProvider')
  return ctx
}
