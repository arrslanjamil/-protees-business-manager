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

    // Determine employee by matching device_employee_id first, then fall back to zkteco_user_mapping
    let employeeId: number | null = null

    // Strategy 1: Match by device_employee_id (direct SenseFace mapping)
    if (payload.device_employee_id) {
      const { data: employee } = await supabase
        .from("app_users")
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
          check_in: payload.check_in ? new Date(`${new Date().toISOString().split('T')[0]}T${payload.check_in}`).toISOString() : null,
          check_out: payload.check_out ? new Date(`${new Date().toISOString().split('T')[0]}T${payload.check_out}`).toISOString() : null,
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
    const date = new Date(payload.timestamp).toISOString().split("T")[0]

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
      attendanceData.check_in = payload.check_in
      attendanceData.status = "present"
    } else if (isCheckOut) {
      attendanceData.check_out = payload.check_out
    }

    // Add temperature if provided (health screening)
    if (payload.temperature) {
      attendanceData.temperature = payload.temperature
    }

    // Add photo if provided
    if (payload.photo_url) {
      attendanceData.photo_url = payload.photo_url
    }

    // Upsert attendance record
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance")
      .upsert(
        existing
          ? { ...existing, ...attendanceData }
          : attendanceData,
        { onConflict: "employee_id,date" }
      )
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
