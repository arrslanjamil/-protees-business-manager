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

type AdvanceType = 'normal' | 'grand'
type HistoryFilter = 'all' | 'normal' | 'grand'

export function AdvancesPage() {
  const { employeesWithBalance, supervisorsWithBalance, employees, advances, grandAdvances, addAdvance, deleteAdvance, addGrandAdvance, deleteGrandAdvance } = useData()
  const { cashBalance, bankAccountsWithBalance } = useCollections()
  const { itemsFor, addItem } = useMasterData()
  const [advanceType, setAdvanceType] = useState<AdvanceType>('normal')
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [department, setDepartment] = useState<Department>('cutting_department')
  const [name, setName] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [bankAccountId, setBankAccountId] = useState<number | null>(null)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [allowNegativeCash, setAllowNegativeCash] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null)

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

  const combinedAdvances = useMemo(() => {
    const normalAdvs = advances.map((a) => ({ ...a, type: 'normal' as const }))
    const grandAdvs = grandAdvances.map((ga) => ({
      id: ga.id,
      employee_name: employees.find((e) => e.id === ga.employee_id)?.name ?? 'Unknown',
      amount: ga.original_amount,
      payment_date: ga.issue_date,
      department: 'unknown' as any,
      payment_method: null,
      reference_number: null,
      notes: ga.notes,
      created_by_username: ga.created_by_username,
      type: 'grand' as const,
      outstanding_balance: ga.outstanding_balance,
      total_recovered: ga.total_recovered,
    }))
    return [...normalAdvs, ...grandAdvs] as any[]
  }, [advances, grandAdvances, employees])

  const filteredCombinedAdvances = useMemo(
    () =>
      combinedAdvances
        .filter((a) => (historyFilter === 'all' ? true : historyFilter === 'normal' ? a.type === 'normal' : a.type === 'grand'))
        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()),
    [combinedAdvances, historyFilter]
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

  function resetForm() {
    setDepartment('cutting_department')
    setName('')
    setEmployeeSearch('')
    setAmount('')
    setPaymentDate(todayISO())
    setPaymentMethod('Cash')
    setBankAccountId(null)
    setReferenceNumber('')
    setAllowNegativeCash(false)
    setNotes('')
    setError(null)
    setAdvanceType('normal')
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
        bankAccountId: isCash ? undefined : bankAccountId ?? undefined,
        allowNegativeCash,
      })
      setModalOpen(false)
    } catch (err) {
      setError(errorMessage(err, 'Failed to record advance.'))
    } finally {
      setSaving(false)
    }
  }

  const totalOutstanding = people.reduce((sum, p) => sum + Math.max(0, p.advanceBalance), 0)

  const filteredPeople = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return people
    return people.filter((p) => p.name.toLowerCase().includes(q))
  }, [people, searchQuery])

  const personAdvancesHistory = useMemo(() => {
    if (!expandedPerson) return []
    return filteredCombinedAdvances.filter((a) => a.employee_name === expandedPerson)
  }, [expandedPerson, filteredCombinedAdvances])

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
        <button className="btn-primary" onClick={() => { resetForm(); setModalOpen(true) }}>
          <Plus size={16} /> Give Advance
        </button>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Outstanding Balances</h2>
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="input-field pl-10"
              placeholder="Search employee…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        {people.length === 0 ? (
          <EmptyState icon={HandCoins} title="No people yet" description="Add employees or a supervisor first to give an advance." />
        ) : filteredPeople.length === 0 ? (
          <EmptyState icon={Search} title="No matches" description="No employee found matching your search." />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredPeople
                .slice()
                .sort((a, b) => b.advanceBalance - a.advanceBalance)
                .map((p) => {
                  const warning = advanceWarningLevel(p.advanceBalance, p.payAmount)
                  const isExpanded = expandedPerson === p.name
                  return (
                    <div key={`${p.department}-${p.name}`} className="flex flex-col">
                      <button
                        onClick={() => setExpandedPerson(isExpanded ? null : p.name)}
                        className="card h-40 w-full text-left transition hover:border-white/20"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-white">{p.name}</p>
                            <Badge color={p.department === 'cutting_department' ? 'cyan' : 'purple'}>{DEPARTMENT_LABELS[p.department]}</Badge>
                          </div>
                          <div className="text-right">
                            <span className="block font-display text-sm font-bold text-white">{formatCurrency(p.advanceBalance)}</span>
                            {warning === 'red' && <Badge color="red">At limit</Badge>}
                          </div>
                        </div>
                        {p.payAmount > 0 && (
                          <div className="mt-3">
                            <AdvanceProgressBar balance={p.advanceBalance} monthlySalary={p.payAmount} />
                          </div>
                        )}
                        <p className="mt-2 text-xs text-slate-400">{isExpanded ? 'Click to close' : 'Click to view history'}</p>
                      </button>

                      {isExpanded && personAdvancesHistory.length > 0 && (
                        <div className="card mt-4 border-neon-cyan/30 bg-neon-cyan/5 p-4">
                          <h3 className="mb-3 text-sm font-semibold text-neon-cyan">Advance History</h3>
                          <div className="space-y-2 text-xs">
                            {personAdvancesHistory.map((adv) => (
                              <div key={`${adv.type}-${adv.id}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-2.5">
                                <div>
                                  <p className="font-medium text-white">
                                    {adv.type === 'grand' ? '💼 Grand Advance' : '💰 Advance'}
                                  </p>
                                  <p className="text-slate-400">{formatDate(adv.payment_date)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-neon-amber">{formatCurrency(adv.amount)}</p>
                                  {adv.type === 'grand' && (
                                    <p className={`text-xs ${adv.outstanding_balance === 0 ? 'text-neon-green' : 'text-neon-amber'}`}>
                                      {adv.outstanding_balance === 0 ? 'Completed' : `Outstanding: ${formatCurrency(adv.outstanding_balance)}`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isExpanded && personAdvancesHistory.length === 0 && (
                        <div className="card mt-4 border-slate-600 bg-slate-700/20 p-4">
                          <p className="text-sm text-slate-400">No advance history for this person.</p>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Advance History</h2>
          <div className="flex gap-2">
            {(['all', 'normal', 'grand'] as HistoryFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={classNames(
                  'rounded-xl border px-3 py-1.5 text-xs font-semibold capitalize transition',
                  historyFilter === f
                    ? f === 'grand'
                      ? 'border-neon-amber/50 bg-neon-amber/10 text-neon-amber'
                      : 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
                    : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                )}
              >
                {f === 'all' ? 'All' : f === 'normal' ? 'Normal Advances' : 'Grand Advances'}
              </button>
            ))}
          </div>
        </div>
        {filteredCombinedAdvances.length === 0 ? (
          <EmptyState icon={HandCoins} title="No advances recorded" description="Advances you give will show up here." />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">{historyFilter === 'grand' ? 'Outstanding' : 'Method'}</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Notes</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filteredCombinedAdvances.map((adv) => (
                  <tr key={`${adv.type}-${adv.id}`} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <Badge color={adv.type === 'grand' ? 'amber' : 'cyan'}>
                        {adv.type === 'grand' ? 'Grand Advance' : 'Advance'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-white">{adv.employee_name}</td>
                    <td className="px-5 py-3.5 text-neon-amber">{formatCurrency(adv.amount)}</td>
                    <td className="px-5 py-3.5">
                      {adv.type === 'grand' ? (
                        <span className="text-slate-400">{formatCurrency(adv.outstanding_balance)}</span>
                      ) : adv.payment_method ? (
                        <Badge color="slate">{adv.payment_method}</Badge>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {adv.type === 'grand' ? (
                        <Badge color={adv.outstanding_balance === 0 ? 'green' : 'amber'}>
                          {adv.outstanding_balance === 0 ? 'Completed' : 'Active'}
                        </Badge>
                      ) : (
                        <Badge color="slate">—</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{formatDate(adv.payment_date)}</td>
                    <td className="px-5 py-3.5 text-slate-400">{adv.notes || '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-neon-red/10 hover:text-neon-red"
                        onClick={async () => {
                          if (!confirm(`Delete this ${adv.type === 'grand' ? 'grand' : ''} advance?`)) return
                          if (adv.type === 'grand') {
                            await deleteGrandAdvance(adv.id)
                          } else {
                            await deleteAdvance(adv.id)
                          }
                        }}
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

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title="Give Advance" subtitle="Record a new advance / loan (qarza)">
        <div className="mb-6 space-y-4">
          <div>
            <label className="label-field">Advance Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAdvanceType('normal')}
                className={classNames(
                  'flex-1 rounded-lg px-4 py-3 font-semibold transition-all duration-200',
                  advanceType === 'normal'
                    ? 'bg-neon-cyan text-slate-950 shadow-lg shadow-neon-cyan/20'
                    : 'border border-slate-600 bg-slate-700/30 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
                )}
              >
                Advance
              </button>
              <button
                onClick={() => setAdvanceType('grand')}
                className={classNames(
                  'flex-1 rounded-lg px-4 py-3 font-semibold transition-all duration-200',
                  advanceType === 'grand'
                    ? 'bg-neon-amber text-slate-950 shadow-lg shadow-neon-amber/20'
                    : 'border border-slate-600 bg-slate-700/30 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
                )}
              >
                Grand Advance
              </button>
            </div>
          </div>
        </div>

        {advanceType === 'normal' ? (
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
              <>
                <div>
                  <label className="label-field">Bank Account</label>
                  <select
                    className="input-field"
                    value={bankAccountId ?? ''}
                    onChange={(e) => setBankAccountId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Select a bank account</option>
                    {bankAccountsWithBalance.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name} ({formatCurrency(bank.balance)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-field">Transaction Reference</label>
                  <input
                    className="input-field"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. Bank transfer ID, Easypaisa TID"
                  />
                </div>
              </>
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
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label-field">Employee</label>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="input-field pl-10"
                  placeholder="Search employee…"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                />
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-base-900/60">
                {employees.length === 0 ? (
                  <p className="px-3.5 py-4 text-center text-sm text-slate-500">No employee found</p>
                ) : (
                  employees
                    .filter((e) => e.name.toLowerCase().includes(employeeSearch.toLowerCase()))
                    .map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => { setName(emp.name); setEmployeeSearch(''); setError(null) }}
                        className={classNames(
                          'w-full border-b border-white/5 px-3.5 py-2.5 text-left text-sm transition last:border-0',
                          name === emp.name ? 'bg-neon-amber/10 text-neon-amber' : 'text-slate-300 hover:bg-white/5'
                        )}
                      >
                        <span className="font-medium">{emp.name}</span>
                      </button>
                    ))
                )}
              </div>
            </div>

            {employees.find((e) => e.name === name) && (
              <div className="flex items-center justify-between rounded-xl border border-neon-amber/20 bg-neon-amber/5 px-3.5 py-2.5">
                <div>
                  <p className="text-xs text-slate-400">Selected Employee</p>
                  <p className="text-sm font-semibold text-white">{name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Monthly Salary</p>
                  <p className="font-display text-sm font-bold text-neon-amber">{formatCurrency(employees.find((e) => e.name === name)?.salary || 0)}</p>
                </div>
              </div>
            )}

            <div>
              <label className="label-field">Grand Advance Amount</label>
              <input
                type="number"
                className="input-field"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 100000"
              />
            </div>

            <div>
              <label className="label-field">Suggested Monthly Recovery (Optional)</label>
              <input
                type="number"
                className="input-field"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. 5000"
              />
              <p className="mt-1 text-xs text-slate-500">
                {Number(amount) > 0 && Number(referenceNumber) > 0
                  ? `Recovery period: ~${Math.ceil(Number(amount) / Number(referenceNumber))} months`
                  : 'This is optional and can be changed during salary processing'}
              </p>
            </div>

            <div>
              <label className="label-field">Issue Date</label>
              <input type="date" className="input-field" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
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
              <button className="btn-secondary flex-1" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary flex-1"
                onClick={async () => {
                  const emp = employees.find((e) => e.name === name)
                  if (!emp) {
                    setError('Select an employee.')
                    return
                  }
                  const amt = Number(amount)
                  if (!amt || amt <= 0) {
                    setError('Enter a valid grand advance amount.')
                    return
                  }
                  const monthly = Number(referenceNumber) || 0
                  if (monthly < 0) {
                    setError('Monthly recovery amount cannot be negative.')
                    return
                  }
                  setSaving(true)
                  setError(null)
                  try {
                    await addGrandAdvance({
                      employeeId: emp.id,
                      originalAmount: amt,
                      monthlyRecoveryAmount: monthly || undefined,
                      issueDate: paymentDate,
                      notes: notes.trim() || undefined,
                    })
                    setModalOpen(false)
                    resetForm()
                  } catch (err) {
                    setError(errorMessage(err, 'Failed to create grand advance.'))
                  } finally {
                    setSaving(false)
                  }
                }}
                disabled={saving || !name || !amount}
              >
                {saving ? 'Creating…' : 'Create Grand Advance'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
