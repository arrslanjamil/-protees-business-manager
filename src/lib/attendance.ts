import type { Attendance, AttendanceSettings, AttendanceStatus } from './types'
import { NO_DEDUCTION_STATUSES } from './types'

/** Hours between two timestamps minus the configured break, floored at 0
 * and rounded to 2 decimals (matches the numeric(6,2) column). */
export function computeWorkingHours(checkIn: string | Date, checkOut: string | Date, breakMinutes: number): number {
  const inMs = new Date(checkIn).getTime()
  const outMs = new Date(checkOut).getTime()
  const rawHours = (outMs - inMs) / (1000 * 60 * 60)
  const hours = rawHours - breakMinutes / 60
  return Math.round(Math.max(0, hours) * 100) / 100
}

/** Minutes a check-in was after standard_start_time + grace, on that same
 * calendar day. 0 if on time or early. */
export function computeLateMinutes(checkIn: string | Date, dateISO: string, standardStartTime: string, graceMinutes: number): number {
  const checkInDate = new Date(checkIn)
  const [h, m] = standardStartTime.split(':').map(Number)
  const expected = new Date(`${dateISO}T00:00:00`)
  expected.setHours(h, m + graceMinutes, 0, 0)
  const diffMinutes = (checkInDate.getTime() - expected.getTime()) / (1000 * 60)
  return Math.max(0, Math.round(diffMinutes))
}

export function computeOvertimeHours(workingHours: number, standardHours: number): number {
  return Math.round(Math.max(0, workingHours - standardHours) * 100) / 100
}

export function computeShortageHours(workingHours: number, standardHours: number): number {
  return Math.round(Math.max(0, standardHours - workingHours) * 100) / 100
}

/** A reasonable default status from raw punches + computed figures — used
 * to pre-fill manual entry and by the bridge script. Always editable
 * afterward (e.g. to mark a day as Paid Leave instead). */
export function deriveAttendanceStatus(params: { hasCheckIn: boolean; lateMinutes: number; workingHours: number; standardHours: number }): AttendanceStatus {
  const { hasCheckIn, lateMinutes, workingHours, standardHours } = params
  if (!hasCheckIn) return 'absent'
  if (workingHours > 0 && workingHours < standardHours / 2) return 'half_day'
  if (lateMinutes > 0) return 'late'
  return 'present'
}

export interface AttendancePeriodSummary {
  presentDays: number
  absentDays: number
  lateDays: number
  halfDays: number
  paidLeaveDays: number
  unpaidLeaveDays: number
  holidayDays: number
  totalOvertimeHours: number
  /** Calendar days in the period that have no attendance row at all —
   * surfaced separately from `absentDays` (an explicit Absent status) so
   * missing data is never silently billed as worked. */
  unmarkedDays: number
}

export function summarizeAttendance(rows: Attendance[]): AttendancePeriodSummary {
  const summary: AttendancePeriodSummary = {
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfDays: 0,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    holidayDays: 0,
    totalOvertimeHours: 0,
    unmarkedDays: 0,
  }
  for (const r of rows) {
    switch (r.status) {
      case 'present':
        summary.presentDays++
        break
      case 'absent':
        summary.absentDays++
        break
      case 'late':
        summary.lateDays++
        break
      case 'half_day':
        summary.halfDays++
        break
      case 'paid_leave':
        summary.paidLeaveDays++
        break
      case 'unpaid_leave':
        summary.unpaidLeaveDays++
        break
      case 'government_holiday':
        summary.holidayDays++
        break
    }
    summary.totalOvertimeHours += Number(r.overtime_hours ?? 0)
  }
  summary.totalOvertimeHours = Math.round(summary.totalOvertimeHours * 100) / 100
  return summary
}

export interface PayrollDeductionBreakdown {
  perDayRate: number
  absentDeduction: number
  lateDeduction: number
  leaveDeduction: number
  totalDeduction: number
}

/** Absent + half-day + unpaid-leave reduce pay by the per-day rate (a full
 * day's absence deducts a full day, a half day deducts half); Late alone
 * only costs money if a per-instance penalty has been explicitly
 * configured (0 by default — see attendance_settings). Paid Leave and
 * Government Holiday never deduct (see NO_DEDUCTION_STATUSES). */
export function computePayrollDeductions(summary: AttendancePeriodSummary, monthlySalary: number, daysInMonth: number, settings: AttendanceSettings): PayrollDeductionBreakdown {
  const perDayRate = daysInMonth > 0 ? monthlySalary / daysInMonth : 0
  const absentDeduction = Math.round((summary.absentDays + summary.halfDays * 0.5) * perDayRate)
  const leaveDeduction = Math.round(summary.unpaidLeaveDays * perDayRate)
  const lateDeduction = Math.round(summary.lateDays * Number(settings.late_penalty_per_instance ?? 0))
  return {
    perDayRate: Math.round(perDayRate * 100) / 100,
    absentDeduction,
    lateDeduction,
    leaveDeduction,
    totalDeduction: absentDeduction + lateDeduction + leaveDeduction,
  }
}

export function isPaidStatus(status: AttendanceStatus): boolean {
  return NO_DEDUCTION_STATUSES.includes(status)
}

export function formatHours(hours: number | null | undefined): string {
  if (hours == null) return '—'
  return `${hours.toFixed(1)}h`
}
