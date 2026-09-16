import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRightLeft,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Landmark,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  ShoppingBag,
  Truck,
  Wallet,
  XCircle,
} from 'lucide-react'
import { useCollections, type ShopifyConnectionTestResult } from '@/context/CollectionsContext'
import { useToast } from '@/context/ToastContext'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection'
import { BankLogo } from '@/components/collections/BankLogo'
import { CollectionsDetailPanel, type CollectionsDetailRow } from '@/components/collections/CollectionsDetailPanel'
import { PAYMENT_TYPE_LABELS, type Courier, type PaymentType } from '@/lib/types'
import { classNames, dashboardDateRange, formatCurrency, formatDate, isWithinRange, todayISO, type DashboardDatePreset } from '@/lib/utils'

type DetailSelection =
  | { kind: 'total-collections' }
  | { kind: 'courier-collections' }
  | { kind: 'shopify-collections' }
  | { kind: 'office-cash' }
  | { kind: 'total-bank' }
  | { kind: 'courier'; id: number }
  | { kind: 'bank'; id: number }
  | { kind: 'shopify-store'; key: string }

function selectionKey(s: DetailSelection | null): string | null {
  if (!s) return null
  if (s.kind === 'courier') return `courier-${s.id}`
  if (s.kind === 'bank') return `bank-${s.id}`
  if (s.kind === 'shopify-store') return `store-${s.key}`
  return s.kind
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function CollectionsPage() {
  const {
    couriers,
    couriersWithBalance,
    courierCollections,
    bankAccountsWithBalance,
    bankTransactions,
    cashTransactions,
    cashBalance,
    shopifyOrders,
    shopifyStores,
    shopifySyncing,
    addCourier,
    updateCourier,
    addCourierCollection,
    deleteCourierCollection,
    addBankAccount,
    transferCashToOffice,
    updateShopifyStoreDomain,
    syncShopifyNow,
    testShopifyConnection,
  } = useCollections()
  const { showToast } = useToast()

  const [preset, setPreset] = useState<DashboardDatePreset>('monthly')
  const [customStart, setCustomStart] = useState<string>(() => dashboardDateRange('15d').start)
  const [customEnd, setCustomEnd] = useState<string>(() => dashboardDateRange('15d').end)
  const { start, end } = useMemo(() => dashboardDateRange(preset, customStart, customEnd), [preset, customStart, customEnd])

  const periodCourierCollections = useMemo(
    () => courierCollections.filter((c) => isWithinRange(c.invoice_date, start, end)),
    [courierCollections, start, end]
  )
  const courierCollectionsTotal = periodCourierCollections.reduce((s, c) => s + Number(c.amount), 0)
  const periodShopifyOrders = useMemo(
    () => shopifyOrders.filter((o) => isWithinRange(o.order_date.slice(0, 10), start, end)),
    [shopifyOrders, start, end]
  )
  const shopifyCollectionsTotal = periodShopifyOrders.reduce((s, o) => s + Number(o.total_amount), 0)
  const totalCollections = courierCollectionsTotal + shopifyCollectionsTotal
  const totalBankBalance = useMemo(() => bankAccountsWithBalance.reduce((s, b) => s + b.balance, 0), [bankAccountsWithBalance])

  const courierNameById = useMemo(() => new Map(couriers.map((c) => [c.id, c.name])), [couriers])
  const bankNameById = useMemo(() => new Map(bankAccountsWithBalance.map((b) => [b.id, b.name])), [bankAccountsWithBalance])
  const storeNameByKey = useMemo(() => new Map(shopifyStores.map((s) => [s.store_key, s.display_name])), [shopifyStores])

  // --- Detail panel selection --------------------------------------------------
  const [selection, setSelection] = useState<DetailSelection | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  function toggleSelection(next: DetailSelection) {
    setSelection((prev) => (selectionKey(prev) === selectionKey(next) ? null : next))
  }

  useEffect(() => {
    if (selection) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selection])

  async function handleDeleteCollection(id: number) {
    if (!confirm('Delete this collection? The linked bank/cash entry will also be removed.')) return
    await deleteCourierCollection(id)
  }

  const detail = useMemo(() => {
    if (!selection) return null
    const periodLabel = `Period: ${formatDate(start)} – ${formatDate(end)}`

    const courierRow = (c: (typeof courierCollections)[number]): CollectionsDetailRow => ({
      id: `cc-${c.id}`,
      date: c.invoice_date,
      type: 'Courier',
      typeColor: 'green',
      source: courierNameById.get(c.courier_id) ?? 'Unknown Courier',
      amount: Number(c.amount),
      amountKind: 'neutral',
      addedBy: c.created_by_username ?? '—',
      notes: c.notes || c.invoice_number || '',
      onDelete: () => handleDeleteCollection(c.id),
    })
    const shopifyRow = (o: (typeof shopifyOrders)[number]): CollectionsDetailRow => ({
      id: `so-${o.id}`,
      date: o.order_date,
      type: 'Shopify',
      typeColor: 'purple',
      source: o.store_key ? storeNameByKey.get(o.store_key) ?? o.store_key : 'Shopify',
      amount: Number(o.total_amount),
      amountKind: 'neutral',
      addedBy: 'Shopify Sync',
      notes: [o.order_number, o.customer_name].filter(Boolean).join(' · '),
    })
    const cashRow = (t: (typeof cashTransactions)[number]): CollectionsDetailRow => ({
      id: `ct-${t.id}`,
      date: t.date,
      type: t.type === 'cash_in' ? 'Cash In' : 'Cash Out',
      typeColor: t.type === 'cash_in' ? 'green' : 'red',
      source: t.category,
      amount: Number(t.amount),
      amountKind: t.type === 'cash_in' ? 'in' : 'out',
      addedBy: t.created_by_username ?? '—',
      notes: t.notes || '',
    })
    const bankRow = (t: (typeof bankTransactions)[number]): CollectionsDetailRow => ({
      id: `bt-${t.id}`,
      date: t.date,
      type: t.type === 'credit' ? 'Credit' : 'Debit',
      typeColor: t.type === 'credit' ? 'green' : 'red',
      source: `${bankNameById.get(t.bank_account_id) ?? 'Bank'}${t.reference_type ? ` · ${t.reference_type.replace(/_/g, ' ')}` : ''}`,
      amount: Number(t.amount),
      amountKind: t.type === 'credit' ? 'in' : 'out',
      addedBy: t.created_by_username ?? '—',
      notes: t.notes || '',
    })

    switch (selection.kind) {
      case 'total-collections': {
        const rows = [...periodCourierCollections.map(courierRow), ...periodShopifyOrders.map(shopifyRow)].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        return {
          title: 'Total Collections',
          subtitle: `${periodLabel} · ${formatCurrency(totalCollections)} total`,
          rows,
          filenameBase: `protees-total-collections-${start}-to-${end}`,
          emptyMessage: 'No collections in this period.',
        }
      }
      case 'courier-collections': {
        const rows = [...periodCourierCollections].sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()).map(courierRow)
        return {
          title: 'Courier Collections',
          subtitle: `${periodLabel} · ${formatCurrency(courierCollectionsTotal)} total`,
          rows,
          filenameBase: `protees-courier-collections-${start}-to-${end}`,
          emptyMessage: 'No courier collections in this period.',
        }
      }
      case 'shopify-collections': {
        const rows = [...periodShopifyOrders].sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()).map(shopifyRow)
        return {
          title: 'Shopify Collections',
          subtitle: `${periodLabel} · ${formatCurrency(shopifyCollectionsTotal)} total`,
          rows,
          filenameBase: `protees-shopify-collections-${start}-to-${end}`,
          emptyMessage: 'No Shopify orders in this period.',
        }
      }
      case 'office-cash': {
        const rows = [...cashTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(cashRow)
        return {
          title: 'Office Cash',
          subtitle: `Complete cash ledger · Live balance: ${formatCurrency(cashBalance)}`,
          rows,
          filenameBase: 'protees-office-cash-ledger',
          emptyMessage: 'No cash transactions yet.',
        }
      }
      case 'total-bank': {
        const rows = [...bankTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(bankRow)
        return {
          title: 'Total Bank Balance',
          subtitle: `All bank transactions · Live balance: ${formatCurrency(totalBankBalance)}`,
          rows,
          filenameBase: 'protees-bank-transactions',
          emptyMessage: 'No bank transactions yet.',
        }
      }
      case 'bank': {
        const bank = bankAccountsWithBalance.find((b) => b.id === selection.id)
        const rows = bankTransactions
          .filter((t) => t.bank_account_id === selection.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map(bankRow)
        return {
          title: bank?.name ?? 'Bank Account',
          subtitle: `Transaction history · Current balance: ${formatCurrency(bank?.balance ?? 0)}`,
          rows,
          filenameBase: `protees-bank-${(bank?.name ?? 'account').toLowerCase().replace(/\s+/g, '-')}`,
          emptyMessage: 'No transactions on this account yet.',
        }
      }
      case 'courier': {
        const courier = couriersWithBalance.find((c) => c.id === selection.id)
        const rows = courierCollections
          .filter((c) => c.courier_id === selection.id)
          .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime())
          .map(courierRow)
        return {
          title: courier?.name ?? 'Courier',
          subtitle: `Collection history · Total collected: ${formatCurrency(courier?.totalCollected ?? 0)}`,
          rows,
          filenameBase: `protees-courier-${(courier?.name ?? 'account').toLowerCase().replace(/\s+/g, '-')}`,
          emptyMessage: 'No collections recorded for this courier yet.',
        }
      }
      case 'shopify-store': {
        const store = shopifyStores.find((s) => s.store_key === selection.key)
        const rows = shopifyOrders
          .filter((o) => o.store_key === selection.key)
          .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
          .map(shopifyRow)
        const total = rows.reduce((s, r) => s + r.amount, 0)
        return {
          title: store?.display_name ?? 'Shopify Store',
          subtitle: `Order history · Total collected: ${formatCurrency(total)}`,
          rows,
          filenameBase: `protees-shopify-${(store?.display_name ?? 'store').toLowerCase().replace(/\s+/g, '-')}`,
          emptyMessage: 'No orders synced for this store yet.',
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selection,
    periodCourierCollections,
    periodShopifyOrders,
    cashTransactions,
    bankTransactions,
    courierCollections,
    shopifyOrders,
    bankAccountsWithBalance,
    couriersWithBalance,
    shopifyStores,
  ])

  // --- Manage Couriers (Settings) ---------------------------------------------
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null)
  const [courierName, setCourierName] = useState('')
  const [courierPaymentMethod, setCourierPaymentMethod] = useState<PaymentType>('cash')
  const [courierBankId, setCourierBankId] = useState<number | ''>('')
  const [savingCourier, setSavingCourier] = useState(false)
  const [newBankName, setNewBankName] = useState('')
  const [addingBank, setAddingBank] = useState(false)

  function openSettings() {
    resetCourierForm()
    setSettingsOpen(true)
  }

  function resetCourierForm() {
    setEditingCourier(null)
    setCourierName('')
    setCourierPaymentMethod('cash')
    setCourierBankId(bankAccountsWithBalance[0]?.id ?? '')
    setNewBankName('')
  }

  async function handleAddBank() {
    if (!newBankName.trim()) return
    setAddingBank(true)
    try {
      const bank = await addBankAccount(newBankName.trim())
      setCourierBankId(bank.id)
      setNewBankName('')
      showToast('success', `${bank.name} added.`)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to add bank account.')
    } finally {
      setAddingBank(false)
    }
  }

  function startEditCourier(courier: Courier) {
    setEditingCourier(courier)
    setCourierName(courier.name)
    setCourierPaymentMethod(courier.payment_method as PaymentType)
    setCourierBankId(courier.bank_account_id ?? bankAccountsWithBalance[0]?.id ?? '')
  }

  async function handleSaveCourier() {
    if (!courierName.trim()) {
      showToast('error', 'Enter a courier name.')
      return
    }
    if (courierPaymentMethod === 'bank_transfer' && !courierBankId) {
      showToast('error', 'Select the receiving bank account.')
      return
    }
    setSavingCourier(true)
    try {
      const input = { name: courierName.trim(), paymentMethod: courierPaymentMethod, bankAccountId: courierPaymentMethod === 'bank_transfer' ? Number(courierBankId) : null }
      if (editingCourier) {
        await updateCourier(editingCourier.id, input)
        showToast('success', 'Courier updated.')
      } else {
        await addCourier(input)
        showToast('success', 'Courier added.')
      }
      resetCourierForm()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save courier.')
    } finally {
      setSavingCourier(false)
    }
  }

  // --- Add Collection modal ---------------------------------------------------
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)
  const [collCourierId, setCollCourierId] = useState<number | ''>('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(todayISO())
  const [collAmount, setCollAmount] = useState('')
  const [collNotes, setCollNotes] = useState('')
  const [savingCollection, setSavingCollection] = useState(false)

  function openCollectionModal() {
    setCollCourierId(couriers[0]?.id ?? '')
    setInvoiceNumber('')
    setInvoiceDate(todayISO())
    setCollAmount('')
    setCollNotes('')
    setCollectionModalOpen(true)
  }

  const selectedCollectionCourier = couriers.find((c) => c.id === collCourierId)
  const selectedCourierDestination = selectedCollectionCourier
    ? selectedCollectionCourier.payment_method === 'bank_transfer'
      ? bankAccountsWithBalance.find((b) => b.id === selectedCollectionCourier.bank_account_id)?.name ?? 'its configured bank'
      : 'Office Cash'
    : null

  async function handleAddCollection() {
    const amt = Number(collAmount)
    if (!collCourierId || Number.isNaN(amt) || amt <= 0) {
      showToast('error', 'Select a courier and enter a valid amount.')
      return
    }
    setSavingCollection(true)
    try {
      await addCourierCollection({
        courierId: Number(collCourierId),
        invoiceNumber: invoiceNumber.trim() || undefined,
        invoiceDate,
        amount: amt,
        notes: collNotes.trim() || undefined,
      })
      showToast('success', `Collection recorded — posted to ${selectedCourierDestination}.`)
      setCollectionModalOpen(false)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to record collection.')
    } finally {
      setSavingCollection(false)
    }
  }

  // --- Transfer Cash to Office modal ------------------------------------------
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferBankId, setTransferBankId] = useState<number | ''>('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDate, setTransferDate] = useState(todayISO())
  const [transferNotes, setTransferNotes] = useState('')
  const [savingTransfer, setSavingTransfer] = useState(false)

  function openTransferModal() {
    setTransferBankId(bankAccountsWithBalance[0]?.id ?? '')
    setTransferAmount('')
    setTransferDate(todayISO())
    setTransferNotes('')
    setTransferModalOpen(true)
  }

  async function handleTransfer() {
    const amt = Number(transferAmount)
    if (!transferBankId || Number.isNaN(amt) || amt <= 0) {
      showToast('error', 'Select a bank and enter a valid amount.')
      return
    }
    setSavingTransfer(true)
    try {
      await transferCashToOffice({ bankAccountId: Number(transferBankId), amount: amt, date: transferDate, notes: transferNotes.trim() || undefined })
      showToast('success', 'Cash transferred to Office.')
      setTransferModalOpen(false)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to transfer cash.')
    } finally {
      setSavingTransfer(false)
    }
  }

  // --- Manage Shopify Stores modal --------------------------------------------
  const [storesModalOpen, setStoresModalOpen] = useState(false)
  const [storeDomainDrafts, setStoreDomainDrafts] = useState<Record<string, string>>({})
  const [savingStoreKey, setSavingStoreKey] = useState<string | null>(null)

  function openStoresModal() {
    setStoreDomainDrafts(Object.fromEntries(shopifyStores.map((s) => [s.store_key, s.store_domain ?? ''])))
    setStoresModalOpen(true)
  }

  async function handleSaveStoreDomain(storeKey: string) {
    setSavingStoreKey(storeKey)
    try {
      await updateShopifyStoreDomain(storeKey, storeDomainDrafts[storeKey] ?? '')
      showToast('success', 'Store domain saved.')
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save store domain.')
    } finally {
      setSavingStoreKey(null)
    }
  }

  async function handleSyncNow() {
    const result = await syncShopifyNow()
    showToast(result.ok ? 'success' : 'error', result.message)
  }

  const [testingStoreKey, setTestingStoreKey] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, ShopifyConnectionTestResult>>({})

  async function handleTestConnection(storeKey: string) {
    setTestingStoreKey(storeKey)
    try {
      const result = await testShopifyConnection(storeKey)
      setTestResults((prev) => ({ ...prev, [storeKey]: result }))
    } finally {
      setTestingStoreKey(null)
    }
  }

  // Best-effort ~30-minute freshness whenever someone has this page open,
  // as a supplement to the Vercel Cron job (which runs at most once a day
  // on the Hobby plan — see vercel.json). Silent: no toast, once per visit.
  const autoSyncTriggeredRef = useRef(false)
  useEffect(() => {
    if (autoSyncTriggeredRef.current) return
    if (shopifyStores.length === 0) return
    const staleMs = 30 * 60 * 1000
    const isStale = shopifyStores.some((s) => !s.last_synced_at || Date.now() - new Date(s.last_synced_at).getTime() > staleMs)
    if (!isStale) return
    autoSyncTriggeredRef.current = true
    syncShopifyNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopifyStores])

  const courierAccountsTotal = couriersWithBalance.reduce((s, c) => s + c.totalCollected, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Collections</h1>
          <p className="mt-1 text-sm text-slate-400">Courier and Shopify collections, bank balances, and office cash — all in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={openTransferModal} disabled={bankAccountsWithBalance.length === 0}>
            <ArrowRightLeft size={16} /> Transfer Cash
          </button>
          <button className="btn-primary" onClick={openCollectionModal} disabled={couriers.length === 0}>
            <Plus size={16} /> Add Collection
          </button>
        </div>
      </div>

      <DateRangeFilter
        preset={preset}
        onPresetChange={setPreset}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        rangeStart={start}
        rangeEnd={end}
      />

      {/* --- Top summary: 5 premium, equal-size, clickable cards --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Collections"
          value={formatCurrency(totalCollections)}
          icon={Wallet}
          accent="cyan"
          hint="Selected period"
          onClick={() => toggleSelection({ kind: 'total-collections' })}
          selected={selectionKey(selection) === 'total-collections'}
        />
        <StatCard
          label="Courier Collections"
          value={formatCurrency(courierCollectionsTotal)}
          icon={Truck}
          accent="green"
          hint="Selected period"
          onClick={() => toggleSelection({ kind: 'courier-collections' })}
          selected={selectionKey(selection) === 'courier-collections'}
        />
        <StatCard
          label="Shopify Collections"
          value={formatCurrency(shopifyCollectionsTotal)}
          icon={ShoppingBag}
          accent="purple"
          hint="Selected period"
          onClick={() => toggleSelection({ kind: 'shopify-collections' })}
          selected={selectionKey(selection) === 'shopify-collections'}
        />
        <StatCard
          label="Office Cash Balance"
          value={formatCurrency(cashBalance)}
          icon={Banknote}
          accent="amber"
          hint="Live balance"
          onClick={() => toggleSelection({ kind: 'office-cash' })}
          selected={selectionKey(selection) === 'office-cash'}
        />
        <StatCard
          label="Total Bank Balance"
          value={formatCurrency(totalBankBalance)}
          icon={Landmark}
          accent="cyan"
          hint="Live balance"
          onClick={() => toggleSelection({ kind: 'total-bank' })}
          selected={selectionKey(selection) === 'total-bank'}
        />
      </div>

      {/* --- Detail panel: opens below whatever card/row was clicked --- */}
      {detail && (
        <div ref={detailRef}>
          <CollectionsDetailPanel
            title={detail.title}
            subtitle={detail.subtitle}
            rows={detail.rows}
            onClose={() => setSelection(null)}
            filenameBase={detail.filenameBase}
            emptyMessage={detail.emptyMessage}
          />
        </div>
      )}

      {/* --- Courier Accounts --- */}
      <CollapsibleSection
        title="Courier Accounts"
        summary={`${couriersWithBalance.length} couriers · ${formatCurrency(courierAccountsTotal)}`}
        defaultOpen
        headerAction={
          <button className="btn-secondary text-xs" onClick={openSettings}>
            <Settings size={14} /> Manage
          </button>
        }
      >
        {couriersWithBalance.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No couriers configured yet"
            description="Use Manage to set up how each courier pays — bank transfer or cash — then start recording collections."
            action={
              <button className="btn-primary" onClick={openSettings}>
                <Plus size={16} /> Manage Couriers
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-white/5">
            {couriersWithBalance.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleSelection({ kind: 'courier', id: c.id })}
                className={classNames(
                  '-mx-2 flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-white/[0.03]',
                  selectionKey(selection) === `courier-${c.id}` && 'bg-white/[0.04]'
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neon-green/15 to-neon-cyan/15 font-display text-xs font-bold text-white">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.payment_method === 'bank_transfer' ? c.bankAccountName ?? 'Bank Transfer' : 'Cash'}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <p className="font-display text-sm font-semibold text-white">{formatCurrency(c.totalCollected)}</p>
                    <p className="text-[11px] text-slate-500">{c.collectionCount} collections</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600" />
                </div>
              </button>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* --- Bank Accounts --- */}
      <CollapsibleSection title="Bank Accounts" summary={`${bankAccountsWithBalance.length} banks · ${formatCurrency(totalBankBalance)}`} defaultOpen>
        {bankAccountsWithBalance.length === 0 ? (
          <EmptyState icon={Landmark} title="No bank accounts yet" description="Add one from Manage Couriers, or when giving a courier a bank payment method." />
        ) : (
          <div className="divide-y divide-white/5">
            {bankAccountsWithBalance.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleSelection({ kind: 'bank', id: b.id })}
                className={classNames(
                  '-mx-2 flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-white/[0.03]',
                  selectionKey(selection) === `bank-${b.id}` && 'bg-white/[0.04]'
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <BankLogo name={b.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{b.name}</p>
                    <p className="text-xs text-slate-500">Current Balance</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="font-display text-sm font-semibold text-white">{formatCurrency(b.balance)}</p>
                  <ChevronRight size={16} className="text-slate-600" />
                </div>
              </button>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* --- Shopify Stores --- */}
      <CollapsibleSection
        title="Shopify Stores"
        summary={`${shopifyStores.length} stores · ${formatCurrency(shopifyCollectionsTotal)} this period`}
        headerAction={
          <div className="flex gap-2">
            <button className="btn-secondary text-xs" onClick={handleSyncNow} disabled={shopifySyncing}>
              <RefreshCw size={14} className={shopifySyncing ? 'animate-spin' : undefined} /> {shopifySyncing ? 'Syncing…' : 'Sync Now'}
            </button>
            <button className="btn-secondary text-xs" onClick={openStoresModal}>
              <Settings size={14} /> Manage
            </button>
          </div>
        }
      >
        {shopifyStores.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No Shopify stores yet" description="Configure a store's domain from Manage, then hit Sync Now." />
        ) : (
          <div className="divide-y divide-white/5">
            {shopifyStores.map((store) => {
              const storeTotal = periodShopifyOrders.filter((o) => o.store_key === store.store_key).reduce((s, o) => s + Number(o.total_amount), 0)
              return (
                <button
                  key={store.store_key}
                  type="button"
                  onClick={() => toggleSelection({ kind: 'shopify-store', key: store.store_key })}
                  className={classNames(
                    '-mx-2 flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-white/[0.03]',
                    selectionKey(selection) === `store-${store.store_key}` && 'bg-white/[0.04]'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple/15 to-neon-cyan/15 font-display text-xs font-bold text-white">
                      {initials(store.display_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{store.display_name}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        {store.is_connected ? (
                          <>
                            <CheckCircle2 size={11} className="text-neon-green" /> Connected
                          </>
                        ) : (
                          <>
                            <XCircle size={11} /> Not Connected
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <p className="font-display text-sm font-semibold text-white">{formatCurrency(storeTotal)}</p>
                      <p className="text-[11px] text-slate-500">Selected period</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-600" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* --- Manage Couriers (Settings) --- */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Manage Couriers" subtitle="Configure how each courier pays — done once, then every collection auto-routes." maxWidth="max-w-2xl">
        <div className="space-y-6">
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{editingCourier ? `Edit ${editingCourier.name}` : 'Add Courier'}</p>
            <div>
              <label className="label-field">Courier Name</label>
              <input className="input-field" value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="e.g. Leopard Courier" />
            </div>
            <div>
              <label className="label-field">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                {(['bank_transfer', 'cash'] as PaymentType[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCourierPaymentMethod(m)}
                    className={classNames(
                      'rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition',
                      courierPaymentMethod === m ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                    )}
                  >
                    {PAYMENT_TYPE_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>
            {courierPaymentMethod === 'bank_transfer' && (
              <div>
                <label className="label-field">Bank Account</label>
                <select className="input-field" value={courierBankId} onChange={(e) => setCourierBankId(Number(e.target.value))}>
                  {bankAccountsWithBalance.length === 0 && <option value="">No bank accounts yet — add one below</option>}
                  {bankAccountsWithBalance.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-3">
              {editingCourier && (
                <button className="btn-secondary flex-1" onClick={resetCourierForm}>
                  Cancel Edit
                </button>
              )}
              <button className="btn-primary flex-1" onClick={handleSaveCourier} disabled={savingCourier}>
                {savingCourier ? 'Saving…' : editingCourier ? 'Update Courier' : 'Save Courier'}
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bank Accounts</p>
            {bankAccountsWithBalance.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {bankAccountsWithBalance.map((b) => (
                  <span key={b.id} className="rounded-lg border border-white/10 bg-base-900/60 px-2.5 py-1 text-xs text-slate-300">
                    {b.name}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input className="input-field flex-1" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} placeholder="Add bank (e.g. HBL, UBL)" />
              <button type="button" className="btn-primary shrink-0" onClick={handleAddBank} disabled={addingBank || !newBankName.trim()}>
                {addingBank ? 'Adding…' : 'Add Bank'}
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Configured Couriers</p>
            {couriers.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No couriers yet.</p>
            ) : (
              <div className="divide-y divide-white/5 rounded-xl border border-white/10">
                {couriers.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{c.name}</p>
                      <p className="text-xs text-slate-500">
                        {c.payment_method === 'bank_transfer' ? bankAccountsWithBalance.find((b) => b.id === c.bank_account_id)?.name ?? 'Bank Transfer' : 'Cash'}
                      </p>
                    </div>
                    <button className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white" onClick={() => startEditCourier(c)}>
                      <Pencil size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* --- Add Collection --- */}
      <Modal open={collectionModalOpen} onClose={() => setCollectionModalOpen(false)} title="Add Collection">
        <div className="space-y-4">
          <div>
            <label className="label-field">Courier</label>
            <select className="input-field" value={collCourierId} onChange={(e) => setCollCourierId(Number(e.target.value))}>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {selectedCourierDestination && <p className="mt-1.5 text-[11px] text-slate-500">This collection will post to: {selectedCourierDestination}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Invoice Number (optional)</label>
              <input className="input-field" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-1234" />
            </div>
            <div>
              <label className="label-field">Invoice Date</label>
              <input type="date" className="input-field" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-field">Amount</label>
            <input type="number" className="input-field" value={collAmount} onChange={(e) => setCollAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="label-field">Notes (optional)</label>
            <input className="input-field" value={collNotes} onChange={(e) => setCollNotes(e.target.value)} placeholder="Details" />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setCollectionModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleAddCollection} disabled={savingCollection}>
              {savingCollection ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* --- Transfer Cash to Office --- */}
      <Modal open={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Transfer Cash to Office" subtitle="Moves money from a bank account into Office Cash.">
        <div className="space-y-4">
          <div>
            <label className="label-field">Source Bank</label>
            <select className="input-field" value={transferBankId} onChange={(e) => setTransferBankId(Number(e.target.value))}>
              {bankAccountsWithBalance.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({formatCurrency(b.balance)})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Amount</label>
              <input type="number" className="input-field" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label-field">Date</label>
              <input type="date" className="input-field" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-field">Notes (optional)</label>
            <input className="input-field" value={transferNotes} onChange={(e) => setTransferNotes(e.target.value)} placeholder="Details" />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setTransferModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleTransfer} disabled={savingTransfer}>
              {savingTransfer ? 'Transferring…' : 'Transfer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* --- Manage Shopify Stores --- */}
      <Modal
        open={storesModalOpen}
        onClose={() => setStoresModalOpen(false)}
        title="Manage Shopify Stores"
        subtitle="Access tokens are never entered here — they're set as server-only environment variables in Vercel."
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {shopifyStores.map((store) => (
            <div key={store.store_key} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{store.display_name}</p>
                {store.is_connected ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neon-green">
                    <CheckCircle2 size={14} /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <XCircle size={14} /> Not Connected
                  </span>
                )}
              </div>
              <div>
                <label className="label-field">Shopify Store URL</label>
                <div className="flex gap-2">
                  <input
                    className="input-field flex-1"
                    value={storeDomainDrafts[store.store_key] ?? ''}
                    onChange={(e) => setStoreDomainDrafts((prev) => ({ ...prev, [store.store_key]: e.target.value }))}
                    placeholder={`${store.store_key}.myshopify.com`}
                  />
                  <button
                    type="button"
                    className="btn-secondary shrink-0"
                    onClick={() => handleSaveStoreDomain(store.store_key)}
                    disabled={savingStoreKey === store.store_key}
                  >
                    {savingStoreKey === store.store_key ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Dev Dashboard app credentials: set{' '}
                <code className="rounded bg-white/5 px-1 py-0.5 text-slate-300">
                  SHOPIFY_{store.store_key.toUpperCase()}_CLIENT_ID
                </code>{' '}
                and{' '}
                <code className="rounded bg-white/5 px-1 py-0.5 text-slate-300">
                  SHOPIFY_{store.store_key.toUpperCase()}_CLIENT_SECRET
                </code>{' '}
                in Vercel → Settings → Environment Variables, then redeploy.
              </p>
              {store.last_sync_error && <p className="text-[11px] text-neon-red">Last error: {store.last_sync_error}</p>}
              {store.last_synced_at && <p className="text-[11px] text-slate-500">Last synced: {formatDate(store.last_synced_at)}</p>}

              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => handleTestConnection(store.store_key)}
                disabled={testingStoreKey === store.store_key}
              >
                {testingStoreKey === store.store_key ? 'Testing…' : 'Test Connection'}
              </button>

              {testResults[store.store_key] && (
                <div
                  className={classNames(
                    'space-y-1.5 rounded-lg border p-3 text-[11px]',
                    testResults[store.store_key].ok ? 'border-neon-green/30 bg-neon-green/5' : 'border-neon-red/30 bg-neon-red/5'
                  )}
                >
                  <p className={classNames('font-semibold', testResults[store.store_key].ok ? 'text-neon-green' : 'text-neon-red')}>
                    {testResults[store.store_key].ok ? '✓ Connection successful' : '✗ Connection failed'}
                  </p>
                  {testResults[store.store_key].ok ? (
                    <>
                      <p className="text-slate-300">Shop: {testResults[store.store_key].shopName ?? '—'}</p>
                      <p className="text-slate-300">Domain: {testResults[store.store_key].shopDomain ?? '—'}</p>
                      <p className="text-slate-300">Paid orders available: {testResults[store.store_key].paidOrderCount ?? '—'}</p>
                    </>
                  ) : (
                    <p className="break-words text-slate-300">{testResults[store.store_key].body ?? 'Unknown error.'}</p>
                  )}
                  {testResults[store.store_key].requestUrl && (
                    <p className="break-all text-slate-500">Request: {testResults[store.store_key].requestUrl}</p>
                  )}
                  <p className="text-slate-500">Status: {testResults[store.store_key].status ?? 'no response'}</p>
                  {testResults[store.store_key].tokenExchange && (
                    <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
                      <p className="font-medium text-slate-400">Token exchange (client_credentials):</p>
                      <p className="break-all text-slate-500">Request: POST {testResults[store.store_key].tokenExchange?.requestUrl}</p>
                      <p className="break-all text-slate-500">Body: {testResults[store.store_key].tokenExchange?.requestBody}</p>
                      <p className="text-slate-500">Status: {testResults[store.store_key].tokenExchange?.status ?? 'no response'}</p>
                      <p className="break-all text-slate-500">Response: {testResults[store.store_key].tokenExchange?.responseBody ?? '—'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
