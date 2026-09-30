import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

interface AttendanceRecord {
  user_id?: string
  device_employee_id?: string
  check_in?: string
  check_out?: string
  timestamp: string
  device_id: string
  device_name?: string
  temperature?: number
  photo_url?: string
}

/** The devices are on-site in Pakistan and report bare wall-clock times with
 * no zone. Pakistan has observed no DST since 2009, so a fixed offset is safe
 * and keeps this arithmetic deterministic without a tz database lookup. */
const BUSINESS_TIME_ZONE = "Asia/Karachi"
const BUSINESS_UTC_OFFSET = "+05:00"

/** The attendance `date` column is the business-local calendar day of the
 * punch, not its UTC day: a 02:00 punch in Karachi is 21:00 UTC the previous
 * day, and bucketing by UTC would file it under the wrong date. */
function businessDate(instantISO: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instantISO))
  const part = (type: string) => parts.find((p) => p.type === type)!.value
  return `${part("year")}-${part("month")}-${part("day")}`
}

/** attendance.check_in / check_out are TIMESTAMPTZ (migration 032), so a bare
 * "09:00:00" cannot be stored as-is — it has no date. Pin the wall clock to
 * the punch's business-local day and offset so the stored instant renders back
 * as the same wall-clock time. Firmware that already sends a full datetime is
 * passed through. Returns null when the value is absent or unparseable, which
 * is preferable to writing a value that reads as "Invalid Date" in the UI. */
function toPunchTimestamp(dateISO: string, wallClock?: string | null): string | null {
  const raw = wallClock?.trim()
  if (!raw) return null

  if (raw.includes("T") || raw.includes(" ")) {
    const full = new Date(raw)
    return Number.isNaN(full.getTime()) ? null : full.toISOString()
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null
  const [, hour, minute, second = "00"] = match
  const stamped = new Date(
    `${dateISO}T${hour.padStart(2, "0")}:${minute}:${second}${BUSINESS_UTC_OFFSET}`,
  )
  return Number.isNaN(stamped.getTime()) ? null : stamped.toISOString()
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  try {
    const payload = await req.json() as AttendanceRecord

    // Validate required fields
    if (!payload.device_id || !payload.timestamp) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: device_id, timestamp" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Business-local day of this punch. Computed before the mapping branches
    // because the unmapped fallback needs it too.
    const date = businessDate(payload.timestamp)

    // Determine employee by matching device_employee_id first, then fall back to zkteco_user_mapping
    let employeeId: number | null = null

    // Strategy 1: Match by device_employee_id (direct SenseFace mapping)
    if (payload.device_employee_id) {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("device_employee_id", payload.device_employee_id)
        .single()

      if (employee) {
        employeeId = Number(employee.id)
      }
    }

    // Strategy 2: Fall back to zkteco_user_mapping (for K40 compatibility)
    if (!employeeId && payload.user_id) {
      const { data: mapping } = await supabase
        .from("zkteco_user_mapping")
        .select("employee_id")
        .eq("zkteco_user_id", payload.user_id)
        .single()

      if (mapping) {
        employeeId = Number(mapping.employee_id)
      }
    }

    // Strategy 3: No matching employee found - save to unmapped_attendance
    if (!employeeId) {
      console.log("No employee mapping found, saving to unmapped_attendance")
      const { error: unmappedError } = await supabase
        .from("unmapped_attendance")
        .insert({
          device_employee_id: payload.device_employee_id || payload.user_id || "unknown",
          device_id: payload.device_id,
          device_name: payload.device_name || "ZKTeco SenseFace",
          check_in: toPunchTimestamp(date, payload.check_in),
          check_out: toPunchTimestamp(date, payload.check_out),
          raw_payload: payload,
          sync_time: new Date().toISOString(),
          status: "unmapped",
        })

      if (unmappedError) {
        console.error("Failed to save unmapped attendance:", unmappedError)
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: `No employee mapping found for device ID ${payload.device_employee_id || payload.user_id}`,
          saved_as_unmapped: !unmappedError,
          error: `Unmapped attendance: device_employee_id ${payload.device_employee_id || payload.user_id}`,
        }),
        { status: 202, headers: { "Content-Type": "application/json" } }
      )
    }

    // Get or create attendance record for the day
    const { data: existingRecords } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("date", date)

    const existing = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null

    // Determine if this is check-in or check-out
    const isCheckIn = !payload.check_out && payload.check_in
    const isCheckOut = payload.check_out && !payload.check_in

    let attendanceData: any = {
      employee_id: employeeId,
      date,
      source: "machine",
      device_id: payload.device_id,
      device_name: payload.device_name || "ZKTeco SenseFace",
      device_employee_id: payload.device_employee_id || payload.user_id,
      device_sync_time: new Date().toISOString(),
      device_source: "zkteco_senseface",
    }

    if (isCheckIn) {
      attendanceData.check_in = toPunchTimestamp(date, payload.check_in)
      attendanceData.status = "present"
    } else if (isCheckOut) {
      let checkOut = toPunchTimestamp(date, payload.check_out)

      // A shift that crossed midnight punches out on the following calendar
      // day, while `date` stays the day the shift began. Roll the timestamp
      // forward so the instant is right and working_hours stays positive —
      // migration 032's check_out > check_in constraint rejects it otherwise.
      if (checkOut && existing?.check_in && new Date(checkOut) <= new Date(existing.check_in)) {
        const rolled = new Date(checkOut)
        rolled.setUTCDate(rolled.getUTCDate() + 1)
        checkOut = rolled.toISOString()
      }

      attendanceData.check_out = checkOut
    }

    // NOTE: the device may also report `temperature` and `photo_url`, but the
    // attendance table has no such columns — writing them made PostgREST
    // reject the whole upsert. They stay in raw_payload on the unmapped path
    // until columns exist to hold them.

    // Write the punch. Spreading `existing` into an upsert used to re-send its
    // `id`, which attendance declares GENERATED ALWAYS AS IDENTITY — Postgres
    // rejects that with "cannot insert a non-DEFAULT value into column id", so
    // every second punch of the day (i.e. every check-out) failed with a 500.
    // Updating by id touches only the fields this punch actually carries and
    // leaves check_in, created_at and the created_by audit columns intact.
    const { data: attendance, error: attendanceError } = existing
      ? await supabase
          .from("attendance")
          .update(attendanceData)
          .eq("id", existing.id)
          .select()
          .single()
      : await supabase
          .from("attendance")
          .insert(attendanceData)
          .select()
          .single()

    if (attendanceError) {
      console.error("Attendance insert error:", attendanceError)
      return new Response(
        JSON.stringify({ error: attendanceError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    // Update device status (last sync)
    await supabase
      .from("zkteco_devices")
      .update({
        last_sync: new Date().toISOString(),
        is_online: true,
      })
      .eq("device_id", payload.device_id)

    // Log the sync for audit
    await supabase
      .from("zkteco_sync_log")
      .insert({
        device_id: payload.device_id,
        employee_id: employeeId,
        action: isCheckIn ? "check_in" : isCheckOut ? "check_out" : "update",
        timestamp: new Date().toISOString(),
        status: "success",
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: `${isCheckIn ? "Check-in" : isCheckOut ? "Check-out" : "Update"} recorded for employee ${employeeId}`,
        attendance_id: attendance.id,
        employee_id: employeeId,
        date,
        check_in: attendance.check_in,
        check_out: attendance.check_out,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    )
  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
