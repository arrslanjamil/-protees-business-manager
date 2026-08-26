import { useMemo, useState } from 'react'
import { HandCoins, Plus, Trash2 } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { AdvanceProgressBar } from '@/components/ui/ProgressBar'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

export function AdvancesPage() {
  const { employeesWithBalance, advances, addAdvance, deleteAdvance } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortedAdvances = useMemo(
    () => [...advances].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [advances]
  )

  function employeeName(id: string) {
    return employeesWithBalance.find((e) => e.id === id)?.name ?? 'Unknown'
  }

  function openCreate() {
    setEmployeeId('')
    setAmount('')
    setReason('')
    setDate(todayISO())
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    const amt = Number(amount)
    if (!employeeId) {
      setError('Select an employee.')
      return
    }
    if (Number.isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await addAdvance({ employeeId, amount: amt, reason: reason.trim() || undefined, date })
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record advance.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this advance entry?')) return
    await deleteAdvance(id)
  }

  const totalOutstanding = employeesWithBalance.reduce((sum, e) => sum + Math.max(0, e.advanceBalance), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Advances / Qarza</h1>
          <p className="mt-1 text-sm text-slate-400">
            Total outstanding across all employees:{' '}
            <span className="font-semibold text-neon-amber">{formatCurrency(totalOutstanding)}</span>
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Give Advance
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Grand Advance Balance</h2>
        {employeesWithBalance.length === 0 ? (
          <EmptyState icon={HandCoins} title="No employees yet" description="Add employees first to give them an advance." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {employeesWithBalance
              .slice()
              .sort((a, b) => b.advanceBalance - a.advanceBalance)
              .map((emp) => (
                <div key={emp.id} className="card">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-white">{emp.name}</p>
                    <span className="font-display text-sm font-bold text-white">{formatCurrency(emp.advanceBalance)}</span>
                  </div>
                  <div className="mt-3">
                    <AdvanceProgressBar balance={emp.advanceBalance} monthlySalary={emp.monthly_salary} />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Advance History</h2>
        {sortedAdvances.length === 0 ? (
          <EmptyState icon={HandCoins} title="No advances recorded" description="Advances you give employees will show up here." />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Reason</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {sortedAdvances.map((adv) => (
                  <tr key={adv.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 font-medium text-white">{employeeName(adv.employee_id)}</td>
                    <td className="px-5 py-3.5 text-neon-amber">{formatCurrency(adv.amount)}</td>
                    <td className="px-5 py-3.5 text-slate-400">{adv.reason || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-500">{formatDate(adv.date)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-red/10 hover:text-neon-red"
                        onClick={() => handleDelete(adv.id)}
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
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Give Advance" subtitle="Record a new advance / loan (qarza) for an employee">
        <div className="space-y-4">
          <div>
            <label className="label-field">Employee</label>
            <select className="input-field" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
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
              <label className="label-field">Amount</label>
              <input type="number" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label-field">Date</label>
              <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-field">Reason (optional)</label>
            <input className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Medical emergency" />
          </div>
          {error && <p className="text-xs text-neon-red">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Give Advance'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
