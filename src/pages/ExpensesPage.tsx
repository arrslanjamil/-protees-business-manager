import { useMemo, useState } from 'react'
import { Plus, Receipt, Trash2 } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { EXPENSE_CATEGORIES } from '@/lib/types'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

export function ExpensesPage() {
  const { expenses, units, addExpense, deleteExpense } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [unitId, setUnitId] = useState('')
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayISO())
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

  function unitName(id: string | null) {
    return units.find((u) => u.id === id)?.name ?? '—'
  }

  function openCreate() {
    setUnitId('')
    setCategory(EXPENSE_CATEGORIES[0])
    setAmount('')
    setDescription('')
    setDate(todayISO())
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    const amt = Number(amount)
    if (Number.isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await addExpense({ unitId: unitId || null, category, amount: amt, description: description.trim() || undefined, date })
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record expense.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense entry?')) return
    await deleteExpense(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Expenses</h1>
          <p className="mt-1 text-sm text-slate-400">
            This month: <span className="font-semibold text-neon-red">{formatCurrency(totalThisMonth)}</span>
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {sortedExpenses.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses recorded" description="Track rent, utilities, supplies, and other business costs here." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Unit</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.map((exp) => (
                <tr key={exp.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5">
                    <Badge color="amber">{exp.category}</Badge>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-white">{formatCurrency(exp.amount)}</td>
                  <td className="px-5 py-3.5 text-slate-400">{unitName(exp.unit_id)}</td>
                  <td className="px-5 py-3.5 text-slate-400">{exp.description || '—'}</td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(exp.date)}</td>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Category</label>
              <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Amount</label>
              <input type="number" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Unit (optional)</label>
              <select className="input-field" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">Not unit-specific</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Date</label>
              <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-field">Description (optional)</label>
            <input className="input-field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details" />
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
