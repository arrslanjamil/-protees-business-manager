import { useMemo, useState } from 'react'
import { Banknote, Plus, Receipt, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useData } from '@/context/DataContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { CategoryPicker } from '@/components/expenses/CategoryPicker'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

export function UnitExpensesPage() {
  const { expenses, addExpense, deleteExpense, khadimTotals, expenseCategoryNames, addExpenseCategory } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses]
  )

  const totalThisMonth = useMemo(() => {
    const now = new Date()
    return expenses
      .filter((e) => {
        const d = new Date(e.date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((sum, e) => sum + Number(e.amount), 0)
  }, [expenses])

  function openCreate() {
    setTitle('')
    setCategory('')
    setAmount('')
    setDate(todayISO())
    setNotes('')
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Enter a title.')
      return
    }
    if (!category) {
      setError('Select a category.')
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
      await addExpense({ title: title.trim(), category, amount: amt, date, notes: notes.trim() || undefined })
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record expense.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this expense entry?')) return
    await deleteExpense(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Unit Expenses</h1>
          <p className="mt-1 text-sm text-slate-400">
            This month: <span className="font-semibold text-neon-red">{formatCurrency(totalThisMonth)}</span>
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <Link
        to="/khadim-hussain"
        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 transition hover:border-neon-cyan/30 hover:bg-white/[0.04]"
      >
        <div className="flex items-center gap-2.5">
          <Banknote size={16} className="text-neon-cyan" />
          <span className="text-sm text-slate-300">Khadim Hussain Account balance</span>
        </div>
        <span className={`font-display text-sm font-bold ${khadimTotals.balance === 0 ? 'text-neon-green' : 'text-neon-amber'}`}>
          {khadimTotals.balance === 0 ? '✅ Cleared' : formatCurrency(khadimTotals.balance)}
        </span>
      </Link>

      {sortedExpenses.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses recorded" description="Track thread, fabric, packing, transport, printing, and other unit costs here." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Title</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Notes</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Created By</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.map((exp) => (
                <tr key={exp.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-medium text-white">{exp.title}</td>
                  <td className="px-5 py-3.5">
                    <Badge color="amber">{exp.category}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">{formatCurrency(exp.amount)}</td>
                  <td className="px-5 py-3.5 text-slate-400">{exp.notes || '—'}</td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(exp.date)}</td>
                  <td className="px-5 py-3.5 text-slate-500">{exp.created_by_username ?? '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-red/10 hover:text-neon-red"
                      onClick={() => handleDelete(exp.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Unit Expense">
        <div className="space-y-4">
          <div>
            <label className="label-field">Title</label>
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Thread purchase" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CategoryPicker value={category} onChange={setCategory} categories={expenseCategoryNames} onAddCategory={addExpenseCategory} />
            <div>
              <label className="label-field">Amount</label>
              <input type="number" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="label-field">Date</label>
            <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
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
    </div>
  )
}
