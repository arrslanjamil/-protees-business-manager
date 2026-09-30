import type { Attendance, AttendanceSettings, AttendanceStatus } from './types'
import { NO_DEDUCTION_STATUSES } from './types'

/** The business runs in Pakistan and the attendance devices report local
 * wall-clock time. Punches are stored as TIMESTAMPTZ (migration 032) and must
 * be rendered back in this zone, not the viewer's, so a record always shows
 * the time the employee actually punched. Pakistan observes no DST, so the
 * fixed offset below is safe and matches the zkteco-attendance Edge Function. */
export const BUSINESS_TIME_ZONE = 'Asia/Karachi'
export const BUSINESS_UTC_OFFSET = '+05:00'

/** Parse a TIMESTAMPTZ value from Supabase, returning null rather than an
 * Invalid Date. Every attendance formatter and calculation goes through this
 * so a malformed value degrades to '—' or 0 instead of "Invalid Date"/NaN. */
function parseTimestamp(value: string | Date | null | undefined): Date | null {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Hours between two punches minus the configured break, floored at 0 and
 * rounded to 2 decimals (matches the numeric(6,2) column). Returns 0 rather
 * than NaN for an absent or unparseable punch, so a bad value can never be
 * written into working_hours or cascade into payroll deductions. */
export function computeWorkingHours(
  checkIn: string | Date | null | undefined,
  checkOut: string | Date | null | undefined,
  breakMinutes: number,
): number {
  const inDate = parseTimestamp(checkIn)
  const outDate = parseTimestamp(checkOut)
  if (!inDate || !outDate) return 0
  const rawHours = (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60)
  const hours = rawHours - (Number.isFinite(breakMinutes) ? breakMinutes : 0) / 60
  return Math.round(Math.max(0, hours) * 100) / 100
}

/** Minutes a check-in was after standard_start_time + grace. 0 if on time,
 * early, or unparseable. The expected start is pinned to the business timezone
 * rather than the viewer's, so the same record yields the same late count from
 * any machine. */
export function computeLateMinutes(
  checkIn: string | Date | null | undefined,
  dateISO: string,
  standardStartTime: string,
  graceMinutes: number,
): number {
  const checkInDate = parseTimestamp(checkIn)
  if (!checkInDate) return 0

  const [h, m] = (standardStartTime ?? '').split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0

  const expected = parseTimestamp(
    `${dateISO}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00${BUSINESS_UTC_OFFSET}`,
  )
  if (!expected) return 0

  const grace = Number.isFinite(graceMinutes) ? graceMinutes : 0
  const diffMinutes = (checkInDate.getTime() - expected.getTime()) / (1000 * 60) - grace
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

/** A punch rendered in the business timezone, e.g. "09:00 AM". '—' when the
 * punch is absent or unparseable. */
export function formatCheckInTime(value: string | Date | null | undefined): string {
  const date = parseTimestamp(value)
  if (!date) return '—'
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: BUSINESS_TIME_ZONE,
  })
}

/** An attendance date (a DATE column, no time) as "30 Sep 2026". Built from
 * parts because en-GB renders September as the four-letter "Sept", and read in
 * UTC because a bare date string has no zone to shift. */
export function formatAttendanceDate(value: string | Date | null | undefined): string {
  if (value == null) return '—'
  const date = parseTimestamp(typeof value === 'string' ? `${value}T00:00:00Z` : value)
  if (!date) return '—'
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(date)
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('day')} ${part('month').slice(0, 3)} ${part('year')}`
}

/** Date + punch time together, e.g. "30 Sep 2026, 09:00 AM". */
export function formatAttendanceDateTime(
  dateValue: string | Date | null | undefined,
  timeValue: string | Date | null | undefined,
): string {
  const time = formatCheckInTime(timeValue)
  const date = formatAttendanceDate(dateValue)
  if (date === '—') return time
  if (time === '—') return date
  return `${date}, ${time}`
}
