import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  try {
    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      })
    }

    // Parse request
    const method = req.method
    const url = new URL(req.url)
    const path = url.pathname + url.search
    const queryParams: Record<string, string> = {}

    // Extract query parameters
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value
    })

    // Capture all headers
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Get request body
    let body = ""
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        body = await req.text()
      }
    } catch (e) {
      body = "(Could not read body)"
    }

    // Get source IP
    const sourceIp = req.headers.get("x-forwarded-for") ||
                     req.headers.get("cf-connecting-ip") ||
                     "unknown"

    const userAgent = req.headers.get("user-agent") || "unknown"

    // Log to console
    console.log(`
🔔 INCOMING REQUEST CAPTURED
============================
Timestamp: ${new Date().toISOString()}
Method: ${method}
Path: ${path}
Source IP: ${sourceIp}
User-Agent: ${userAgent}
Headers: ${JSON.stringify(headers, null, 2)}
Query: ${JSON.stringify(queryParams, null, 2)}
Body: ${body.substring(0, 500)}${body.length > 500 ? "..." : ""}
`)

    // Store in database
    try {
      const { error: insertError } = await supabase
        .from("zkteco_request_logs")
        .insert({
          path,
          method,
          headers,
          query_params: Object.keys(queryParams).length > 0 ? queryParams : null,
          body,
          source_ip: sourceIp,
          user_agent: userAgent,
          timestamp: new Date().toISOString(),
        })

      if (insertError) {
        console.error("Failed to insert log:", insertError)
      } else {
        console.log("✅ Request logged to database")
      }
    } catch (e) {
      console.error("Logging error:", e)
    }

    // Try to parse and process attendance
    if (body) {
      try {
        const data = JSON.parse(body)

        // Detect attendance payload
        if (data.user_id || data.userId || data.deviceId || data.device_id ||
            data.checkin || data.check_in || data.checkpoint) {
          console.log("✅ ATTENDANCE PAYLOAD DETECTED")
          console.log("Payload:", JSON.stringify(data, null, 2))

          // Auto-forward to attendance processor
          const attendanceResponse = await fetch(
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

          const result = await attendanceResponse.json()
          console.log("Processing result:", result)

          return new Response(
            JSON.stringify({ success: true, processed: true, result }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        }

        // Detect device status payload
        if (data.is_online !== undefined || data.isOnline !== undefined ||
            data.status || data.device_id || data.deviceId) {
          console.log("✅ DEVICE STATUS PAYLOAD DETECTED")
          console.log("Payload:", JSON.stringify(data, null, 2))

          // Auto-forward to status processor
          const statusResponse = await fetch(
            `${supabaseUrl}/functions/v1/zkteco-device-status`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify(data),
            }
          )

          const result = await statusResponse.json()
          console.log("Status processing result:", result)

          return new Response(
            JSON.stringify({ success: true, processed: true, result }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        }
      } catch (e) {
        // Not JSON - continue to generic response
      }
    }

    // Generic acknowledgment
    return new Response(
      JSON.stringify({
        success: true,
        message: "Request received and logged",
        method,
        path,
        note: "Check zkteco_request_logs table for details",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  } catch (error) {
    console.error("Fatal error:", error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      }
    )
  }
})
