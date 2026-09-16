import { useMemo, useState } from 'react'
import { Plus, Trash2, Wallet } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useMasterData } from '@/context/MasterDataContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { CategoryPicker } from '@/components/expenses/CategoryPicker'
import { MONTH_NAMES } from '@/lib/types'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

const now = new Date()

export function SalaryPage() {
  const { employeesWithBalance, salaryPayments, recordSalaryPayment, deleteSalaryPayment, suggestedDeduction, balanceFor } = useData()
  const { itemsFor, addItem } = useMasterData()
  const [modalOpen, setModalOpen] = useState(false)
  const [employeeName, setEmployeeName] = useState('')
  const [baseAmount, setBaseAmount] = useState('')
  const [piecesCompleted, setPiecesCompleted] = useState('')
  const [overtimeAmount, setOvertimeAmount] = useState('')
  const [deduction, setDeduction] = useState('')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const paymentMethodNames = itemsFor('payment_method').map((i) => i.name)
  // Only active employees can be picked for a NEW payment — historical
  // payments to someone since marked inactive stay untouched below.
  const activeEmployees = useMemo(() => employeesWithBalance.filter((e) => e.is_active), [employeesWithBalance])

  const selectedEmployee = employeesWithBalance.find((e) => e.name === employeeName)
  const isContract = selectedEmployee?.employee_type === 'contract'
  const ratePerPiece = selectedEmployee?.rate_per_piece ?? 0

  const sortedPayments = useMemo(
    () => [...salaryPayments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()),
    [salaryPayments]
  )

  function openCreate() {
    setEmployeeName('')
    setBaseAmount('')
    setPiecesCompleted('')
    setOvertimeAmount('')
    setDeduction('')
    setMonth(now.getMonth() + 1)
    setYear(now.getFullYear())
    setPaymentDate(todayISO())
    setPaymentMethod('')
    setNotes('')
    setError(null)
    setModalOpen(true)
  }

  function handleEmployeeChange(name: string) {
    setEmployeeName(name)
    const emp = employeesWithBalance.find((e) => e.name === name)
    if (!emp) return
    setPiecesCompleted('')
    if (emp.employee_type === 'contract') {
      setBaseAmount('')
      setDeduction('0')
    } else {
      setBaseAmount(String(emp.salary))
      setDeduction(String(suggestedDeduction(name, 'cutting_department', Number(emp.salary))))
    }
  }

  function handlePiecesChange(value: string) {
    setPiecesCompleted(value)
    if (isContract && employeeName) {
      const gross = (Number(value) || 0) * ratePerPiece
      setDeduction(String(suggestedDeduction(employeeName, 'cutting_department', gross)))
    }
  }

  const currentBalance = employeeName ? balanceFor(employeeName, 'cutting_department') : 0
  const pieces = Number(piecesCompleted) || 0
  const base = isContract ? pieces * ratePerPiece : Number(baseAmount) || 0
  const overtime = Number(overtimeAmount) || 0
  const ded = Number(deduction) || 0
  const net = Math.max(0, base + overtime - ded)

  async function handleSave() {
    if (!employeeName) {
      setError('Select an employee.')
      return
    }
    if (isContract) {
      if (Number.isNaN(pieces) || pieces <= 0) {
        setError('Enter a valid number of pieces completed.')
        return
      }
    } else if (Number.isNaN(base) || base < 0) {
      setError('Enter a valid base salary amount.')
      return
    }
    if (overtime < 0) {
      setError('Overtime cannot be negative.')
      return
    }
    if (ded < 0 || ded > base + overtime) {
      setError('Deduction cannot be negative or exceed the gross amount + overtime.')
      return
    }
    if (ded > currentBalance) {
      setError(`Deduction can't exceed the outstanding advance balance (${formatCurrency(currentBalance)}).`)
      return
    }
    if (!paymentMethod) {
      setError('Select a payment method.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await recordSalaryPayment({
        employeeName,
        baseAmount: base,
        overtimeAmount: overtime,
        deductionAmount: ded,
        month,
        year,
        paymentDate,
        notes: notes.trim() || undefined,
        piecesCompleted: isContract ? pieces : null,
        ratePerPiece: isContract ? ratePerPiece : null,
        paymentMethod,
      })
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record salary payment.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this salary payment record? Linked advance deductions will also be removed.')) return
    await deleteSalaryPayment(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Salary</h1>
          <p className="mt-1 text-sm text-slate-400">Monthly payroll. Overtime is added, outstanding advances are auto-deducted.</p>
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
                <th className="px-5 py-3.5">Overtime</th>
                <th className="px-5 py-3.5">Deduction</th>
                <th className="px-5 py-3.5">Net Paid</th>
                <th className="px-5 py-3.5">Method</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Added By</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {sortedPayments.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 font-medium text-white">{p.employee_name}</td>
                  <td className="px-5 py-3.5 text-slate-400">
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">
                    {formatCurrency(p.base_amount)}
                    {p.pieces_completed != null && p.rate_per_piece != null && (
                      <span className="ml-1.5 text-[11px] text-slate-500">
                        ({p.pieces_completed} × {formatCurrency(p.rate_per_piece)})
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {p.overtime_amount > 0 ? (
                      <span className="text-neon-cyan">+{formatCurrency(p.overtime_amount)}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {p.deduction_amount > 0 ? (
                      <Badge color="red">-{formatCurrency(p.deduction_amount)}</Badge>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-neon-green">{formatCurrency(p.net_amount)}</td>
                  <td className="px-5 py-3.5">{p.payment_method ? <Badge color="slate">{p.payment_method}</Badge> : <span className="text-slate-600">—</span>}</td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(p.payment_date)}</td>
                  <td className="px-5 py-3.5 text-slate-500">{p.created_by_username ?? '—'}</td>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Salary Payment" subtitle="Overtime is added, outstanding advances are deducted automatically">
        <div className="space-y-4">
          <div>
            <label className="label-field">Employee</label>
            <select className="input-field" value={employeeName} onChange={(e) => handleEmployeeChange(e.target.value)}>
              <option value="">Select employee…</option>
              {activeEmployees.map((emp) => (
                <option key={emp.id} value={emp.name}>
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

          {isContract ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Pieces completed</label>
                <input
                  type="number"
                  className="input-field"
                  value={piecesCompleted}
                  onChange={(e) => handlePiecesChange(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
              <div>
                <label className="label-field">Rate per piece</label>
                <input type="text" className="input-field opacity-70" value={formatCurrency(ratePerPiece)} readOnly />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Base salary</label>
                <input type="number" className="input-field" value={baseAmount} onChange={(e) => setBaseAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label-field">Overtime</label>
                <input type="number" className="input-field" value={overtimeAmount} onChange={(e) => setOvertimeAmount(e.target.value)} placeholder="0" />
              </div>
            </div>
          )}
          {isContract && (
            <div>
              <label className="label-field">Overtime</label>
              <input type="number" className="input-field" value={overtimeAmount} onChange={(e) => setOvertimeAmount(e.target.value)} placeholder="0" />
            </div>
          )}

          {employeeName && (
            <div>
              <label className="label-field">
                Auto deduction from advance <span className="text-slate-600">(outstanding: {formatCurrency(currentBalance)})</span>
              </label>
              <input type="number" className="input-field" value={deduction} onChange={(e) => setDeduction(e.target.value)} placeholder="0" />
              <div className="mt-2 space-y-1.5 rounded-xl bg-white/[0.02] px-3.5 py-2.5 text-xs text-slate-400">
                {isContract && (
                  <div className="flex items-center justify-between">
                    <span>Pieces Completed</span>
                    <span className="text-slate-300">{pieces}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>{isContract ? 'Gross Amount' : 'Salary Amount'}</span>
                  <span className="text-slate-300">{formatCurrency(base)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Overtime Amount</span>
                  <span className="text-neon-cyan">+{formatCurrency(overtime)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Advances Deducted</span>
                  <span className="text-neon-red">-{formatCurrency(ded)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-1.5 font-semibold">
                  <span className="text-slate-300">Final Payable Amount</span>
                  <span className="text-neon-green">{formatCurrency(net)}</span>
                </div>
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
          <CategoryPicker
            label="Payment Method"
            value={paymentMethod}
            onChange={setPaymentMethod}
            categories={paymentMethodNames}
            onAddCategory={(n) => addItem('payment_method', n).then(() => {})}
          />

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
