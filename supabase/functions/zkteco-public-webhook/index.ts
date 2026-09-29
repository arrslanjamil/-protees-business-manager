import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(supabaseUrl, supabaseKey)

// This endpoint accepts requests from ZKTeco device WITHOUT authentication
// Used for initial testing and device connectivity verification
serve(async (req) => {
  try {
    // CORS for all origins
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE, HEAD",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
      "Access-Control-Max-Age": "86400",
    }

    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: corsHeaders })
    }

    if (req.method === "GET" || req.method === "HEAD") {
      return new Response("Webhook ready", { status: 200, headers: corsHeaders })
    }

    // Parse request
    const method = req.method
    const url = new URL(req.url)
    const path = url.pathname + url.search

    // Get all headers
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Get body
    let body = ""
    try {
      body = await req.text()
    } catch (e) {
      body = "(could not read body)"
    }

    const sourceIp = req.headers.get("x-forwarded-for") ||
                     req.headers.get("cf-connecting-ip") ||
                     "unknown"

    console.log(`
📨 ZKTECO DEVICE REQUEST RECEIVED
==================================
Timestamp: ${new Date().toISOString()}
Method: ${method}
Path: ${path}
Source IP: ${sourceIp}
Body: ${body}
`)

    // Save to logs
    try {
      await supabase.from("zkteco_request_logs").insert({
        path,
        method,
        headers,
        body,
        source_ip: sourceIp,
        user_agent: req.headers.get("user-agent"),
        timestamp: new Date().toISOString(),
      })
      console.log("✅ Request logged to database")
    } catch (e) {
      console.error("Failed to log:", e)
    }

    // Try to process as attendance
    if (body) {
      try {
        const data = JSON.parse(body)

        // Check for attendance markers
        if (data.user_id || data.deviceEmployeeId || data.device_employee_id ||
            data.checkin || data.check_in || data.checkOut || data.check_out) {

          console.log("✅ ATTENDANCE PAYLOAD DETECTED")
          console.log("Data:", JSON.stringify(data, null, 2))

          // Forward to zkteco-attendance
          const response = await fetch(
            `${supabaseUrl}/functions/v1/zkteco-attendance`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify(data),
            }
          )

          const result = await response.json()
          console.log("Attendance processing result:", result)

          return new Response(
            JSON.stringify({ success: true, message: "Attendance recorded", result }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
      } catch (e) {
        // Not JSON, continue
      }
    }

    // Generic success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Request received and logged",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )

  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      }
    )
  }
})
