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
  Courier,
  CourierExpectedCollection,
  CourierPayment,
  CourierWithBalance,
  PaymentType,
  ShopifyOrder,
  ShopifySettings,
} from '@/lib/types'

const DEFAULT_CASH_OPENING_BALANCE = 0

interface RecordCourierPaymentInput {
  courierId: number
  amount: number
  paymentDate?: string
  paymentType: PaymentType
  bankAccountId?: number | null
  notes?: string
}

interface RecordCashTransactionInput {
  type: CashTransactionType
  category: string
  amount: number
  date?: string
  bankAccountId?: number | null
  notes?: string
}

interface CollectionsContextValue {
  loading: boolean
  error: string | null

  couriers: Courier[]
  couriersWithBalance: CourierWithBalance[]
  courierExpectedCollections: CourierExpectedCollection[]
  courierPayments: CourierPayment[]

  bankAccounts: BankAccount[]
  bankAccountsWithBalance: BankAccountWithBalance[]
  bankTransactions: BankTransaction[]

  cashTransactions: CashTransaction[]
  cashSettings: CashSettings | null
  cashBalance: number

  shopifyOrders: ShopifyOrder[]
  shopifySettings: ShopifySettings | null

  refreshAll: () => Promise<void>

  addCourier: (name: string) => Promise<Courier>
  addExpectedCollection: (input: { courierId: number; amount: number; date?: string; orderReference?: string; notes?: string }) => Promise<void>
  deleteExpectedCollection: (id: number) => Promise<void>
  recordCourierPayment: (input: RecordCourierPaymentInput) => Promise<void>
  deleteCourierPayment: (id: number) => Promise<void>

  addBankAccount: (name: string) => Promise<BankAccount>
  recordCashTransaction: (input: RecordCashTransactionInput) => Promise<void>
  deleteCashTransaction: (id: number) => Promise<void>
  updateCashOpeningBalance: (amount: number, date?: string) => Promise<void>
}

const CollectionsContext = createContext<CollectionsContextValue | null>(null)

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [couriers, setCouriers] = useState<Courier[]>([])
  const [courierExpectedCollections, setCourierExpectedCollections] = useState<CourierExpectedCollection[]>([])
  const [courierPayments, setCourierPayments] = useState<CourierPayment[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([])
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([])
  const [cashSettings, setCashSettings] = useState<CashSettings | null>(null)
  const [shopifyOrders, setShopifyOrders] = useState<ShopifyOrder[]>([])
  const [shopifySettings, setShopifySettings] = useState<ShopifySettings | null>(null)

  const hasLoadedOnceRef = useRef(false)

  const refreshAll = useCallback(async () => {
    if (!appUser) {
      setLoading(false)
      return
    }
    if (!hasLoadedOnceRef.current) setLoading(true)
    setError(null)
    try {
      const [c, cec, cp, ba, bt, ct, cs, so, ss] = await Promise.all([
        supabase.from('couriers').select('*').order('name'),
        supabase.from('courier_expected_collections').select('*').order('date', { ascending: false }),
        supabase.from('courier_payments').select('*').order('payment_date', { ascending: false }),
        supabase.from('bank_accounts').select('*').order('name'),
        supabase.from('bank_transactions').select('*').order('date', { ascending: false }),
        supabase.from('cash_transactions').select('*').order('date', { ascending: false }),
        supabase.from('cash_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('shopify_orders').select('*').order('order_date', { ascending: false }),
        supabase.from('shopify_settings').select('*').eq('id', 1).maybeSingle(),
      ])
      const firstError = [c, cec, cp, ba, bt, ct, cs, so, ss].find((r) => r.error)?.error
      if (firstError) throw firstError

      setCouriers(c.data ?? [])
      setCourierExpectedCollections(cec.data ?? [])
      setCourierPayments(cp.data ?? [])
      setBankAccounts(ba.data ?? [])
      setBankTransactions(bt.data ?? [])
      setCashTransactions(ct.data ?? [])
      setCashSettings(cs.data ?? null)
      setShopifyOrders(so.data ?? [])
      setShopifySettings(ss.data ?? null)
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

  // --- Computed: Courier balances (Accounts Receivable) -----------------------
  const couriersWithBalance = useMemo<CourierWithBalance[]>(
    () =>
      couriers.map((courier) => {
        const expectedCollection = courierExpectedCollections
          .filter((e) => e.courier_id === courier.id)
          .reduce((s, e) => s + Number(e.amount), 0)
        const payments = courierPayments.filter((p) => p.courier_id === courier.id)
        const paymentsReceived = payments.reduce((s, p) => s + Number(p.amount), 0)
        const lastPaymentDate = payments.reduce<string | null>(
          (latest, p) => (!latest || p.payment_date > latest ? p.payment_date : latest),
          null
        )
        return {
          ...courier,
          expectedCollection,
          paymentsReceived,
          pendingBalance: expectedCollection - paymentsReceived,
          lastPaymentDate,
        }
      }),
    [couriers, courierExpectedCollections, courierPayments]
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

  // --- Couriers ------------------------------------------------------------------
  const addCourier: CollectionsContextValue['addCourier'] = async (name) => {
    const trimmed = name.trim()
    const existing = couriers.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing
    const { data, error: err } = await supabase.from('couriers').insert({ name: trimmed }).select().single()
    if (err) throw err
    await refreshAll()
    return data
  }

  const addExpectedCollection: CollectionsContextValue['addExpectedCollection'] = async ({ courierId, amount, date, orderReference, notes }) => {
    const { error: err } = await supabase.from('courier_expected_collections').insert({
      courier_id: courierId,
      amount,
      date: date ?? todayISO(),
      order_reference: orderReference ?? null,
      notes: notes ?? null,
    })
    if (err) throw err
    await refreshAll()
  }

  const deleteExpectedCollection: CollectionsContextValue['deleteExpectedCollection'] = async (id) => {
    const { error: err } = await supabase.from('courier_expected_collections').delete().eq('id', id)
    if (err) throw err
    await refreshAll()
  }

  /** Recording a courier payment reduces its pending balance (via the
   * expected-minus-received computation above) and simultaneously credits
   * the right money location — a bank (bank_transactions) or the Office
   * Cash ledger (cash_transactions) — in the same action. */
  const recordCourierPayment: CollectionsContextValue['recordCourierPayment'] = async ({
    courierId,
    amount,
    paymentDate,
    paymentType,
    bankAccountId,
    notes,
  }) => {
    const date = paymentDate ?? todayISO()
    const { data: payment, error: payErr } = await supabase
      .from('courier_payments')
      .insert({
        courier_id: courierId,
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
        type: 'credit',
        amount,
        date,
        reference_type: 'courier_payment',
        reference_id: payment.id,
      })
      if (bankErr) throw bankErr
    } else {
      const { error: cashErr } = await supabase.from('cash_transactions').insert({
        type: 'cash_in',
        category: 'Courier Cash Received',
        amount,
        date,
        reference_type: 'courier_payment',
        reference_id: payment.id,
      })
      if (cashErr) throw cashErr
    }

    await refreshAll()
  }

  const deleteCourierPayment: CollectionsContextValue['deleteCourierPayment'] = async (id) => {
    // Linked bank/cash ledger rows reference this payment but have no FK
    // cascade (ledgers are append-only history) — remove them together so
    // deleting a payment doesn't leave a phantom credit/cash-in behind.
    await supabase.from('bank_transactions').delete().eq('reference_type', 'courier_payment').eq('reference_id', id)
    await supabase.from('cash_transactions').delete().eq('reference_type', 'courier_payment').eq('reference_id', id)
    const { error: err } = await supabase.from('courier_payments').delete().eq('id', id)
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

  /** Recording "Bank Withdrawal" as a Cash In category also debits the
   * selected bank, so cash and bank balances move together atomically. */
  const recordCashTransaction: CollectionsContextValue['recordCashTransaction'] = async ({ type, category, amount, date, bankAccountId, notes }) => {
    const txnDate = date ?? todayISO()
    const isWithdrawal = type === 'cash_in' && category === 'Bank Withdrawal'
    const { data: txn, error: err } = await supabase
      .from('cash_transactions')
      .insert({
        type,
        category,
        amount,
        date: txnDate,
        reference_type: isWithdrawal ? 'bank_withdrawal' : 'other',
        bank_account_id: isWithdrawal ? (bankAccountId ?? null) : null,
        notes: notes ?? null,
      })
      .select()
      .single()
    if (err) throw err

    if (isWithdrawal && bankAccountId) {
      const { error: bankErr } = await supabase.from('bank_transactions').insert({
        bank_account_id: bankAccountId,
        type: 'debit',
        amount,
        date: txnDate,
        reference_type: 'cash_withdrawal',
        reference_id: txn.id,
      })
      if (bankErr) throw bankErr
    }

    await refreshAll()
  }

  const deleteCashTransaction: CollectionsContextValue['deleteCashTransaction'] = async (id) => {
    await supabase.from('bank_transactions').delete().eq('reference_type', 'cash_withdrawal').eq('reference_id', id)
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

  const value: CollectionsContextValue = {
    loading,
    error,
    couriers,
    couriersWithBalance,
    courierExpectedCollections,
    courierPayments,
    bankAccounts,
    bankAccountsWithBalance,
    bankTransactions,
    cashTransactions,
    cashSettings,
    cashBalance,
    shopifyOrders,
    shopifySettings,
    refreshAll,
    addCourier,
    addExpectedCollection,
    deleteExpectedCollection,
    recordCourierPayment,
    deleteCourierPayment,
    addBankAccount,
    recordCashTransaction,
    deleteCashTransaction,
    updateCashOpeningBalance,
  }

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>
}

export function useCollections(): CollectionsContextValue {
  const ctx = useContext(CollectionsContext)
  if (!ctx) throw new Error('useCollections must be used within a CollectionsProvider')
  return ctx
}
