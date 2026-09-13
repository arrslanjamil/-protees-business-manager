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
  PaymentType,
  ShopifyOrder,
  ShopifySettings,
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

  refreshAll: () => Promise<void>

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

  const hasLoadedOnceRef = useRef(false)

  const refreshAll = useCallback(async () => {
    if (!appUser) {
      setLoading(false)
      return
    }
    if (!hasLoadedOnceRef.current) setLoading(true)
    setError(null)
    try {
      const [c, cc, ba, bt, ct, cf, cs, so, ss] = await Promise.all([
        supabase.from('couriers').select('*').order('name'),
        supabase.from('courier_collections').select('*').order('invoice_date', { ascending: false }),
        supabase.from('bank_accounts').select('*').order('name'),
        supabase.from('bank_transactions').select('*').order('date', { ascending: false }),
        supabase.from('cash_transactions').select('*').order('date', { ascending: false }),
        supabase.from('cash_transfers').select('*').order('date', { ascending: false }),
        supabase.from('cash_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('shopify_orders').select('*').order('order_date', { ascending: false }),
        supabase.from('shopify_settings').select('*').eq('id', 1).maybeSingle(),
      ])
      const firstError = [c, cc, ba, bt, ct, cf, cs, so, ss].find((r) => r.error)?.error
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
    refreshAll,
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
  }

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>
}

export function useCollections(): CollectionsContextValue {
  const ctx = useContext(CollectionsContext)
  if (!ctx) throw new Error('useCollections must be used within a CollectionsProvider')
  return ctx
}
