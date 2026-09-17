import { useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, Pencil, Plus, Search, Trash2, TrendingUp, Users } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { ToggleSwitch } from '@/components/ui/ToggleSwitch'
import { AdvanceProgressBar } from '@/components/ui/ProgressBar'
import { EmployeeTransactionHistory } from '@/components/employees/EmployeeTransactionHistory'
import { SalaryHistoryTimeline } from '@/components/employees/SalaryHistoryTimeline'
import { EMPLOYEE_GROUP_LABELS, EMPLOYEE_TYPE_LABELS, INCREMENT_TYPE_LABELS, type Employee, type EmployeeGroup, type EmployeeType, type IncrementType } from '@/lib/types'
import { classNames, formatCurrency, formatDate, todayISO } from '@/lib/utils'

type StatusFilter = 'all' | 'active' | 'inactive'
type ExpandedTab = 'transactions' | 'salary-history'

const emptyForm = {
  name: '',
  salary: '',
  joinDate: todayISO(),
  employeeType: 'monthly' as EmployeeType,
  ratePerPiece: '',
  employeeGroup: 'regular' as EmployeeGroup,
}

export function EmployeesPage() {
  const { employeesWithBalance, addEmployee, updateEmployee, deleteEmployee, setEmployeeActive, addSalaryIncrement } = useData()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedTab, setExpandedTab] = useState<ExpandedTab>('transactions')

  function toggleExpanded(id: number) {
    setExpandedId((prev) => (prev === id ? null : id))
    setExpandedTab('transactions')
  }

  const activeCount = useMemo(() => employeesWithBalance.filter((e) => e.is_active).length, [employeesWithBalance])
  const inactiveCount = employeesWithBalance.length - activeCount

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return employeesWithBalance
      .filter((e) => (q ? e.name.toLowerCase().includes(q) : true))
      .filter((e) => (statusFilter === 'all' ? true : statusFilter === 'active' ? e.is_active : !e.is_active))
      // Active employees always first; inactive move to the bottom.
      .sort((a, b) => Number(b.is_active) - Number(a.is_active))
  }, [employeesWithBalance, search, statusFilter])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(emp: Employee) {
    setEditing(emp)
    setForm({
      name: emp.name,
      salary: String(emp.salary ?? ''),
      joinDate: emp.join_date ?? todayISO(),
      employeeType: emp.employee_type,
      ratePerPiece: emp.rate_per_piece != null ? String(emp.rate_per_piece) : '',
      employeeGroup: emp.employee_group,
    })
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    const isContract = form.employeeType === 'contract'
    let ratePerPiece: number | null = null
    if (isContract) {
      ratePerPiece = Number(form.ratePerPiece)
      if (Number.isNaN(ratePerPiece) || ratePerPiece <= 0) {
        setError('Enter a valid rate per piece.')
        return
      }
    }
    // Contract employees don't have a fixed monthly salary — store 0 so
    // existing salary-dependent displays (advance risk bar, etc.) degrade
    // gracefully instead of needing a nullable column everywhere.
    const salary = isContract ? 0 : Number(form.salary)
    if (!isContract && (Number.isNaN(salary) || salary < 0)) {
      setError('Enter a valid monthly salary.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        salary,
        joinDate: form.joinDate || null,
        employeeType: form.employeeType,
        ratePerPiece,
        employeeGroup: form.employeeGroup,
      }
      if (editing) {
        await updateEmployee(editing.id, payload)
      } else {
        await addEmployee(payload)
      }
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`Delete ${emp.name}? This does not remove their salary and advance history (linked by name).`)) return
    await deleteEmployee(emp.id)
  }

  async function handleToggleActive(emp: Employee, next: boolean) {
    await setEmployeeActive(emp.id, next)
  }

  // --- Increment Salary modal --------------------------------------------------
  const [incrementModalOpen, setIncrementModalOpen] = useState(false)
  const [incrementEmployee, setIncrementEmployee] = useState<Employee | null>(null)
  const [incrementType, setIncrementType] = useState<IncrementType>('fixed')
  const [incrementValue, setIncrementValue] = useState('')
  const [incrementDate, setIncrementDate] = useState(todayISO())
  const [incrementNotes, setIncrementNotes] = useState('')
  const [savingIncrement, setSavingIncrement] = useState(false)
  const [incrementError, setIncrementError] = useState<string | null>(null)

  function openIncrementModal(emp: Employee) {
    setIncrementEmployee(emp)
    setIncrementType('fixed')
    setIncrementValue('')
    setIncrementDate(todayISO())
    setIncrementNotes('')
    setIncrementError(null)
    setIncrementModalOpen(true)
  }

  const incrementValueNum = Number(incrementValue) || 0
  const incrementPreviousSalary = Number(incrementEmployee?.salary ?? 0)
  const incrementAmountPreview = incrementType === 'percentage' ? Math.round((incrementPreviousSalary * incrementValueNum) / 100) : incrementValueNum
  const incrementNewSalaryPreview = incrementPreviousSalary + incrementAmountPreview

  async function handleSaveIncrement() {
    if (!incrementEmployee) return
    if (incrementValueNum <= 0) {
      setIncrementError('Enter a valid increment amount.')
      return
    }
    setSavingIncrement(true)
    setIncrementError(null)
    try {
      await addSalaryIncrement({
        employeeId: incrementEmployee.id,
        incrementType,
        incrementValue: incrementValueNum,
        incrementDate,
        notes: incrementNotes.trim() || undefined,
      })
      setIncrementModalOpen(false)
    } catch (err) {
      setIncrementError(err instanceof Error ? err.message : 'Failed to apply increment.')
    } finally {
      setSavingIncrement(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Employees</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your team, salaries, and advance exposure. <span className="text-neon-green">{activeCount} active</span> ·{' '}
            <span className="text-neon-red">{inactiveCount} inactive</span>
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Employee
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input-field pl-10"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'inactive'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={classNames(
                'rounded-xl border px-3.5 py-2 text-xs font-semibold capitalize transition',
                statusFilter === f
                  ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
                  : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
              )}
            >
              {f === 'all' ? 'All Staff' : f === 'active' ? 'Active Staff' : 'Inactive Staff'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No employees found" description="Add your first employee to get started." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((emp) => {
            const isExpanded = expandedId === emp.id
            return (
              <div
                key={emp.id}
                className={classNames(
                  'card group flex flex-col transition-colors',
                  isExpanded && 'md:col-span-2 xl:col-span-3 border-neon-cyan/30',
                  !emp.is_active && '!border-neon-red/30 !bg-neon-red/[0.04]'
                )}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpanded(emp.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleExpanded(emp.id)
                    }
                  }}
                  className="flex cursor-pointer items-start justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 font-display text-sm font-bold text-white">
                      {emp.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{emp.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge color={emp.is_active ? 'green' : 'red'}>{emp.is_active ? 'Active' : 'Inactive'}</Badge>
                        <Badge color={emp.employee_type === 'contract' ? 'purple' : 'cyan'}>{EMPLOYEE_TYPE_LABELS[emp.employee_type]}</Badge>
                        {emp.employee_group === 'unit' && <Badge color="amber">{EMPLOYEE_GROUP_LABELS.unit}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEdit(emp)
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-neon-red/10 hover:text-neon-red"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(emp)
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ToggleSwitch
                        checked={emp.is_active}
                        onChange={(next) => handleToggleActive(emp, next)}
                        label={emp.is_active ? `Mark ${emp.name} inactive` : `Mark ${emp.name} active`}
                      />
                    </div>
                    <ChevronDown size={16} className={classNames('text-slate-500 transition-transform', isExpanded && 'rotate-180 text-neon-cyan')} />
                  </div>
                </div>

                {emp.join_date && (
                  <p className="mt-3 flex items-center gap-1 text-[11px] text-slate-500">
                    <CalendarDays size={11} /> Joined {formatDate(emp.join_date)} · Added by {emp.created_by_username ?? '—'}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-3.5">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      {emp.employee_type === 'contract' ? 'Rate Per Piece' : 'Current Salary'}
                    </p>
                    <p className="mt-1 font-display text-xl font-bold text-white">
                      {emp.employee_type === 'contract' ? formatCurrency(emp.rate_per_piece ?? 0) : formatCurrency(emp.salary)}
                    </p>
                  </div>
                  {emp.employee_type === 'monthly' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openIncrementModal(emp)
                      }}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neon-green/30 bg-neon-green/10 px-3 py-1.5 text-xs font-semibold text-neon-green transition hover:bg-neon-green/20"
                    >
                      <TrendingUp size={13} /> Increment
                    </button>
                  )}
                </div>

                <div className="mt-3">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">Advance Balance</p>
                  <AdvanceProgressBar balance={emp.advanceBalance} monthlySalary={emp.salary} />
                </div>

                {isExpanded && (
                  <div onClick={(e) => e.stopPropagation()} className="mt-5 border-t border-white/5 pt-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedTab('transactions')}
                        className={classNames(
                          'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                          expandedTab === 'transactions' ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-slate-500 hover:text-slate-300'
                        )}
                      >
                        Transaction History
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedTab('salary-history')}
                        className={classNames(
                          'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                          expandedTab === 'salary-history' ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-slate-500 hover:text-slate-300'
                        )}
                      >
                        Salary History
                      </button>
                    </div>
                    {expandedTab === 'transactions' ? (
                      <EmployeeTransactionHistory employeeId={emp.id} employeeName={emp.name} />
                    ) : (
                      <SalaryHistoryTimeline employee={emp} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Employee' : 'Add Employee'}>
        <div className="space-y-4">
          <div>
            <label className="label-field">Full name</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ali Raza" />
          </div>
          <div>
            <label className="label-field">Employee type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['monthly', 'contract'] as EmployeeType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, employeeType: t })}
                  className={classNames(
                    'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                    form.employeeType === t
                      ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
                      : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {EMPLOYEE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-field">Employee group</label>
            <div className="grid grid-cols-2 gap-2">
              {(['regular', 'unit'] as EmployeeGroup[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm({ ...form, employeeGroup: g })}
                  className={classNames(
                    'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                    form.employeeGroup === g
                      ? 'border-neon-amber/50 bg-neon-amber/10 text-neon-amber'
                      : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {EMPLOYEE_GROUP_LABELS[g]}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Unit Employee salaries count toward Unit Payroll/Unit Cost and are excluded from Regular Payroll totals.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {form.employeeType === 'contract' ? (
              <div>
                <label className="label-field">Rate per piece</label>
                <input
                  type="number"
                  className="input-field"
                  value={form.ratePerPiece}
                  onChange={(e) => setForm({ ...form, ratePerPiece: e.target.value })}
                  placeholder="e.g. 15"
                />
              </div>
            ) : (
              <div>
                <label className="label-field">{editing ? 'Monthly salary' : 'Starting monthly salary'}</label>
                <input
                  type="number"
                  className="input-field"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  placeholder="0"
                />
                {editing && <p className="mt-1 text-[11px] text-slate-500">For a raise, use the Increment button on the card instead — it keeps a history.</p>}
              </div>
            )}
            <div>
              <label className="label-field">Join date</label>
              <input
                type="date"
                className="input-field"
                value={form.joinDate}
                onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
              />
            </div>
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

      <Modal
        open={incrementModalOpen}
        onClose={() => setIncrementModalOpen(false)}
        title="Increment Salary"
        subtitle={incrementEmployee ? `${incrementEmployee.name} · Current: ${formatCurrency(incrementEmployee.salary)}` : undefined}
      >
        <div className="space-y-4">
          <div>
            <label className="label-field">Increment Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['fixed', 'percentage'] as IncrementType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setIncrementType(t)}
                  className={classNames(
                    'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                    incrementType === t
                      ? 'border-neon-green/50 bg-neon-green/10 text-neon-green'
                      : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {INCREMENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-field">{incrementType === 'percentage' ? 'Percentage (%)' : 'Amount (Rs)'}</label>
            <input
              type="number"
              className="input-field"
              value={incrementValue}
              onChange={(e) => setIncrementValue(e.target.value)}
              placeholder={incrementType === 'percentage' ? 'e.g. 10' : 'e.g. 5000'}
            />
          </div>
          <div>
            <label className="label-field">Date</label>
            <input type="date" className="input-field" value={incrementDate} onChange={(e) => setIncrementDate(e.target.value)} />
          </div>
          {incrementValueNum > 0 && (
            <div className="space-y-1.5 rounded-xl bg-white/[0.02] px-3.5 py-2.5 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Previous Salary</span>
                <span className="text-slate-300">{formatCurrency(incrementPreviousSalary)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Increment</span>
                <span className="text-neon-green">+{formatCurrency(incrementAmountPreview)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-1.5 font-semibold">
                <span className="text-slate-300">New Salary</span>
                <span className="text-white">{formatCurrency(incrementNewSalaryPreview)}</span>
              </div>
            </div>
          )}
          <div>
            <label className="label-field">Notes (optional)</label>
            <input className="input-field" value={incrementNotes} onChange={(e) => setIncrementNotes(e.target.value)} placeholder="e.g. Annual review" />
          </div>
          {incrementError && <p className="text-xs text-neon-red">{incrementError}</p>}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setIncrementModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSaveIncrement} disabled={savingIncrement}>
              {savingIncrement ? 'Applying…' : 'Apply Increment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
