import { useMemo, useState } from 'react'
import { HeartHandshake, Pencil, Plus, Trash2 } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { MONTH_NAMES } from '@/lib/types'
import { classNames, formatCurrency, formatDate, todayISO } from '@/lib/utils'

const DEFAULT_MONTHLY_BUDGET = 100_000

export function ZakatPage() {
  const { zakatTransactions, zakatSettings, addZakatTransaction, deleteZakatTransaction, updateZakatBudget } = useData()

  const now = new Date()
  const [viewAll, setViewAll] = useState(false)
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())

  const monthlyBudget = zakatSettings?.monthly_budget ?? DEFAULT_MONTHLY_BUDGET

  const yearOptions = useMemo(() => {
    const years = new Set<number>([now.getFullYear()])
    for (const t of zakatTransactions) years.add(new Date(t.date).getFullYear())
    return Array.from(years).sort((a, b) => b - a)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zakatTransactions])

  const sortedTransactions = useMemo(
    () => [...zakatTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [zakatTransactions]
  )

  const filteredTransactions = useMemo(() => {
    if (viewAll) return sortedTransactions
    return sortedTransactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() === month && d.getFullYear() === year
    })
  }, [sortedTransactions, viewAll, month, year])

  const distributed = filteredTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
  const remaining = Math.max(0, monthlyBudget - distributed)
  const percent = monthlyBudget > 0 ? Math.min(100, Math.round((distributed / monthlyBudget) * 100)) : 0

  // --- Add entry modal -------------------------------------------------------
  const [modalOpen, setModalOpen] = useState(false)
  const [recipientName, setRecipientName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setRecipientName('')
    setAmount('')
    setDate(todayISO())
    setNotes('')
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!recipientName.trim()) {
      setError('Enter a recipient name.')
      return
    }
    const amt = Number(amount)
    if (Number.isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await addZakatTransaction({ recipientName: recipientName.trim(), amount: amt, date, notes: notes.trim() || undefined })
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record Zakat distribution.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this Zakat record?')) return
    await deleteZakatTransaction(id)
  }

  // --- Edit budget modal -------------------------------------------------------
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)
  const [budgetError, setBudgetError] = useState<string | null>(null)

  function openBudgetModal() {
    setBudgetInput(String(monthlyBudget))
    setBudgetError(null)
    setBudgetModalOpen(true)
  }

  async function handleSaveBudget() {
    const value = Number(budgetInput)
    if (Number.isNaN(value) || value <= 0) {
      setBudgetError('Enter a valid budget amount.')
      return
    }
    setSavingBudget(true)
    setBudgetError(null)
    try {
      await updateZakatBudget(value)
      setBudgetModalOpen(false)
    } catch (err) {
      setBudgetError(err instanceof Error ? err.message : 'Failed to update budget.')
    } finally {
      setSavingBudget(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Zakat Management</h1>
          <p className="mt-1 text-sm text-slate-400">Track Zakat distributions against the monthly budget.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Record Distribution
        </button>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Monthly Zakat Budget</p>
            <p className="mt-1.5 font-display text-2xl font-bold text-white">{formatCurrency(monthlyBudget)}</p>
          </div>
          <button className="btn-secondary" onClick={openBudgetModal}>
            <Pencil size={14} /> Edit Budget
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <select className="input-field w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))} disabled={viewAll}>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select className="input-field w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))} disabled={viewAll}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setViewAll((v) => !v)}
            className={classNames(
              'ml-auto rounded-xl border px-3.5 py-2 text-xs font-semibold transition',
              viewAll ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
            )}
          >
            {viewAll ? 'Showing All History' : 'View All History'}
          </button>
        </div>

        {!viewAll && (
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Zakat Progress</p>
            <div className="mt-3 grid grid-cols-3 gap-4 text-center sm:text-left">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Monthly Target</p>
                <p className="mt-1 font-display text-lg font-bold text-white">{formatCurrency(monthlyBudget)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Distributed</p>
                <p className="mt-1 font-display text-lg font-bold text-neon-green">{formatCurrency(distributed)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Remaining</p>
                <p className={classNames('mt-1 font-display text-lg font-bold', remaining > 0 ? 'text-neon-amber' : 'text-neon-green')}>
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-slate-400">Progress</span>
                <span className="font-semibold text-neon-green">{percent}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full border border-white/5 bg-base-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-green transition-all duration-500 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          {viewAll ? 'Full Zakat History' : `Distributions — ${MONTH_NAMES[month]} ${year}`}
        </h2>
        {filteredTransactions.length === 0 ? (
          <EmptyState icon={HeartHandshake} title="No Zakat distributions" description="Recorded distributions will show up here." />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Recipient</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Notes</th>
                  <th className="px-5 py-3.5">Recorded By</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 font-medium text-white">{t.recipient_name}</td>
                    <td className="px-5 py-3.5 font-semibold text-neon-green">{formatCurrency(t.amount)}</td>
                    <td className="px-5 py-3.5 text-slate-500">{formatDate(t.date)}</td>
                    <td className="px-5 py-3.5 text-slate-400">{t.notes || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-500">{t.created_by_username ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-red/10 hover:text-neon-red" onClick={() => handleDelete(t.id)}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Zakat Distribution">
        <div className="space-y-4">
          <div>
            <label className="label-field">Recipient name</label>
            <input className="input-field" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. Ahmed Family" />
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
          <div>
            <label className="label-field">Notes (optional)</label>
            <input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Details" />
          </div>
          {error && <p className="text-xs text-neon-red">{error}</p>}
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

      <Modal open={budgetModalOpen} onClose={() => setBudgetModalOpen(false)} title="Edit Monthly Zakat Budget" maxWidth="max-w-sm">
        <div className="space-y-4">
          <div>
            <label className="label-field">Monthly budget</label>
            <input type="number" className="input-field" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} placeholder="100000" />
          </div>
          {budgetError && <p className="text-xs text-neon-red">{budgetError}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setBudgetModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSaveBudget} disabled={savingBudget}>
              {savingBudget ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
