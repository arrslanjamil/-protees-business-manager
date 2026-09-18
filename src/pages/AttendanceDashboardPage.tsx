import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, Clock, Plus, Settings, UserCheck, UserX, Users } from 'lucide-react'
import { useData } from '@/context/DataContext'
import { useAttendance } from '@/context/AttendanceContext'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { AttendanceEntryModal } from '@/components/attendance/AttendanceEntryModal'
import { ATTENDANCE_STATUS_LABELS, type Attendance } from '@/lib/types'
import { formatHours, summarizeAttendance } from '@/lib/attendance'
import { formatDate, todayISO } from '@/lib/utils'

const STATUS_BADGE: Record<string, 'green' | 'red' | 'amber' | 'purple' | 'cyan' | 'slate'> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  half_day: 'amber',
  paid_leave: 'purple',
  unpaid_leave: 'red',
  government_holiday: 'cyan',
}

export function AttendanceDashboardPage() {
  const { employeesWithBalance } = useData()
  const { attendance, governmentHolidays, loading } = useAttendance()
  const [date, setDate] = useState(todayISO())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Attendance | null>(null)

  const activeEmployees = useMemo(() => employeesWithBalance.filter((e) => e.is_active), [employeesWithBalance])
  const todaysAttendance = useMemo(() => attendance.filter((a) => a.date === date), [attendance, date])
  const todaysHoliday = useMemo(() => governmentHolidays.find((h) => h.date === date), [governmentHolidays, date])

  const attendanceByEmployee = useMemo(() => new Map(todaysAttendance.map((a) => [a.employee_id, a])), [todaysAttendance])
  const summary = useMemo(() => summarizeAttendance(todaysAttendance), [todaysAttendance])
  const markedEmployeeIds = useMemo(() => new Set(todaysAttendance.map((a) => a.employee_id)), [todaysAttendance])
  const unmarkedCount = activeEmployees.filter((e) => !markedEmployeeIds.has(e.id)).length
  const onLeaveCount = summary.paidLeaveDays + summary.unpaidLeaveDays

  const pendingEmployeeId = useRef<number | undefined>(undefined)
  function openMark(employeeId?: number, existing?: Attendance) {
    pendingEmployeeId.current = employeeId
    setEditing(existing ?? null)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Attendance</h1>
          <p className="mt-1 text-sm text-slate-400">Daily attendance, working hours, and overtime — synced from the ZKTeco K40 or entered manually.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/attendance/records" className="btn-secondary">
            <CalendarCheck size={16} /> All Records
          </Link>
          <Link to="/attendance/settings" className="btn-secondary">
            <Settings size={16} /> Settings
          </Link>
          <button className="btn-primary" onClick={() => openMark()}>
            <Plus size={16} /> Mark Attendance
          </button>
        </div>
      </div>

      <div>
        <label className="label-field">Date</label>
        <input type="date" className="input-field max-w-xs" value={date} onChange={(e) => setDate(e.target.value)} />
        {todaysHoliday && (
          <p className="mt-1.5 text-xs text-neon-cyan">Government Holiday: {todaysHoliday.name} — a paid day off for everyone.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Employees" value={String(activeEmployees.length)} icon={Users} accent="cyan" hint="Active roster" />
        <StatCard label="Present" value={String(summary.presentDays)} icon={UserCheck} accent="green" hint={date === todayISO() ? 'Today' : formatDate(date)} />
        <StatCard label="Absent" value={String(summary.absentDays + unmarkedCount)} icon={UserX} accent="red" hint={`${unmarkedCount} unmarked`} />
        <StatCard label="Late Employees" value={String(summary.lateDays)} icon={Clock} accent="amber" hint={date === todayISO() ? 'Today' : formatDate(date)} />
        <StatCard label="On Leave" value={String(onLeaveCount)} icon={CalendarCheck} accent="purple" hint="Paid + Unpaid" />
        <StatCard label="Overtime Hours" value={formatHours(summary.totalOvertimeHours)} icon={Clock} accent="cyan" hint={date === todayISO() ? 'Today' : formatDate(date)} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">{date === todayISO() ? "Today's" : formatDate(date)} Roster</h2>
        {activeEmployees.length === 0 ? (
          <EmptyState icon={Users} title="No active employees" description="Add employees first." />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Check-In</th>
                  <th className="px-5 py-3.5">Check-Out</th>
                  <th className="px-5 py-3.5">Hours</th>
                  <th className="px-5 py-3.5">Overtime</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {activeEmployees.map((emp) => {
                  const rec = attendanceByEmployee.get(emp.id)
                  return (
                    <tr
                      key={emp.id}
                      className="cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                      onClick={() => openMark(emp.id, rec)}
                    >
                      <td className="px-5 py-3.5 font-medium text-white">{emp.name}</td>
                      <td className="px-5 py-3.5 text-slate-400">{emp.department || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {rec?.check_in ? new Date(rec.check_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {rec?.check_out ? new Date(rec.check_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">{formatHours(rec?.working_hours)}</td>
                      <td className="px-5 py-3.5">{rec?.overtime_hours ? <span className="text-neon-cyan">+{formatHours(rec.overtime_hours)}</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="px-5 py-3.5">
                        {rec ? (
                          <Badge color={STATUS_BADGE[rec.status] ?? 'slate'}>{ATTENDANCE_STATUS_LABELS[rec.status]}</Badge>
                        ) : (
                          <Badge color="slate">Not marked</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-slate-500">{rec ? 'Edit' : 'Mark'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AttendanceEntryModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        editing={editing}
        defaultEmployeeId={pendingEmployeeId.current}
        defaultDate={date}
      />
      {loading && <p className="text-xs text-slate-500">Loading…</p>}
    </div>
  )
}
