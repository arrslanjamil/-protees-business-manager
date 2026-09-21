import { useMemo, useState } from 'react'
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useCollections } from '@/context/CollectionsContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { CategoryPicker } from '@/components/expenses/CategoryPicker'
import { EXPENSE_PAYMENT_SOURCE_LABELS, EXPENSE_SCOPE_LABELS, type Expense, type ExpensePaymentSource, type ExpenseScope } from '@/lib/types'
import { classNames, formatCurrency, formatDate, todayISO } from '@/lib/utils'

type ScopeFilter = 'all' | ExpenseScope
type SourceFilter = 'all' | ExpensePaymentSource

export function UnitExpensesPage() {
  const { expenses, addExpense, updateExpense, deleteExpense, expenseCategoryNames, addExpenseCategory } = useData()
  const { cashBalance } = useCollections()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [expenseScope, setExpenseScope] = useState<ExpenseScope>('business')
  const [paymentSource, setPaymentSource] = useState<ExpensePaymentSource>('cash')
  const [allowNegativeCash, setAllowNegativeCash] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')

  const sortedExpenses = useMemo(
    () =>
      // Newest first: by expense date, then (same-day expenses) by when they
      // were added, so the latest entry is always on top.
      [...expenses].sort(
        (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at) || b.id - a.id
      ),
    [expenses]
  )

  const filteredExpenses = useMemo(
    () =>
      sortedExpenses
        .filter((e) => scopeFilter === 'all' || e.expense_scope === scopeFilter)
        .filter((e) => sourceFilter === 'all' || e.payment_source === sourceFilter),
    [sortedExpenses, scopeFilter, sourceFilter]
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

  // Projected Office Cash balance if the form were saved right now — used
  // to warn before a cash expense would take the balance negative.
  const projectedCashBalance = useMemo(() => {
    const amt = Number(amount) || 0
    if (paymentSource !== 'cash') return cashBalance
    const oldCashImpact = editingExpense?.payment_source === 'cash' ? Number(editingExpense.amount) : 0
    return cashBalance + oldCashImpact - amt
  }, [cashBalance, paymentSource, amount, editingExpense])
  const wouldGoNegative = paymentSource === 'cash' && projectedCashBalance < 0

  function openCreate() {
    setEditingExpense(null)
    setTitle('')
    setCategory('')
    setAmount('')
    setDate(todayISO())
    setNotes('')
    setExpenseScope('business')
    setPaymentSource('cash')
    setAllowNegativeCash(false)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(exp: Expense) {
    setEditingExpense(exp)
    setTitle(exp.title)
    setCategory(exp.category)
    setAmount(String(exp.amount))
    setDate(exp.date)
    setNotes(exp.notes ?? '')
    setExpenseScope(exp.expense_scope)
    setPaymentSource(exp.payment_source)
    setAllowNegativeCash(false)
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
      const input = {
        title: title.trim(),
        category,
        amount: amt,
        date,
        notes: notes.trim() || undefined,
        expenseScope,
        paymentSource,
        allowNegativeCash,
      }
      if (editingExpense) {
        await updateExpense(editingExpense.id, input)
      } else {
        await addExpense(input)
      }
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
          <h1 className="font-display text-2xl font-bold text-white">Expenses</h1>
          <p className="mt-1 text-sm text-slate-400">
            This month: <span className="font-semibold text-neon-red">{formatCurrency(totalThisMonth)}</span>
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Type:</span>
        {(['all', 'business', 'unit'] as ScopeFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setScopeFilter(f)}
            className={classNames(
              'rounded-xl border px-3.5 py-2 text-xs font-semibold transition',
              scopeFilter === f
                ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
                : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
            )}
          >
            {f === 'all' ? 'All' : EXPENSE_SCOPE_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Payment Source:</span>
        {(['all', 'cash', 'online'] as SourceFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setSourceFilter(f)}
            className={classNames(
              'rounded-xl border px-3.5 py-2 text-xs font-semibold transition',
              sourceFilter === f
                ? 'border-neon-purple/50 bg-neon-purple/10 text-neon-purple'
                : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
            )}
          >
            {f === 'all' ? 'All' : EXPENSE_PAYMENT_SOURCE_LABELS[f]}
          </button>
        ))}
      </div>

      {filteredExpenses.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses recorded" description="Track thread, fabric, packing, transport, printing, and other costs here." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Title</th>
                <th className="px-5 py-3.5">Scope</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Payment Source</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Notes</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Created By</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-medium text-white">{exp.title}</td>
                  <td className="px-5 py-3.5">
                    <Badge color={exp.expense_scope === 'unit' ? 'purple' : 'green'}>{EXPENSE_SCOPE_LABELS[exp.expense_scope]}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge color="amber">{exp.category}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge color={exp.payment_source === 'cash' ? 'cyan' : 'slate'}>{EXPENSE_PAYMENT_SOURCE_LABELS[exp.payment_source]}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">{formatCurrency(exp.amount)}</td>
                  <td className="px-5 py-3.5 text-slate-400">{exp.notes || '—'}</td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(exp.date)}</td>
                  <td className="px-5 py-3.5 text-slate-500">{exp.created_by_username ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white" onClick={() => openEdit(exp)}>
                        <Pencil size={15} />
                      </button>
                      <button
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-red/10 hover:text-neon-red"
                        onClick={() => handleDelete(exp.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingExpense ? 'Edit Expense' : 'Add Expense'}>
        <div className="space-y-4">
          <div>
            <label className="label-field">Expense type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['business', 'unit'] as ExpenseScope[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setExpenseScope(s)}
                  className={classNames(
                    'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                    expenseScope === s
                      ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
                      : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {EXPENSE_SCOPE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-field">
              Payment Source <span className="text-neon-red">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['cash', 'online'] as ExpensePaymentSource[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPaymentSource(s)}
                  className={classNames(
                    'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                    paymentSource === s
                      ? 'border-neon-purple/50 bg-neon-purple/10 text-neon-purple'
                      : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {EXPENSE_PAYMENT_SOURCE_LABELS[s]}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              {paymentSource === 'cash'
                ? `Deducted from Office Cash immediately (current balance: ${formatCurrency(cashBalance)}).`
                : 'Recorded separately — does not affect Office Cash.'}
            </p>
          </div>
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
          {wouldGoNegative && (
            <div className="rounded-xl border border-neon-amber/30 bg-neon-amber/5 p-3">
              <p className="text-xs text-neon-amber">
                This would take Office Cash to {formatCurrency(projectedCashBalance)} (negative).
              </p>
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={allowNegativeCash} onChange={(e) => setAllowNegativeCash(e.target.checked)} />
                Allow negative Office Cash balance and save anyway
              </label>
            </div>
          )}
          {error && <p className="text-xs text-neon-red">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving || (wouldGoNegative && !allowNegativeCash)}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
