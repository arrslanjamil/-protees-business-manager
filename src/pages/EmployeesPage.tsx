import { useMemo, useState } from 'react'
import { Pencil, Phone, Plus, Search, Trash2, Users } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { AdvanceProgressBar } from '@/components/ui/ProgressBar'
import type { Employee } from '@/lib/types'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

const emptyForm = {
  name: '',
  phone: '',
  role: '',
  unit_id: '',
  monthly_salary: '',
  joined_date: todayISO(),
  status: 'active' as 'active' | 'inactive',
}

export function EmployeesPage() {
  const { employeesWithBalance, units, addEmployee, updateEmployee, deleteEmployee } = useData()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employeesWithBalance
    return employeesWithBalance.filter(
      (e) => e.name.toLowerCase().includes(q) || (e.role ?? '').toLowerCase().includes(q)
    )
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
      phone: emp.phone ?? '',
      role: emp.role ?? '',
      unit_id: emp.unit_id ?? '',
      monthly_salary: String(emp.monthly_salary ?? ''),
      joined_date: emp.joined_date ?? todayISO(),
      status: emp.status,
    })
    setError(null)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    const salary = Number(form.monthly_salary)
    if (Number.isNaN(salary) || salary < 0) {
      setError('Enter a valid monthly salary.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        role: form.role.trim() || null,
        unit_id: form.unit_id || null,
        monthly_salary: salary,
        joined_date: form.joined_date || null,
        status: form.status,
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
    if (!confirm(`Delete ${emp.name}? This also removes their salary and advance history.`)) return
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
          placeholder="Search by name or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No employees found" description="Add your first employee to get started." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((emp) => (
            <div key={emp.id} className="card group flex flex-col">
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
                    <p className="font-semibold text-white">{emp.name}</p>
                    <p className="text-xs text-slate-500">{emp.role || 'No role set'}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => openEdit(emp)}>
                    <Pencil size={15} />
                  </button>
                  <button
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-neon-red/10 hover:text-neon-red"
                    onClick={() => handleDelete(emp)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge color={emp.status === 'active' ? 'green' : 'slate'}>{emp.status}</Badge>
                {emp.unit && <Badge color="purple">{emp.unit.name}</Badge>}
                {emp.phone && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Phone size={11} /> {emp.phone}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-white/[0.02] px-3.5 py-2.5">
                <span className="text-xs text-slate-400">Monthly Salary</span>
                <span className="font-display text-sm font-semibold text-white">{formatCurrency(emp.monthly_salary)}</span>
              </div>

              <div className="mt-3">
                <AdvanceProgressBar balance={emp.advanceBalance} monthlySalary={emp.monthly_salary} />
              </div>

              {emp.joined_date && (
                <p className="mt-3 text-[11px] text-slate-600">Joined {formatDate(emp.joined_date)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Employee' : 'Add Employee'}>
        <div className="space-y-4">
          <div>
            <label className="label-field">Full name</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ali Raza" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Phone</label>
              <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="03xx-xxxxxxx" />
            </div>
            <div>
              <label className="label-field">Role</label>
              <input className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Tailor" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Unit</label>
              <select className="input-field" value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })}>
                <option value="">Unassigned</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Status</label>
              <select
                className="input-field"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Monthly salary</label>
              <input
                type="number"
                className="input-field"
                value={form.monthly_salary}
                onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="label-field">Joined date</label>
              <input
                type="date"
                className="input-field"
                value={form.joined_date}
                onChange={(e) => setForm({ ...form, joined_date: e.target.value })}
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
