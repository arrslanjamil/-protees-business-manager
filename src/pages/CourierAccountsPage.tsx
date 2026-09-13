import { useMemo, useState } from 'react'
import { CircleDollarSign, Clock, Plus, Truck, Wallet } from 'lucide-react'
import { useCollections } from '@/context/CollectionsContext'
import { useToast } from '@/context/ToastContext'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { PAYMENT_TYPE_LABELS, type PaymentType } from '@/lib/types'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

export function CourierAccountsPage() {
  const {
    couriersWithBalance,
    bankAccountsWithBalance,
    courierPayments,
    couriers,
    addCourier,
    addExpectedCollection,
    recordCourierPayment,
  } = useCollections()
  const { showToast } = useToast()

  const totals = useMemo(
    () =>
      couriersWithBalance.reduce(
        (acc, c) => ({
          expected: acc.expected + c.expectedCollection,
          received: acc.received + c.paymentsReceived,
          pending: acc.pending + c.pendingBalance,
        }),
        { expected: 0, received: 0, pending: 0 }
      ),
    [couriersWithBalance]
  )

  const sortedPayments = useMemo(
    () => [...courierPayments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()).slice(0, 15),
    [courierPayments]
  )
  const courierNameById = useMemo(() => new Map(couriers.map((c) => [c.id, c.name])), [couriers])
  const bankNameById = useMemo(() => new Map(bankAccountsWithBalance.map((b) => [b.id, b.name])), [bankAccountsWithBalance])

  // --- Add courier modal -----------------------------------------------------
  const [courierModalOpen, setCourierModalOpen] = useState(false)
  const [newCourierName, setNewCourierName] = useState('')
  const [savingCourier, setSavingCourier] = useState(false)

  async function handleAddCourier() {
    if (!newCourierName.trim()) return
    setSavingCourier(true)
    try {
      await addCourier(newCourierName.trim())
      showToast('success', 'Courier added.')
      setNewCourierName('')
      setCourierModalOpen(false)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to add courier.')
    } finally {
      setSavingCourier(false)
    }
  }

  // --- Add expected collection modal ------------------------------------------
  const [expectedModalOpen, setExpectedModalOpen] = useState(false)
  const [expCourierId, setExpCourierId] = useState<number | ''>('')
  const [expAmount, setExpAmount] = useState('')
  const [expDate, setExpDate] = useState(todayISO())
  const [expReference, setExpReference] = useState('')
  const [savingExpected, setSavingExpected] = useState(false)

  function openExpectedModal() {
    setExpCourierId(couriers[0]?.id ?? '')
    setExpAmount('')
    setExpDate(todayISO())
    setExpReference('')
    setExpectedModalOpen(true)
  }

  async function handleAddExpected() {
    const amt = Number(expAmount)
    if (!expCourierId || Number.isNaN(amt) || amt <= 0) {
      showToast('error', 'Select a courier and enter a valid amount.')
      return
    }
    setSavingExpected(true)
    try {
      await addExpectedCollection({ courierId: Number(expCourierId), amount: amt, date: expDate, orderReference: expReference.trim() || undefined })
      showToast('success', 'Expected collection recorded.')
      setExpectedModalOpen(false)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to record expected collection.')
    } finally {
      setSavingExpected(false)
    }
  }

  // --- Record payment modal ---------------------------------------------------
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [payCourierId, setPayCourierId] = useState<number | ''>('')
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(todayISO())
  const [payType, setPayType] = useState<PaymentType>('cash')
  const [payBankId, setPayBankId] = useState<number | ''>('')
  const [savingPayment, setSavingPayment] = useState(false)

  function openPaymentModal() {
    setPayCourierId(couriers[0]?.id ?? '')
    setPayAmount('')
    setPayDate(todayISO())
    setPayType('cash')
    setPayBankId(bankAccountsWithBalance[0]?.id ?? '')
    setPaymentModalOpen(true)
  }

  async function handleRecordPayment() {
    const amt = Number(payAmount)
    if (!payCourierId || Number.isNaN(amt) || amt <= 0) {
      showToast('error', 'Select a courier and enter a valid amount.')
      return
    }
    if (payType === 'bank_transfer' && !payBankId) {
      showToast('error', 'Select the receiving bank account.')
      return
    }
    setSavingPayment(true)
    try {
      await recordCourierPayment({
        courierId: Number(payCourierId),
        amount: amt,
        paymentDate: payDate,
        paymentType: payType,
        bankAccountId: payType === 'bank_transfer' ? Number(payBankId) : null,
      })
      showToast('success', payType === 'cash' ? 'Payment recorded and added to Office Cash.' : 'Payment recorded and credited to bank account.')
      setPaymentModalOpen(false)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to record payment.')
    } finally {
      setSavingPayment(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Courier Accounts</h1>
          <p className="mt-1 text-sm text-slate-400">Accounts receivable — money couriers have collected but not yet remitted.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setCourierModalOpen(true)}>
            <Plus size={16} /> Add Courier
          </button>
          <button className="btn-secondary" onClick={openExpectedModal} disabled={couriers.length === 0}>
            <Plus size={16} /> Expected Collection
          </button>
          <button className="btn-primary" onClick={openPaymentModal} disabled={couriers.length === 0}>
            <Wallet size={16} /> Record Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Expected Collections" value={formatCurrency(totals.expected)} icon={Truck} accent="cyan" />
        <StatCard label="Total Payments Received" value={formatCurrency(totals.received)} icon={CircleDollarSign} accent="green" />
        <StatCard label="Total Pending Balance" value={formatCurrency(totals.pending)} icon={Clock} accent="amber" />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Courier Balances</h2>
        {couriersWithBalance.length === 0 ? (
          <EmptyState icon={Truck} title="No couriers yet" description="Add a courier to start tracking expected and received collections." />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Courier</th>
                  <th className="px-5 py-3.5">Expected Collection</th>
                  <th className="px-5 py-3.5">Payments Received</th>
                  <th className="px-5 py-3.5">Pending Balance</th>
                  <th className="px-5 py-3.5">Last Payment</th>
                </tr>
              </thead>
              <tbody>
                {couriersWithBalance.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 font-medium text-white">{c.name}</td>
                    <td className="px-5 py-3.5 text-slate-300">{formatCurrency(c.expectedCollection)}</td>
                    <td className="px-5 py-3.5 text-neon-green">{formatCurrency(c.paymentsReceived)}</td>
                    <td className="px-5 py-3.5 font-semibold text-neon-amber">{formatCurrency(c.pendingBalance)}</td>
                    <td className="px-5 py-3.5 text-slate-500">{c.lastPaymentDate ? formatDate(c.lastPaymentDate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Recent Payments</h2>
        {sortedPayments.length === 0 ? (
          <EmptyState icon={Wallet} title="No payments recorded" description="Recorded courier payments will show up here." />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Courier</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Bank</th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 font-medium text-white">{courierNameById.get(p.courier_id) ?? '—'}</td>
                    <td className="px-5 py-3.5 font-semibold text-neon-green">{formatCurrency(p.amount)}</td>
                    <td className="px-5 py-3.5 text-slate-500">{formatDate(p.payment_date)}</td>
                    <td className="px-5 py-3.5 text-slate-400">{PAYMENT_TYPE_LABELS[p.payment_type as PaymentType]}</td>
                    <td className="px-5 py-3.5 text-slate-400">{p.bank_account_id ? bankNameById.get(p.bank_account_id) ?? '—' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={courierModalOpen} onClose={() => setCourierModalOpen(false)} title="Add Courier" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div>
            <label className="label-field">Courier name</label>
            <input className="input-field" value={newCourierName} onChange={(e) => setNewCourierName(e.target.value)} placeholder="e.g. Leopard Courier" />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setCourierModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleAddCourier} disabled={savingCourier}>
              {savingCourier ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={expectedModalOpen} onClose={() => setExpectedModalOpen(false)} title="Add Expected Collection" subtitle="Recorded when a COD shipment is handed to a courier.">
        <div className="space-y-4">
          <div>
            <label className="label-field">Courier</label>
            <select className="input-field" value={expCourierId} onChange={(e) => setExpCourierId(Number(e.target.value))}>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Amount</label>
              <input type="number" className="input-field" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label-field">Date</label>
              <input type="date" className="input-field" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-field">Order reference (optional)</label>
            <input className="input-field" value={expReference} onChange={(e) => setExpReference(e.target.value)} placeholder="Order #" />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setExpectedModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleAddExpected} disabled={savingExpected}>
              {savingExpected ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Record Courier Payment" subtitle="Reduces the courier's pending balance automatically.">
        <div className="space-y-4">
          <div>
            <label className="label-field">Courier</label>
            <select className="input-field" value={payCourierId} onChange={(e) => setPayCourierId(Number(e.target.value))}>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Amount</label>
              <input type="number" className="input-field" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label-field">Date</label>
              <input type="date" className="input-field" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-field">Payment Type</label>
            <div className="grid grid-cols-2 gap-3">
              {(['cash', 'bank_transfer'] as PaymentType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPayType(t)}
                  className={`rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${
                    payType === t ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {PAYMENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          {payType === 'bank_transfer' && (
            <div>
              <label className="label-field">Receiving Bank Account</label>
              <select className="input-field" value={payBankId} onChange={(e) => setPayBankId(Number(e.target.value))}>
                {bankAccountsWithBalance.length === 0 && <option value="">No bank accounts — add one first</option>}
                {bankAccountsWithBalance.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {payType === 'cash' && <p className="text-xs text-slate-500">This amount will be added to Office Cash automatically.</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleRecordPayment} disabled={savingPayment}>
              {savingPayment ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
