import { useMemo, useState } from 'react'
import { Banknote, HandCoins, Receipt, Trash2 } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import type { KhadimTransaction } from '@/lib/types'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

interface TimelineEntry extends KhadimTransaction {
  runningBalance: number
}

export function KhadimHussainPage() {
  const { khadimTransactions, khadimTotals, addKhadimPayment, addKhadimBill, deleteKhadimTransaction } = useData()
  const { showToast } = useToast()

  const timeline = useMemo<TimelineEntry[]>(() => {
    const chronological = [...khadimTransactions].sort((a, b) => {
      const byDate = new Date(a.date).getTime() - new Date(b.date).getTime()
      return byDate !== 0 ? byDate : a.id - b.id
    })
    let running = 0
    const withBalance = chronological.map((t) => {
      running += t.type === 'payment_given' ? Number(t.amount) : -Number(t.amount)
      return { ...t, runningBalance: running }
    })
    return withBalance.reverse()
  }, [khadimTransactions])

  // --- Payment Given modal --------------------------------------------------------
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  function openPaymentModal() {
    setPaymentDate(todayISO())
    setPaymentAmount('')
    setPaymentNotes('')
    setPaymentError(null)
    setPaymentModalOpen(true)
  }

  async function handleSavePayment() {
    const amt = Number(paymentAmount)
    if (Number.isNaN(amt) || amt <= 0) {
      setPaymentError('Enter a valid amount.')
      return
    }
    setSavingPayment(true)
    setPaymentError(null)
    try {
      await addKhadimPayment({ date: paymentDate, amount: amt, notes: paymentNotes.trim() || undefined })
      showToast('success', 'Payment given recorded successfully.')
      setPaymentModalOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save payment.'
      setPaymentError(message)
      // eslint-disable-next-line no-console
      console.error('[KhadimHussainPage] Failed to save payment given:', err)
      showToast('error', message)
    } finally {
      setSavingPayment(false)
    }
  }

  // --- Bill Submitted modal --------------------------------------------------------
  const [billModalOpen, setBillModalOpen] = useState(false)
  const [billDate, setBillDate] = useState(todayISO())
  const [billAmount, setBillAmount] = useState('')
  const [billDescription, setBillDescription] = useState('')
  const [savingBill, setSavingBill] = useState(false)
  const [billError, setBillError] = useState<string | null>(null)

  function openBillModal() {
    setBillDate(todayISO())
    setBillAmount('')
    setBillDescription('')
    setBillError(null)
    setBillModalOpen(true)
  }

  async function handleSaveBill() {
    const amt = Number(billAmount)
    if (Number.isNaN(amt) || amt <= 0) {
      setBillError('Enter a valid invoice amount.')
      return
    }
    if (!billDescription.trim()) {
      setBillError('Enter a description for this bill.')
      return
    }
    setSavingBill(true)
    setBillError(null)
    try {
      await addKhadimBill({ date: billDate, amount: amt, description: billDescription.trim() })
      showToast('success', 'Bill submitted recorded successfully.')
      setBillModalOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save bill.'
      setBillError(message)
      // eslint-disable-next-line no-console
      console.error('[KhadimHussainPage] Failed to save bill submitted:', err)
      showToast('error', message)
    } finally {
      setSavingBill(false)
    }
  }

  // --- Delete confirmation ---------------------------------------------------------
  const [confirmEntry, setConfirmEntry] = useState<TimelineEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState(false)

  async function confirmDeleteEntry() {
    if (!confirmEntry) return
    setDeletingEntry(true)
    try {
      await deleteKhadimTransaction(confirmEntry.id)
      showToast('success', 'Transaction deleted successfully.')
      setConfirmEntry(null)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[KhadimHussainPage] Failed to delete transaction:', confirmEntry, err)
      const message = err instanceof Error ? err.message : 'Failed to delete this record. Please try again.'
      showToast('error', message)
    } finally {
      setDeletingEntry(false)
    }
  }

  const isCleared = khadimTotals.balance === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Khadim Hussain Account</h1>
        <p className="mt-1 text-sm text-slate-400">Money given for unit material purchases — thread, accessories, packing, and other items.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard label="Total Payments Given" value={formatCurrency(khadimTotals.totalGiven)} icon={HandCoins} accent="green" />
        <StatCard label="Total Bills Submitted" value={formatCurrency(khadimTotals.totalBills)} icon={Receipt} accent="red" />
        <StatCard
          label="Current Balance"
          value={formatCurrency(khadimTotals.balance)}
          icon={Banknote}
          accent={isCleared ? 'green' : 'amber'}
          hint={isCleared ? '✅ Account Cleared' : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={openPaymentModal}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neon-green/30 bg-neon-green/5 px-4 py-6 text-neon-green transition hover:bg-neon-green/10"
        >
          <HandCoins size={26} />
          <span className="text-base font-semibold">Payment Given</span>
        </button>
        <button
          onClick={openBillModal}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neon-red/30 bg-neon-red/5 px-4 py-6 text-neon-red transition hover:bg-neon-red/10"
        >
          <Receipt size={26} />
          <span className="text-base font-semibold">Bill Submitted</span>
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Transaction History</h2>
        {timeline.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions yet" description="Payments given and bills submitted will show up here, latest first." />
        ) : (
          <div className="space-y-3">
            {timeline.map((entry) => (
              <div key={entry.id} className="card group flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color={entry.type === 'payment_given' ? 'green' : 'red'}>
                      {entry.type === 'payment_given' ? 'Payment Given' : 'Bill Submitted'}
                    </Badge>
                    <span className="text-xs text-slate-500">{formatDate(entry.date)}</span>
                  </div>
                  <p className={`mt-2 text-sm font-semibold ${entry.type === 'payment_given' ? 'text-neon-green' : 'text-neon-red'}`}>
                    {entry.type === 'payment_given' ? '+' : '-'}
                    {formatCurrency(Number(entry.amount))}
                  </p>
                  {(entry.description || entry.notes) && <p className="mt-1 text-xs text-slate-500">{entry.description || entry.notes}</p>}
                  <p className="mt-1.5 text-xs text-slate-600">
                    Running balance: <span className="text-slate-400">{formatCurrency(entry.runningBalance)}</span>
                  </p>
                </div>

                <button
                  className="rounded-lg p-1.5 text-slate-500 opacity-0 transition hover:bg-neon-red/10 hover:text-neon-red group-hover:opacity-100"
                  onClick={() => setConfirmEntry(entry)}
                  aria-label={`Delete ${entry.type === 'payment_given' ? 'payment given' : 'bill submitted'} record`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Payment Given" subtitle="Money handed to Khadim Hussain for purchases">
        <div className="space-y-4">
          <div>
            <label className="label-field">Date</label>
            <input type="date" className="input-field" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Amount</label>
            <input type="number" className="input-field" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="label-field">Notes (optional)</label>
            <input className="input-field" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="Optional" />
          </div>
          {paymentError && <p className="text-xs text-neon-red">{paymentError}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSavePayment} disabled={savingPayment}>
              {savingPayment ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={billModalOpen} onClose={() => setBillModalOpen(false)} title="Bill Submitted" subtitle="Invoice submitted by Khadim Hussain">
        <div className="space-y-4">
          <div>
            <label className="label-field">Date</label>
            <input type="date" className="input-field" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Invoice amount</label>
            <input type="number" className="input-field" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="label-field">Description</label>
            <input className="input-field" value={billDescription} onChange={(e) => setBillDescription(e.target.value)} placeholder="e.g. Thread and packing material" />
          </div>
          {billError && <p className="text-xs text-neon-red">{billError}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setBillModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSaveBill} disabled={savingBill}>
              {savingBill ? 'Saving…' : 'Save Bill'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmEntry !== null} onClose={() => setConfirmEntry(null)} title="Delete Record" maxWidth="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">Are you sure you want to delete this record?</p>
          {confirmEntry && (
            <div className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Badge color={confirmEntry.type === 'payment_given' ? 'green' : 'red'}>
                  {confirmEntry.type === 'payment_given' ? 'Payment Given' : 'Bill Submitted'}
                </Badge>
                <span className="text-xs text-slate-500">{formatDate(confirmEntry.date)}</span>
              </div>
              <span className="font-display text-sm font-bold text-white">{formatCurrency(Number(confirmEntry.amount))}</span>
            </div>
          )}
          <p className="text-xs text-slate-500">This cannot be undone. Summary totals will update automatically.</p>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setConfirmEntry(null)} disabled={deletingEntry}>
              Cancel
            </button>
            <button className="btn-danger flex-1" onClick={confirmDeleteEntry} disabled={deletingEntry}>
              {deletingEntry ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
