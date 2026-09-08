import { useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { AdvanceProgressBar } from '@/components/ui/ProgressBar'
import { EmployeeTransactionHistory } from '@/components/employees/EmployeeTransactionHistory'
import { EMPLOYEE_TYPE_LABELS, type Employee, type EmployeeType } from '@/lib/types'
import { classNames, formatCurrency, formatDate, todayISO } from '@/lib/utils'

const emptyForm = {
  name: '',
  salary: '',
  joinDate: todayISO(),
  employeeType: 'monthly' as EmployeeType,
  ratePerPiece: '',
}

export function EmployeesPage() {
  const { employeesWithBalance, addEmployee, updateEmployee, deleteEmployee } = useData()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  function toggleExpanded(id: number) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employeesWithBalance
    return employeesWithBalance.filter((e) => e.name.toLowerCase().includes(q))
  }, [employeesWithBalance, search])

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Employees</h1>
          <p className="mt-1 text-sm text-slate-400">Manage your team, salaries, and advance exposure.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Employee
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input-field pl-10"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
                role="button"
                tabIndex={0}
                onClick={() => toggleExpanded(emp.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleExpanded(emp.id)
                  }
                }}
                className={classNames(
                  'card group flex cursor-pointer flex-col transition-colors',
                  isExpanded && 'md:col-span-2 xl:col-span-3 border-neon-cyan/30'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 font-display text-sm font-bold text-white">
                      {emp.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{emp.name}</p>
                        <Badge color={emp.employee_type === 'contract' ? 'purple' : 'cyan'}>
                          {EMPLOYEE_TYPE_LABELS[emp.employee_type]}
                        </Badge>
                      </div>
                      {emp.join_date && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                          <CalendarDays size={11} /> Joined {formatDate(emp.join_date)}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-slate-600">Added by {emp.created_by_username ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
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
                    <ChevronDown
                      size={16}
                      className={classNames('text-slate-500 transition-transform', isExpanded && 'rotate-180 text-neon-cyan')}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-white/[0.02] px-3.5 py-2.5">
                  <span className="text-xs text-slate-400">{emp.employee_type === 'contract' ? 'Rate Per Piece' : 'Monthly Salary'}</span>
                  <span className="font-display text-sm font-semibold text-white">
                    {emp.employee_type === 'contract' ? formatCurrency(emp.rate_per_piece ?? 0) : formatCurrency(emp.salary)}
                  </span>
                </div>

                <div className="mt-3">
                  <AdvanceProgressBar balance={emp.advanceBalance} monthlySalary={emp.salary} />
                </div>

                {isExpanded && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <h4 className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Transaction History</h4>
                    <EmployeeTransactionHistory employeeName={emp.name} />
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
                <label className="label-field">Monthly salary</label>
                <input
                  type="number"
                  className="input-field"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  placeholder="0"
                />
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
    </div>
  )
}
