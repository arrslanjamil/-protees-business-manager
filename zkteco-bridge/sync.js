// Protees Business Manager — ZKTeco K40 sync bridge.
//
// This script is NOT part of the web app and does NOT run on Vercel.
// Run it on a PC physically on the same office LAN as the K40 — see
// README.md for setup. It:
//   1. Reads the active device's IP/port from the `zkteco_devices` table
//      (set from the app's Settings → Attendance Settings page).
//   2. Connects to the K40 over TCP and fetches every punch log.
//   3. Groups punches per employee per day → first punch = check-in,
//      last punch = check-out.
//   4. Computes working hours / late minutes / overtime / shortage using
//      the same rules as the app (attendanceCalc.js).
//   5. Upserts one row per (employee, date) into `attendance` — re-running
//      this script is always safe: the upsert overwrites that day's row
//      with the latest computed figures rather than creating duplicates.
//   6. Employees are matched by `employees.machine_user_id`, which must
//      be set on the Employees page to the K40's enrollment ID for that
//      person — an unmapped device user id is skipped and reported.

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const ZKLib = require('node-zklib')
const { computeWorkingHours, computeLateMinutes, computeOvertimeHours, computeShortageHours, deriveAttendanceStatus } = require('./attendanceCalc')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — copy .env.example to .env and fill both in.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function localDateISO(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

async function resolveDevice() {
  if (process.env.DEVICE_IP) {
    return { id: null, name: 'env override', ip_address: process.env.DEVICE_IP, port: Number(process.env.DEVICE_PORT) || 4370 }
  }
  const { data, error } = await supabase.from('zkteco_devices').select('*').eq('is_active', true).order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('No active device configured. Add one from the app: Attendance → Settings → ZKTeco Devices.')
  return data
}

async function markDeviceSynced(deviceId, errorMessage) {
  if (!deviceId) return
  await supabase.from('zkteco_devices').update({ last_synced_at: new Date().toISOString(), last_sync_error: errorMessage ?? null }).eq('id', deviceId)
}

async function main() {
  console.log(`[${new Date().toISOString()}] Starting sync…`)

  const device = await resolveDevice()
  console.log(`Device: ${device.name} (${device.ip_address}:${device.port})`)

  const { data: settings } = await supabase.from('attendance_settings').select('*').eq('id', 1).maybeSingle()
  const standardHours = settings?.standard_working_hours ?? 8
  const breakMinutes = settings?.break_minutes ?? 60
  const startTime = settings?.standard_start_time?.slice(0, 5) ?? '09:00'
  const graceMinutes = settings?.late_grace_minutes ?? 15

  const { data: employees, error: empErr } = await supabase.from('employees').select('id, machine_user_id').not('machine_user_id', 'is', null)
  if (empErr) throw empErr
  const employeeByMachineId = new Map(employees.map((e) => [String(e.machine_user_id), e.id]))
  if (employeeByMachineId.size === 0) {
    console.warn('No employees have a Machine User ID set yet — nothing to map punches to. Set it on each employee\'s Edit form.')
  }

  const zk = new ZKLib(device.ip_address, device.port, 10000, 4000)
  try {
    await zk.createSocket()
  } catch (err) {
    const message = `Could not connect to ${device.ip_address}:${device.port} — ${err.message}`
    console.error(message)
    await markDeviceSynced(device.id, message)
    process.exitCode = 1
    return
  }

  let logs
  try {
    const result = await zk.getAttendances()
    logs = result.data ?? []
    console.log(`Fetched ${logs.length} raw punch logs.`)
  } catch (err) {
    const message = `Failed to fetch logs — ${err.message}`
    console.error(message)
    await markDeviceSynced(device.id, message)
    await zk.disconnect()
    process.exitCode = 1
    return
  }
  await zk.disconnect()

  // Group punches by (deviceUserId, date).
  const byEmployeeDay = new Map()
  let unmapped = 0
  for (const log of logs) {
    const deviceUserId = String(log.deviceUserId ?? log.userId ?? log.uid)
    const employeeId = employeeByMachineId.get(deviceUserId)
    if (!employeeId) {
      unmapped++
      continue
    }
    const time = new Date(log.recordTime)
    const dateISO = localDateISO(time)
    const key = `${employeeId}::${dateISO}`
    const bucket = byEmployeeDay.get(key) ?? { employeeId, dateISO, punches: [] }
    bucket.punches.push(time)
    byEmployeeDay.set(key, bucket)
  }
  if (unmapped > 0) {
    console.warn(`${unmapped} punches were from device user ids with no matching employee (machine_user_id not set on anyone) — skipped.`)
  }

  console.log(`Upserting attendance for ${byEmployeeDay.size} employee-days…`)
  let upserted = 0
  for (const { employeeId, dateISO, punches } of byEmployeeDay.values()) {
    punches.sort((a, b) => a.getTime() - b.getTime())
    const checkIn = punches[0]
    const checkOut = punches.length > 1 ? punches[punches.length - 1] : null

    const workingHours = checkOut ? computeWorkingHours(checkIn, checkOut, breakMinutes) : null
    const overtimeHours = workingHours != null ? computeOvertimeHours(workingHours, standardHours) : null
    const shortageHours = workingHours != null ? computeShortageHours(workingHours, standardHours) : null
    const lateMinutes = computeLateMinutes(checkIn, dateISO, startTime, graceMinutes)
    const status = deriveAttendanceStatus({ hasCheckIn: true, lateMinutes, workingHours: workingHours ?? 0, standardHours })

    const { error } = await supabase.from('attendance').upsert(
      {
        employee_id: employeeId,
        date: dateISO,
        check_in: checkIn.toISOString(),
        check_out: checkOut ? checkOut.toISOString() : null,
        status,
        working_hours: workingHours,
        shortage_hours: shortageHours,
        late_minutes: lateMinutes,
        overtime_hours: overtimeHours,
        source: 'machine',
        machine_log_id: `${employeeId}-${dateISO}-${punches.length}punches`,
      },
      { onConflict: 'employee_id,date' }
    )
    if (error) {
      console.error(`Failed to upsert employee ${employeeId} on ${dateISO}:`, error.message)
    } else {
      upserted++
    }
  }

  console.log(`Done — ${upserted} attendance rows upserted.`)
  await markDeviceSynced(device.id, null)
}

main().catch(async (err) => {
  console.error('Sync failed:', err)
  process.exitCode = 1
})
