import { useState } from 'react'
import { Employee } from '@/lib/types'
import { Modal } from '@/components/ui/Modal'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { errorMessage, formatCurrency, todayISO } from '@/lib/utils'

interface GrandAdvanceModalProps {
  open: boolean
  onClose: () => void
  employees: Employee[]
  onSubmit: (input: {
    employeeId: number
    originalAmount: number
    monthlyRecoveryAmount?: number
    issueDate: string
    notes?: string
  }) => Promise<void>
}

export function GrandAdvanceModal({ open, onClose, employees, onSubmit }: GrandAdvanceModalProps) {
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [monthlyRecovery, setMonthlyRecovery] = useState('')
  const [issueDate, setIssueDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedEmployee = employees.find((e) => e.id === employeeId)
  const amountNum = Number(amount) || 0
  const monthlyNum = Number(monthlyRecovery) || 0

  async function handleSubmit() {
    if (!employeeId) {
      setError('Select an employee.')
      return
    }
    if (!amountNum || amountNum <= 0) {
      setError('Enter a valid grand advance amount.')
      return
    }
    if (monthlyNum < 0) {
      setError('Monthly recovery amount cannot be negative.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        employeeId,
        originalAmount: amountNum,
        monthlyRecoveryAmount: monthlyNum || undefined,
        issueDate,
        notes: notes.trim() || undefined,
      })
      setEmployeeId(null)
      setAmount('')
      setMonthlyRecovery('')
      setIssueDate(todayISO())
      setNotes('')
      onClose()
    } catch (err) {
      setError(errorMessage(err, 'Failed to create grand advance.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Grand Advance" subtitle="Long-term employee loan recovered through salary deductions">
      <div className="space-y-4">
        <div>
          <label className="label-field">Employee</label>
          <SearchableSelect
            value={String(employeeId ?? '')}
            onChange={(v) => setEmployeeId(v ? Number(v) : null)}
            options={employees.map((e) => ({ value: String(e.id), label: e.name }))}
            placeholder="Select employee…"
            searchPlaceholder="Search employee…"
            emptyMessage="No employee found"
          />
        </div>

        {selectedEmployee && (
          <div className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 p-3">
            <p className="text-xs text-slate-400">Selected Employee</p>
            <p className="text-sm font-semibold text-white">{selectedEmployee.name}</p>
            <p className="mt-1 text-xs text-slate-500">Monthly Salary: {formatCurrency(selectedEmployee.salary)}</p>
          </div>
        )}

        <div>
          <label className="label-field">Grand Advance Amount (Principal)</label>
          <input
            type="number"
            className="input-field"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 100000"
          />
        </div>

        <div>
          <label className="label-field">Suggested Monthly Recovery Amount (Optional)</label>
          <input
            type="number"
            className="input-field"
            value={monthlyRecovery}
            onChange={(e) => setMonthlyRecovery(e.target.value)}
            placeholder="e.g. 5000"
          />
          <p className="mt-1 text-xs text-slate-500">
            {amountNum > 0 && monthlyNum > 0 ? `Recovery period: ~${Math.ceil(amountNum / monthlyNum)} months` : 'This is optional and can be changed during salary processing'}
          </p>
        </div>

        <div>
          <label className="label-field">Issue Date</label>
          <input type="date" className="input-field" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </div>

        <div>
          <label className="label-field">Notes (Optional)</label>
          <input
            className="input-field"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Medical emergency, Education fees"
          />
        </div>

        {error && <p className="text-xs text-neon-red">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={handleSubmit} disabled={saving || !employeeId || !amountNum}>
            {saving ? 'Creating…' : 'Create Grand Advance'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
