// Mirrors the pure calculation functions in src/lib/attendance.ts on the
// main app — kept as a plain CommonJS copy here because this script is a
// separate Node project (no build step, no path to import TS from src/).
// If you change the deduction/overtime rules in one place, change them
// in both.

function computeWorkingHours(checkIn, checkOut, breakMinutes) {
  const rawHours = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60)
  const hours = rawHours - breakMinutes / 60
  return Math.round(Math.max(0, hours) * 100) / 100
}

function computeLateMinutes(checkIn, dateISO, standardStartTime, graceMinutes) {
  const checkInDate = new Date(checkIn)
  const [h, m] = standardStartTime.split(':').map(Number)
  const expected = new Date(`${dateISO}T00:00:00`)
  expected.setHours(h, m + graceMinutes, 0, 0)
  const diffMinutes = (checkInDate.getTime() - expected.getTime()) / (1000 * 60)
  return Math.max(0, Math.round(diffMinutes))
}

function computeOvertimeHours(workingHours, standardHours) {
  return Math.round(Math.max(0, workingHours - standardHours) * 100) / 100
}

function computeShortageHours(workingHours, standardHours) {
  return Math.round(Math.max(0, standardHours - workingHours) * 100) / 100
}

function deriveAttendanceStatus({ hasCheckIn, lateMinutes, workingHours, standardHours }) {
  if (!hasCheckIn) return 'absent'
  if (workingHours > 0 && workingHours < standardHours / 2) return 'half_day'
  if (lateMinutes > 0) return 'late'
  return 'present'
}

module.exports = { computeWorkingHours, computeLateMinutes, computeOvertimeHours, computeShortageHours, deriveAttendanceStatus }
