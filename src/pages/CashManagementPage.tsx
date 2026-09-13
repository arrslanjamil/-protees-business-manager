import { useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Pencil, Wallet } from 'lucide-react'
import { useCollections } from '@/context/CollectionsContext'
import { useToast } from '@/context/ToastContext'
import { Modal } from '@/components/ui/Modal'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { CASH_IN_CATEGORIES, CASH_OUT_CATEGORIES, type CashTransactionType } from '@/lib/types'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

export function CashManagementPage() {
  const { cashTransactions, cashSettings, cashBalance, bankAccountsWithBalance, recordCashTransaction, updateCashOpeningBalance } = useCollections()
  const { showToast } = useToast()

  const openingBalance = cashSettings?.opening_balance ?? 0
  const totals = useMemo(
    () =>
      cashTransactions.reduce(
        (acc, t) => (t.type === 'cash_in' ? { ...acc, cashIn: acc.cashIn + Number(t.amount) } : { ...acc, cashOut: acc.cashOut + Number(t.amount) }),
        { cashIn: 0, cashOut: 0 }
      ),
    [cashTransactions]
  )
  const bankNameById = useMemo(() => new Map(bankAccountsWithBalance.map((b) => [b.id, b.name])), [bankAccountsWithBalance])
  const sortedTransactions = useMemo(
    () => [...cashTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20),
    [cashTransactions]
  )

  // --- Record cash transaction modal ------------------------------------------
  const [modalOpen, setModalOpen] = useState(false)
  const [txnType, setTxnType] = useState<CashTransactionType>('cash_in')
  const [category, setCategory] = useState<string>(CASH_IN_CATEGORIES[0])
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [bankId, setBankId] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const categories = txnType === 'cash_in' ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES
  const isWithdrawal = txnType === 'cash_in' && category === 'Bank Withdrawal'

  function openModal(type: CashTransactionType) {
    setTxnType(type)
    setCategory(type === 'cash_in' ? CASH_IN_CATEGORIES[0] : CASH_OUT_CATEGORIES[0])
    setAmount('')
    setDate(todayISO())
    setBankId(bankAccountsWithBalance[0]?.id ?? '')
    setNotes('')
    setModalOpen(true)
  }

  async function handleSave() {
    const amt = Number(amount)
    if (Number.isNaN(amt) || amt <= 0) {
      showToast('error', 'Enter a valid amount.')
      return
    }
    if (isWithdrawal && !bankId) {
      showToast('error', 'Select the bank account withdrawn from.')
      return
    }
    setSaving(true)
    try {
      await recordCashTransaction({
        type: txnType,
        category,
        amount: amt,
        date,
        bankAccountId: isWithdrawal ? Number(bankId) : null,
        notes: notes.trim() || undefined,
      })
      showToast('success', 'Cash transaction recorded.')
      setModalOpen(false)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to record transaction.')
    } finally {
      setSaving(false)
    }
  }

  // --- Edit opening balance modal ----------------------------------------------
  const [openingModalOpen, setOpeningModalOpen] = useState(false)
  const [openingInput, setOpeningInput] = useState('')
  const [savingOpening, setSavingOpening] = useState(false)

  function openOpeningModal() {
    setOpeningInput(String(openingBalance))
    setOpeningModalOpen(true)
  }

  async function handleSaveOpening() {
    const value = Number(openingInput)
    if (Number.isNaN(value) || value < 0) {
      showToast('error', 'Enter a valid opening balance.')
      return
    }
    setSavingOpening(true)
    try {
      await updateCashOpeningBalance(value)
      showToast('success', 'Opening balance updated.')
      setOpeningModalOpen(false)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update opening balance.')
    } finally {
      setSavingOpening(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Office Cash Management</h1>
          <p className="mt-1 text-sm text-slate-400">Cash balance derived from opening balance plus the cash-in/cash-out ledger.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => openModal('cash_in')}>
            <ArrowDownCircle size={16} /> Cash In
          </button>
          <button className="btn-secondary" onClick={() => openModal('cash_out')}>
            <ArrowUpCircle size={16} /> Cash Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Opening Balance</p>
            <button className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white" onClick={openOpeningModal} aria-label="Edit opening balance">
              <Pencil size={13} />
            </button>
          </div>
          <p className="mt-1.5 font-display text-xl font-bold text-white">{formatCurrency(openingBalance)}</p>
        </div>
        <StatCard label="Total Cash In" value={formatCurrency(totals.cashIn)} icon={ArrowDownCircle} accent="green" />
        <StatCard label="Total Cash Out" value={formatCurrency(totals.cashOut)} icon={ArrowUpCircle} accent="red" />
        <StatCard label="Closing Cash Balance" value={formatCurrency(cashBalance)} icon={Wallet} accent="cyan" />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Recent Cash Transactions</h2>
        {sortedTransactions.length === 0 ? (
          <EmptyState icon={Wallet} title="No cash transactions yet" description="Cash In / Cash Out entries will show up here." />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Bank</th>
                  <th className="px-5 py-3.5">Notes</th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <span className={t.type === 'cash_in' ? 'text-neon-green' : 'text-neon-red'}>{t.type === 'cash_in' ? 'Cash In' : 'Cash Out'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{t.category}</td>
                    <td className={`px-5 py-3.5 font-semibold ${t.type === 'cash_in' ? 'text-neon-green' : 'text-neon-red'}`}>
                      {t.type === 'cash_in' ? '+' : '−'}
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{formatDate(t.date)}</td>
                    <td className="px-5 py-3.5 text-slate-400">{t.bank_account_id ? bankNameById.get(t.bank_account_id) ?? '—' : '—'}</td>
                    <td className="px-5 py-3.5 text-slate-400">{t.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={txnType === 'cash_in' ? 'Record Cash In' : 'Record Cash Out'}>
        <div className="space-y-4">
          <div>
            <label className="label-field">Category</label>
            <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Amount</label>
              <input type="number" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label-field">Date</label>
              <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          {isWithdrawal && (
            <div>
              <label className="label-field">Withdrawn From</label>
              <select className="input-field" value={bankId} onChange={(e) => setBankId(Number(e.target.value))}>
                {bankAccountsWithBalance.length === 0 && <option value="">No bank accounts — add one first</option>}
                {bankAccountsWithBalance.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-slate-500">This will also debit the selected bank account.</p>
            </div>
          )}
          <div>
            <label className="label-field">Notes (optional)</label>
            <input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Details" />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={openingModalOpen} onClose={() => setOpeningModalOpen(false)} title="Edit Opening Cash Balance" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div>
            <label className="label-field">Opening balance</label>
            <input type="number" className="input-field" value={openingInput} onChange={(e) => setOpeningInput(e.target.value)} placeholder="0" />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setOpeningModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSaveOpening} disabled={savingOpening}>
              {savingOpening ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
