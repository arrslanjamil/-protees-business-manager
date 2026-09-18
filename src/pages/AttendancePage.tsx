import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Search } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useAttendance } from '@/context/AttendanceContext'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { AttendanceEntryModal } from '@/components/attendance/AttendanceEntryModal'
import { ATTENDANCE_STATUS_LABELS, type Attendance, type AttendanceStatus } from '@/lib/types'
import { formatHours } from '@/lib/attendance'
import { classNames, formatDate, todayISO } from '@/lib/utils'

const STATUS_BADGE: Record<string, 'green' | 'red' | 'amber' | 'purple' | 'cyan' | 'slate'> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  half_day: 'amber',
  paid_leave: 'purple',
  unpaid_leave: 'red',
  government_holiday: 'cyan',
}

type StatusFilter = 'all' | AttendanceStatus

export function AttendancePage() {
  const { employeesWithBalance } = useData()
  const { attendance } = useAttendance()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [startDate, setStartDate] = useState(() => todayISO().slice(0, 8) + '01')
  const [endDate, setEndDate] = useState(todayISO())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Attendance | null>(null)

  const employeeNameById = useMemo(() => new Map(employeesWithBalance.map((e) => [e.id, e.name])), [employeesWithBalance])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return attendance
      .filter((a) => a.date >= startDate && a.date <= endDate)
      .filter((a) => (statusFilter === 'all' ? true : a.status === statusFilter))
      .filter((a) => (q ? (employeeNameById.get(a.employee_id) ?? '').toLowerCase().includes(q) : true))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [attendance, startDate, endDate, statusFilter, search, employeeNameById])

  function openEdit(rec: Attendance) {
    setEditing(rec)
    setModalOpen(true)
  }
  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <Link to="/attendance" className="inline-flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white">
        <ArrowLeft size={14} /> Back to Attendance
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Attendance Records</h1>
          <p className="mt-1 text-sm text-slate-400">Every check-in/out, machine-synced or manually entered.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Mark Attendance
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="relative max-w-xs flex-1">
          <label className="label-field">Search Employee</label>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-[38px] text-slate-500" />
          <input className="input-field pl-10" placeholder="Name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label className="label-field">From</label>
          <input type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label-field">To</label>
          <input type="date" className="input-field" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={classNames(
            'rounded-xl border px-3.5 py-2 text-xs font-semibold transition',
            statusFilter === 'all' ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
          )}
        >
          All Statuses
        </button>
        {(Object.keys(ATTENDANCE_STATUS_LABELS) as AttendanceStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={classNames(
              'rounded-xl border px-3.5 py-2 text-xs font-semibold transition',
              statusFilter === s ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
            )}
          >
            {ATTENDANCE_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No attendance records" description="Try widening the date range or filters." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Check-In</th>
                <th className="px-5 py-3.5">Check-Out</th>
                <th className="px-5 py-3.5">Hours</th>
                <th className="px-5 py-3.5">Late</th>
                <th className="px-5 py-3.5">Overtime</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Source</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec) => (
                <tr key={rec.id} className="cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/[0.02]" onClick={() => openEdit(rec)}>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(rec.date)}</td>
                  <td className="px-5 py-3.5 font-medium text-white">{employeeNameById.get(rec.employee_id) ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-400">
                    {rec.check_in ? new Date(rec.check_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">
                    {rec.check_out ? new Date(rec.check_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">{formatHours(rec.working_hours)}</td>
                  <td className="px-5 py-3.5">{rec.late_minutes ? <span className="text-neon-amber">{rec.late_minutes}m</span> : <span className="text-slate-600">—</span>}</td>
                  <td className="px-5 py-3.5">{rec.overtime_hours ? <span className="text-neon-cyan">+{formatHours(rec.overtime_hours)}</span> : <span className="text-slate-600">—</span>}</td>
                  <td className="px-5 py-3.5">
                    <Badge color={STATUS_BADGE[rec.status] ?? 'slate'}>{ATTENDANCE_STATUS_LABELS[rec.status]}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{rec.source === 'machine' ? 'Machine' : 'Manual'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AttendanceEntryModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        editing={editing}
      />
    </div>
  )
}
