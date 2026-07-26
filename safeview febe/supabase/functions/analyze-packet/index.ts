import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const THREAT_TYPES = [
  "ddos_attack",
  "port_scan", 
  "brute_force",
  "unauthorized_access",
  "stream_hijacking",
  "command_injection",
  "malware_payload",
  "abnormal_traffic",
  "rtsp_exploit",
  "onvif_attack",
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { packet } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log("Analyzing packet:", packet);

    // Use AI to analyze the network packet for threats
    const analysisPrompt = `You are a network security AI expert specialized in CCTV/IP camera intrusion detection.

Analyze this network packet and determine if it represents a security threat:

Packet Data:
- Source IP: ${packet.source_ip}
- Destination IP: ${packet.destination_ip}  
- Source Port: ${packet.source_port}
- Destination Port: ${packet.destination_port}
- Protocol: ${packet.protocol}
- Packet Size: ${packet.packet_size} bytes
- Flags: ${packet.flags || "none"}

Context:
- Common CCTV ports: 554 (RTSP), 80/8080 (HTTP), 443 (HTTPS), 37777 (Dahua), 8000 (Hikvision)
- Internal network: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
- External IPs accessing camera ports are suspicious
- High packet counts from single source = potential DDoS
- Sequential port access = port scanning
- Multiple auth attempts = brute force

Respond with a JSON object (no markdown):
{
  "is_threat": boolean,
  "threat_type": one of [${THREAT_TYPES.map(t => `"${t}"`).join(", ")}] or null,
  "severity": "low" | "medium" | "high" | "critical",
  "confidence": 0.0 to 1.0,
  "description": "brief explanation",
  "recommendation": "action to take"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a network security AI. Respond only with valid JSON, no markdown." },
          { role: "user", content: analysisPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    console.log("AI Response:", content);

    // Parse AI response
    let analysis;
    try {
      // Clean up response - remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      // Default safe response
      analysis = {
        is_threat: false,
        threat_type: null,
        severity: "low",
        confidence: 0.5,
        description: "Unable to analyze packet",
        recommendation: "Monitor for patterns"
      };
    }

    // Save packet to database
    const { data: savedPacket, error: packetError } = await supabase
      .from("network_packets")
      .insert({
        source_ip: packet.source_ip,
        destination_ip: packet.destination_ip,
        source_port: packet.source_port,
        destination_port: packet.destination_port,
        protocol: packet.protocol,
        packet_size: packet.packet_size,
        flags: packet.flags,
      })
      .select()
      .single();

    if (packetError) {
      console.error("Error saving packet:", packetError);
    }

    // If threat detected, save to threats table
    let threatRecord = null;
    if (analysis.is_threat && savedPacket) {
      const shouldBlock = analysis.severity === "critical" || 
        (analysis.severity === "high" && analysis.confidence > 0.85);

      const { data: threat, error: threatError } = await supabase
        .from("threats")
        .insert({
          packet_id: savedPacket.id,
          threat_type: analysis.threat_type,
          severity: analysis.severity,
          confidence: analysis.confidence,
          source_ip: packet.source_ip,
          target_device: packet.target_device || null,
          description: analysis.description,
          ml_model_version: "v3.0.0-AI",
          is_blocked: shouldBlock,
          action_taken: shouldBlock ? "blocked" : "alerted",
        })
        .select()
        .single();

      if (threatError) {
        console.error("Error saving threat:", threatError);
      } else {
        threatRecord = threat;
      }
    }


    // Update model prediction count
    const { data: modelStatus } = await supabase
      .from("ml_model_status")
      .select("*")
      .single();

    if (modelStatus) {
      await supabase
        .from("ml_model_status")
        .update({
          total_predictions: modelStatus.total_predictions + 1,
          threats_detected: analysis.is_threat 
            ? modelStatus.threats_detected + 1 
            : modelStatus.threats_detected,
        })
        .eq("id", modelStatus.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          packet: savedPacket,
          analysis,
          threat: threatRecord,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-packet:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
