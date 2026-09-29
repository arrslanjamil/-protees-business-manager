import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  }

  try {
    const payload = await req.json() as {
      device_id: string
      device_name: string
      is_online?: boolean
      timestamp?: string
    }

    if (!payload.device_id) {
      return new Response(
        JSON.stringify({ error: "device_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Update or create device status
    const { data, error } = await supabase
      .from("zkteco_devices")
      .upsert(
        {
          device_id: payload.device_id,
          device_name: payload.device_name || "ZKTeco SenseFace",
          is_online: payload.is_online !== false,
          last_sync: new Date().toISOString(),
        },
        { onConflict: "device_id" }
      )
      .select()
      .single()

    if (error) {
      console.error("Device status error:", error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        device: data,
        message: `Device ${payload.device_id} status updated`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
