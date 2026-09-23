import { useMemo, useState } from 'react'
import { HandCoins, Plus, Search, Trash2 } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useCollections } from '@/context/CollectionsContext'
import { useMasterData } from '@/context/MasterDataContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { AdvanceProgressBar } from '@/components/ui/ProgressBar'
import { CategoryPicker } from '@/components/expenses/CategoryPicker'
import { DEPARTMENT_LABELS, isCashPaymentMethod, type Department } from '@/lib/types'
import { advanceWarningLevel, classNames, errorMessage, formatCurrency, formatDate, todayISO } from '@/lib/utils'

export function AdvancesPage() {
  const { employeesWithBalance, supervisorsWithBalance, advances, addAdvance, deleteAdvance } = useData()
  const { cashBalance } = useCollections()
  const { itemsFor, addItem } = useMasterData()
  const [modalOpen, setModalOpen] = useState(false)
  const [department, setDepartment] = useState<Department>('cutting_department')
  const [name, setName] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [allowNegativeCash, setAllowNegativeCash] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCash = isCashPaymentMethod(paymentMethod)
  const amountNum = Number(amount) || 0
  const projectedCashBalance = cashBalance - amountNum
  const wouldGoNegative = isCash && amountNum > 0 && projectedCashBalance < 0

  const paymentMethodNames = itemsFor('payment_method').map((i) => i.name)

  // Outstanding Balances shows every active person, plus any inactive
  // person who still has a real balance to settle — inactive staff with
  // nothing owed just drop off, per the "no longer in staff statistics"
  // rule, but a real debt is never hidden just because someone left.
  const people = useMemo(
    () => [
      ...employeesWithBalance
        .filter((e) => e.is_active || e.advanceBalance !== 0)
        .map((e) => ({ name: e.name, department: 'cutting_department' as Department, payAmount: Number(e.salary), advanceBalance: e.advanceBalance })),
      ...supervisorsWithBalance.map((s) => ({ name: s.name, department: 'protees_unit' as Department, payAmount: 0, advanceBalance: s.advanceBalance })),
    ],
    [employeesWithBalance, supervisorsWithBalance]
  )

  const sortedAdvances = useMemo(
    () => [...advances].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()),
    [advances]
  )

  // Only active people can receive a NEW advance — historical advances to
  // someone since marked inactive remain untouched in Advance History.
  const activeEmployeesWithBalance = useMemo(() => employeesWithBalance.filter((e) => e.is_active), [employeesWithBalance])
  const nameOptions = department === 'cutting_department' ? activeEmployeesWithBalance : supervisorsWithBalance

  const filteredNameOptions = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase()
    if (!q) return nameOptions
    return nameOptions.filter((p) => p.name.toLowerCase().includes(q))
  }, [nameOptions, employeeSearch])

  const selectedPerson = nameOptions.find((p) => p.name === name)

  function openCreate() {
    setDepartment('cutting_department')
    setName('')
    setEmployeeSearch('')
    setAmount('')
    setPaymentDate(todayISO())
    setPaymentMethod('Cash')
    setReferenceNumber('')
    setAllowNegativeCash(false)
    setNotes('')
    setError(null)
    setModalOpen(true)
  }

  function handleDepartmentChange(dept: Department) {
    setDepartment(dept)
    setName('')
    setEmployeeSearch('')
  }

  function handleSelectPerson(personName: string) {
    setName(personName)
    setError(null)
  }

  async function handleSave() {
    const amt = Number(amount)
    if (!name) {
      setError(`Select a ${department === 'cutting_department' ? 'employee' : 'supervisor'}.`)
      return
    }
    if (Number.isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount.')
      return
    }
    if (!paymentMethod) {
      setError('Select a payment method.')
      return
    }
    if (!isCash && !referenceNumber.trim()) {
      setError('Enter a transaction reference for a non-cash payment.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await addAdvance({
        name,
        department,
        amount: amt,
        paymentDate,
        notes: notes.trim() || undefined,
        paymentMethod,
        referenceNumber: isCash ? undefined : referenceNumber.trim(),
        allowNegativeCash,
      })
      setModalOpen(false)
    } catch (err) {
      setError(errorMessage(err, 'Failed to record advance.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this advance entry?')) return
    await deleteAdvance(id)
  }

  const totalOutstanding = people.reduce((sum, p) => sum + Math.max(0, p.advanceBalance), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Advances</h1>
          <p className="mt-1 text-sm text-slate-400">
            Total outstanding across both departments:{' '}
            <span className="font-semibold text-neon-amber">{formatCurrency(totalOutstanding)}</span>
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Give Advance
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Outstanding Balances</h2>
        {people.length === 0 ? (
          <EmptyState icon={HandCoins} title="No people yet" description="Add employees or a supervisor first to give an advance." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {people
              .slice()
              .sort((a, b) => b.advanceBalance - a.advanceBalance)
              .map((p) => {
                const warning = advanceWarningLevel(p.advanceBalance, p.payAmount)
                return (
                  <div key={`${p.department}-${p.name}`} className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{p.name}</p>
                        <Badge color={p.department === 'cutting_department' ? 'cyan' : 'purple'}>{DEPARTMENT_LABELS[p.department]}</Badge>
                      </div>
                      <div className="text-right">
                        <span className="block font-display text-sm font-bold text-white">{formatCurrency(p.advanceBalance)}</span>
                        <Badge color={warning === 'red' ? 'red' : 'green'}>{warning === 'red' ? 'At limit' : 'Healthy'}</Badge>
                      </div>
                    </div>
                    {p.payAmount > 0 && (
                      <div className="mt-3">
                        <AdvanceProgressBar balance={p.advanceBalance} monthlySalary={p.payAmount} />
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Advance History</h2>
        {sortedAdvances.length === 0 ? (
          <EmptyState icon={HandCoins} title="No advances recorded" description="Advances you give will show up here." />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Method</th>
                  <th className="px-5 py-3.5">Notes</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Added By</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {sortedAdvances.map((adv) => (
                  <tr key={adv.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 font-medium text-white">{adv.employee_name}</td>
                    <td className="px-5 py-3.5">
                      <Badge color={adv.department === 'cutting_department' ? 'cyan' : 'purple'}>{DEPARTMENT_LABELS[adv.department]}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-neon-amber">{formatCurrency(adv.amount)}</td>
                    <td className="px-5 py-3.5">
                      {adv.payment_method ? <Badge color="slate">{adv.payment_method}</Badge> : <span className="text-slate-600">—</span>}
                      {adv.reference_number && <p className="mt-0.5 text-[11px] text-slate-500">Ref: {adv.reference_number}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">{adv.notes || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-500">{formatDate(adv.payment_date)}</td>
                    <td className="px-5 py-3.5 text-slate-500">{adv.created_by_username ?? '—'}</td>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Give Advance" subtitle="Record a new advance / loan (qarza)">
        <div className="space-y-4">
          <div>
            <label className="label-field">Department</label>
            <div className="grid grid-cols-2 gap-2">
              {(['cutting_department', 'protees_unit'] as Department[]).map((dept) => (
                <button
                  key={dept}
                  onClick={() => handleDepartmentChange(dept)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    department === dept
                      ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
                      : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {DEPARTMENT_LABELS[dept]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-field">{department === 'cutting_department' ? 'Employee' : 'Supervisor'}</label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="input-field pl-10"
                placeholder="Search Employee Name..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
              />
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-base-900/60">
              {filteredNameOptions.length === 0 ? (
                <p className="px-3.5 py-4 text-center text-sm text-slate-500">No employee found</p>
              ) : (
                filteredNameOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPerson(p.name)}
                    className={classNames(
                      'flex w-full items-center justify-between border-b border-white/5 px-3.5 py-2.5 text-left text-sm transition last:border-0',
                      name === p.name ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-slate-300 hover:bg-white/5'
                    )}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className={name === p.name ? 'text-neon-cyan' : 'text-slate-500'}>{formatCurrency(p.advanceBalance)}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedPerson && (
            <div className="flex items-center justify-between rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 px-3.5 py-2.5">
              <div>
                <p className="text-xs text-slate-400">Employee</p>
                <p className="text-sm font-semibold text-white">{selectedPerson.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Outstanding Advance</p>
                <p className="font-display text-sm font-bold text-neon-amber">{formatCurrency(selectedPerson.advanceBalance)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Amount</label>
              <input type="number" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label-field">Date</label>
              <input type="date" className="input-field" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>
          <CategoryPicker
            label="Payment Method"
            value={paymentMethod}
            onChange={setPaymentMethod}
            categories={paymentMethodNames}
            onAddCategory={(n) => addItem('payment_method', n).then(() => {})}
          />
          {isCash ? (
            <p className="text-[11px] text-slate-500">Deducted from Office Cash immediately (current balance: {formatCurrency(cashBalance)}).</p>
          ) : (
            <div>
              <label className="label-field">Transaction Reference</label>
              <input
                className="input-field"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. Bank transfer ID, Easypaisa TID"
              />
            </div>
          )}
          <div>
            <label className="label-field">Notes (optional)</label>
            <input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Medical emergency" />
          </div>
          {wouldGoNegative && (
            <div className="rounded-xl border border-neon-amber/30 bg-neon-amber/5 p-3">
              <p className="text-xs text-neon-amber">This would take Office Cash to {formatCurrency(projectedCashBalance)} (negative).</p>
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
              {saving ? 'Saving…' : 'Give Advance'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
