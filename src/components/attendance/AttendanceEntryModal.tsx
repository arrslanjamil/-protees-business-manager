import { useEffect, useState } from 'react'
import { useData } from '@/context/DataContext'
import { useAttendance } from '@/context/AttendanceContext'
import { Modal } from '@/components/ui/Modal'
import { ATTENDANCE_STATUS_LABELS, LEAVE_TYPE_LABELS, type Attendance, type AttendanceStatus, type LeaveType } from '@/lib/types'
import { computeLateMinutes, computeOvertimeHours, computeShortageHours, computeWorkingHours, deriveAttendanceStatus } from '@/lib/attendance'
import { classNames, todayISO } from '@/lib/utils'

interface AttendanceEntryModalProps {
  open: boolean
  onClose: () => void
  /** Pre-selects an employee/date (e.g. clicking a row on the dashboard);
   * editing an existing row pre-fills everything from it. */
  defaultEmployeeId?: number
  defaultDate?: string
  editing?: Attendance | null
}

function toTimeInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function toISOFromTime(dateISO: string, time: string): string | null {
  if (!time) return null
  return new Date(`${dateISO}T${time}:00`).toISOString()
}

export function AttendanceEntryModal({ open, onClose, defaultEmployeeId, defaultDate, editing }: AttendanceEntryModalProps) {
  const { employeesWithBalance } = useData()
  const { attendanceSettings, upsertAttendance, deleteAttendance } = useAttendance()

  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [date, setDate] = useState(todayISO())
  const [status, setStatus] = useState<AttendanceStatus>('present')
  const [leaveType, setLeaveType] = useState<LeaveType | ''>('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeEmployees = employeesWithBalance.filter((e) => e.is_active)
  const isLeaveStatus = status === 'paid_leave' || status === 'unpaid_leave'

  useEffect(() => {
    if (!open) return
    if (editing) {
      setEmployeeId(editing.employee_id)
      setDate(editing.date)
      setStatus(editing.status)
      setLeaveType(editing.leave_type ?? '')
      setCheckIn(toTimeInput(editing.check_in))
      setCheckOut(toTimeInput(editing.check_out))
      setNotes(editing.notes ?? '')
    } else {
      setEmployeeId(defaultEmployeeId ?? '')
      setDate(defaultDate ?? todayISO())
      setStatus('present')
      setLeaveType('')
      setCheckIn('')
      setCheckOut('')
      setNotes('')
    }
    setError(null)
  }, [open, editing, defaultEmployeeId, defaultDate])

  async function handleSave() {
    if (!employeeId) {
      setError('Select an employee.')
      return
    }
    if (isLeaveStatus && !leaveType) {
      setError('Select a leave type.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const checkInISO = toISOFromTime(date, checkIn)
      const checkOutISO = toISOFromTime(date, checkOut)
      const settings = attendanceSettings
      let workingHours: number | null = null
      let lateMinutes: number | null = null
      let overtimeHours: number | null = null
      let shortageHours: number | null = null

      if (checkInISO && checkOutISO && settings) {
        workingHours = computeWorkingHours(checkInISO, checkOutISO, settings.break_minutes)
        overtimeHours = computeOvertimeHours(workingHours, settings.standard_working_hours)
        shortageHours = computeShortageHours(workingHours, settings.standard_working_hours)
      }
      if (checkInISO && settings) {
        lateMinutes = computeLateMinutes(checkInISO, date, settings.standard_start_time, settings.late_grace_minutes)
      }

      await upsertAttendance({
        employeeId: Number(employeeId),
        date,
        checkIn: checkInISO,
        checkOut: checkOutISO,
        status,
        leaveType: isLeaveStatus ? (leaveType as LeaveType) : null,
        workingHours,
        shortageHours,
        lateMinutes,
        overtimeHours,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm('Delete this attendance record?')) return
    await deleteAttendance(editing.id)
    onClose()
  }

  function applySuggestedStatus() {
    if (!checkIn || !attendanceSettings) return
    const checkInISO = toISOFromTime(date, checkIn)
    const checkOutISO = toISOFromTime(date, checkOut)
    if (!checkInISO) return
    const late = computeLateMinutes(checkInISO, date, attendanceSettings.standard_start_time, attendanceSettings.late_grace_minutes)
    const hours = checkOutISO ? computeWorkingHours(checkInISO, checkOutISO, attendanceSettings.break_minutes) : 0
    setStatus(deriveAttendanceStatus({ hasCheckIn: true, lateMinutes: late, workingHours: hours, standardHours: attendanceSettings.standard_working_hours }))
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Attendance' : 'Mark Attendance'}>
      <div className="space-y-4">
        <div>
          <label className="label-field">Employee</label>
          <select className="input-field" value={employeeId} onChange={(e) => setEmployeeId(Number(e.target.value))} disabled={!!editing}>
            <option value="">Select employee…</option>
            {activeEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Date</label>
          <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} disabled={!!editing} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Check-In</label>
            <input type="time" className="input-field" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} onBlur={applySuggestedStatus} />
          </div>
          <div>
            <label className="label-field">Check-Out</label>
            <input type="time" className="input-field" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} onBlur={applySuggestedStatus} />
          </div>
        </div>
        <div>
          <label className="label-field">Status</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(ATTENDANCE_STATUS_LABELS) as AttendanceStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={classNames(
                  'rounded-xl border px-3 py-2 text-xs font-semibold transition',
                  status === s ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                )}
              >
                {ATTENDANCE_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        {isLeaveStatus && (
          <div>
            <label className="label-field">Leave Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLeaveType(t)}
                  className={classNames(
                    'rounded-xl border px-3 py-2 text-xs font-semibold transition',
                    leaveType === t ? 'border-neon-amber/50 bg-neon-amber/10 text-neon-amber' : 'border-white/10 bg-base-900/60 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {LEAVE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="label-field">Notes (optional)</label>
          <input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Details" />
        </div>
        {error && <p className="text-xs text-neon-red">{error}</p>}
        <div className="flex gap-3 pt-2">
          {editing && (
            <button className="btn-secondary text-neon-red" onClick={handleDelete}>
              Delete
            </button>
          )}
          <button className="btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
