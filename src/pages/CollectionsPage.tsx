import { useMemo, useState } from 'react'
import { ArrowRightLeft, Banknote, Landmark, Pencil, Plus, Settings, ShoppingBag, Trash2, Truck, Wallet } from 'lucide-react'
import { useCollections } from '@/context/CollectionsContext'
import { useToast } from '@/context/ToastContext'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { PAYMENT_TYPE_LABELS, type Courier, type PaymentType } from '@/lib/types'
import { classNames, dashboardDateRange, formatCurrency, formatDate, isWithinRange, todayISO, type DashboardDatePreset } from '@/lib/utils'

type CollectionsTab = 'courier' | 'shopify'

export function CollectionsPage() {
  const {
    couriers,
    couriersWithBalance,
    courierCollections,
    bankAccountsWithBalance,
    cashBalance,
    shopifyOrders,
    addCourier,
    updateCourier,
    addCourierCollection,
    deleteCourierCollection,
    addBankAccount,
    transferCashToOffice,
  } = useCollections()
  const { showToast } = useToast()

  const [tab, setTab] = useState<CollectionsTab>('courier')

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
  const sortedCollections = useMemo(
    () => [...periodCourierCollections].sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()),
    [periodCourierCollections]
  )
  const recentShopifyOrders = useMemo(
    () => [...periodShopifyOrders].sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()),
    [periodShopifyOrders]
  )

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

  async function handleDeleteCollection(id: number) {
    if (!confirm('Delete this collection? The linked bank/cash entry will also be removed.')) return
    await deleteCourierCollection(id)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Collections</h1>
          <p className="mt-1 text-sm text-slate-400">Courier and Shopify collections, bank balances, and office cash — all in one place.</p>
        </div>
        <button className="btn-secondary" onClick={openSettings}>
          <Settings size={16} /> Manage Couriers
        </button>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Collections" value={formatCurrency(totalCollections)} icon={Wallet} accent="cyan" hint="Selected period" />
        <StatCard label="Courier Collections" value={formatCurrency(courierCollectionsTotal)} icon={Truck} accent="green" hint="Selected period" />
        <StatCard label="Shopify Collections" value={formatCurrency(shopifyCollectionsTotal)} icon={ShoppingBag} accent="purple" hint="Selected period" />
        <StatCard label="Office Cash Balance" value={formatCurrency(cashBalance)} icon={Banknote} accent="amber" hint="Live balance" />
        <StatCard label="Total Bank Balance" value={formatCurrency(totalBankBalance)} icon={Landmark} accent="cyan" hint="Live balance" />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('courier')}
          className={classNames(
            'rounded-xl border px-4 py-2.5 text-sm font-semibold transition',
            tab === 'courier' ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
          )}
        >
          Courier Collections
        </button>
        <button
          onClick={() => setTab('shopify')}
          className={classNames(
            'rounded-xl border px-4 py-2.5 text-sm font-semibold transition',
            tab === 'shopify' ? 'border-neon-purple/50 bg-neon-purple/10 text-neon-purple' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
          )}
        >
          Shopify Collections
        </button>
      </div>

      {tab === 'courier' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={openCollectionModal} disabled={couriers.length === 0}>
              <Plus size={16} /> Add Collection
            </button>
            <button className="btn-secondary" onClick={openTransferModal} disabled={bankAccountsWithBalance.length === 0}>
              <ArrowRightLeft size={16} /> Transfer Cash to Office
            </button>
          </div>

          {bankAccountsWithBalance.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {bankAccountsWithBalance.map((b) => (
                <StatCard key={b.id} label={b.name} value={formatCurrency(b.balance)} icon={Landmark} accent="purple" hint="Bank balance" />
              ))}
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Courier Balances</h2>
            {couriersWithBalance.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No couriers configured yet"
                description="Use Manage Couriers to set up how each courier pays — bank transfer or cash — then start recording collections."
                action={
                  <button className="btn-primary" onClick={openSettings}>
                    <Plus size={16} /> Manage Couriers
                  </button>
                }
              />
            ) : (
              <div className="card overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3.5">Courier</th>
                      <th className="px-5 py-3.5">Pays Via</th>
                      <th className="px-5 py-3.5">Total Collected</th>
                      <th className="px-5 py-3.5">Collections</th>
                      <th className="px-5 py-3.5">Last Collection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {couriersWithBalance.map((c) => (
                      <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                        <td className="px-5 py-3.5 font-medium text-white">{c.name}</td>
                        <td className="px-5 py-3.5 text-slate-400">
                          {c.payment_method === 'bank_transfer' ? c.bankAccountName ?? 'Bank Transfer' : 'Cash'}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-neon-green">{formatCurrency(c.totalCollected)}</td>
                        <td className="px-5 py-3.5 text-slate-300">{c.collectionCount}</td>
                        <td className="px-5 py-3.5 text-slate-500">{c.lastCollectionDate ? formatDate(c.lastCollectionDate) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Recent Collections</h2>
            {sortedCollections.length === 0 ? (
              <EmptyState icon={Wallet} title="No collections in this period" description="Recorded courier collections will show up here." />
            ) : (
              <div className="card overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Courier</th>
                      <th className="px-5 py-3.5">Invoice #</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Notes</th>
                      <th className="px-5 py-3.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCollections.map((c) => (
                      <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                        <td className="px-5 py-3.5 text-slate-500">{formatDate(c.invoice_date)}</td>
                        <td className="px-5 py-3.5 font-medium text-white">{courierNameById.get(c.courier_id) ?? '—'}</td>
                        <td className="px-5 py-3.5 text-slate-400">{c.invoice_number || '—'}</td>
                        <td className="px-5 py-3.5 font-semibold text-neon-green">{formatCurrency(c.amount)}</td>
                        <td className="px-5 py-3.5 text-slate-500">{c.notes || '—'}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-red/10 hover:text-neon-red" onClick={() => handleDeleteCollection(c.id)}>
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'shopify' && (
        <div>
          {recentShopifyOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No Shopify orders imported yet"
              description="Shopify order sync has not been configured. Once connected, paid orders will appear here automatically."
            />
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Order #</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Payment Method</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentShopifyOrders.map((o) => (
                    <tr key={o.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 font-medium text-white">{o.order_number}</td>
                      <td className="px-5 py-3.5 text-slate-300">{o.customer_name || '—'}</td>
                      <td className="px-5 py-3.5 font-semibold text-neon-green">{formatCurrency(o.total_amount)}</td>
                      <td className="px-5 py-3.5 text-slate-400">{o.payment_method || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-400">{o.financial_status}</td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(o.order_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
    </div>
  )
}
