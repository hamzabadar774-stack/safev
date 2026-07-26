import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { threat_id } = await req.json();
    
    if (!threat_id) {
      return new Response(
        JSON.stringify({ success: false, error: "threat_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log("Blocking threat:", threat_id);

    // Update threat status
    const { data: threat, error } = await supabase
      .from("threats")
      .update({
        is_blocked: true,
        action_taken: "blocked",
      })
      .eq("id", threat_id)
      .select()
      .single();

    if (error) {
      console.error("Error blocking threat:", error);
      throw error;
    }

    // Update device blocked attacks count if we have a target device
    if (threat?.target_device) {
      const { data: device } = await supabase
        .from("cctv_devices")
        .select("*")
        .eq("name", threat.target_device)
        .single();

      if (device) {
        await supabase
          .from("cctv_devices")
          .update({
            blocked_attacks: device.blocked_attacks + 1,
          })
          .eq("id", device.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: threat,
        message: "Threat successfully blocked",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in block-threat:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
