import { useMemo, useState } from 'react'
import { Plus, Trash2, Wallet } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { MONTH_NAMES } from '@/lib/types'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

const now = new Date()

export function SalaryPage() {
  const { employeesWithBalance, salaryPayments, recordSalaryPayment, deleteSalaryPayment, suggestedDeduction, balanceFor } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [baseAmount, setBaseAmount] = useState('')
  const [deduction, setDeduction] = useState('')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortedPayments = useMemo(
    () => [...salaryPayments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()),
    [salaryPayments]
  )

  function employeeName(id: string) {
    return employeesWithBalance.find((e) => e.id === id)?.name ?? 'Unknown'
  }

  function openCreate() {
    setEmployeeId('')
    setBaseAmount('')
    setDeduction('')
    setMonth(now.getMonth() + 1)
    setYear(now.getFullYear())
    setPaymentDate(todayISO())
    setNotes('')
    setError(null)
    setModalOpen(true)
  }

  function handleEmployeeChange(id: string) {
    setEmployeeId(id)
    const emp = employeesWithBalance.find((e) => e.id === id)
    if (emp) {
      setBaseAmount(String(emp.monthly_salary))
      setDeduction(String(suggestedDeduction(id, Number(emp.monthly_salary))))
    }
  }

  const currentBalance = employeeId ? balanceFor(employeeId) : 0
  const base = Number(baseAmount) || 0
  const ded = Number(deduction) || 0
  const net = Math.max(0, base - ded)

  async function handleSave() {
    if (!employeeId) {
      setError('Select an employee.')
      return
    }
    if (Number.isNaN(base) || base < 0) {
      setError('Enter a valid base salary amount.')
      return
    }
    if (ded < 0 || ded > base) {
      setError('Deduction cannot be negative or exceed the base salary.')
      return
    }
    if (ded > currentBalance) {
      setError(`Deduction can't exceed the outstanding advance balance (${formatCurrency(currentBalance)}).`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await recordSalaryPayment({
        employeeId,
        baseAmount: base,
        deductionAmount: ded,
        month,
        year,
        paymentDate,
        notes: notes.trim() || undefined,
      })
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record salary payment.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this salary payment record? Linked advance deductions will also be removed.')) return
    await deleteSalaryPayment(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Salary</h1>
          <p className="mt-1 text-sm text-slate-400">Record payments — outstanding advances are auto-deducted.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Record Payment
        </button>
      </div>

      {sortedPayments.length === 0 ? (
        <EmptyState icon={Wallet} title="No salary payments yet" description="Record your first salary payment to see history here." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Period</th>
                <th className="px-5 py-3.5">Base</th>
                <th className="px-5 py-3.5">Deduction</th>
                <th className="px-5 py-3.5">Net Paid</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {sortedPayments.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-medium text-white">{employeeName(p.employee_id)}</td>
                  <td className="px-5 py-3.5 text-slate-400">
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">{formatCurrency(p.base_amount)}</td>
                  <td className="px-5 py-3.5">
                    {p.deduction_amount > 0 ? (
                      <Badge color="red">-{formatCurrency(p.deduction_amount)}</Badge>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-neon-green">{formatCurrency(p.net_amount)}</td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(p.payment_date)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-red/10 hover:text-neon-red"
                      onClick={() => handleDelete(p.id)}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Salary Payment" subtitle="Outstanding advances are deducted automatically">
        <div className="space-y-4">
          <div>
            <label className="label-field">Employee</label>
            <select className="input-field" value={employeeId} onChange={(e) => handleEmployeeChange(e.target.value)}>
              <option value="">Select employee…</option>
              {employeesWithBalance.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Month</label>
              <select className="input-field" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Year</label>
              <input type="number" className="input-field" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="label-field">Base salary</label>
            <input type="number" className="input-field" value={baseAmount} onChange={(e) => setBaseAmount(e.target.value)} placeholder="0" />
          </div>

          {employeeId && (
            <div>
              <label className="label-field">
                Auto deduction from advance <span className="text-slate-600">(outstanding: {formatCurrency(currentBalance)})</span>
              </label>
              <input type="number" className="input-field" value={deduction} onChange={(e) => setDeduction(e.target.value)} placeholder="0" />
              <div className="mt-2 flex items-center justify-between rounded-xl bg-white/[0.02] px-3.5 py-2.5">
                <span className="text-xs text-slate-400">Net pay</span>
                <span className="font-display text-sm font-bold text-neon-green">{formatCurrency(net)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Payment date</label>
              <input type="date" className="input-field" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div>
              <label className="label-field">Notes (optional)</label>
              <input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {error && <p className="text-xs text-neon-red">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
