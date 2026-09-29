import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

interface AttendanceRecord {
  user_id: string
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
    if (!payload.user_id || !payload.device_id || !payload.timestamp) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, device_id, timestamp" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Get employee ID from ZKTeco user mapping
    const { data: mapping, error: mapError } = await supabase
      .from("zkteco_user_mapping")
      .select("employee_id")
      .eq("zkteco_user_id", payload.user_id)
      .single()

    if (mapError || !mapping) {
      return new Response(
        JSON.stringify({ error: `No employee mapping found for ZKTeco user ${payload.user_id}` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    const employeeId = mapping.employee_id
    const date = new Date(payload.timestamp).toISOString().split("T")[0]

    // Get or create attendance record for the day
    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("date", date)
      .single()

    // Determine if this is check-in or check-out
    const isCheckIn = !payload.check_out && payload.check_in
    const isCheckOut = payload.check_out && !payload.check_in

    let attendanceData: any = {
      employee_id: employeeId,
      date,
      source: "machine",
      device_id: payload.device_id,
      device_name: payload.device_name || "ZKTeco SenseFace",
      last_sync: new Date().toISOString(),
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
