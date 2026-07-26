import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROTOCOLS = ["TCP", "UDP", "HTTP", "HTTPS", "RTSP", "ONVIF", "ICMP", "SSH"];
const COMMON_PORTS = [80, 443, 554, 8080, 8000, 22, 21, 37777, 34567];

function randomIP(internal = true): string {
  if (internal) {
    return `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
  }
  return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function generatePacket(attackType?: string) {
  const isExternal = Math.random() > 0.6;
  const basePacket = {
    source_ip: isExternal ? randomIP(false) : randomIP(true),
    destination_ip: randomIP(true),
    source_port: Math.floor(Math.random() * 65535),
    destination_port: COMMON_PORTS[Math.floor(Math.random() * COMMON_PORTS.length)],
    protocol: PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)],
    packet_size: Math.floor(Math.random() * 1500) + 64,
    flags: Math.random() > 0.5 ? "SYN" : "ACK",
  };

  // Generate attack scenarios for more interesting demo
  if (attackType === "ddos") {
    return {
      ...basePacket,
      source_ip: randomIP(false),
      destination_port: 554, // RTSP port
      protocol: "RTSP",
      packet_size: 64, // Small packets, high volume
      flags: "SYN",
    };
  } else if (attackType === "port_scan") {
    return {
      ...basePacket,
      source_ip: randomIP(false),
      destination_port: Math.floor(Math.random() * 65535),
      flags: "SYN",
      packet_size: 60,
    };
  } else if (attackType === "brute_force") {
    return {
      ...basePacket,
      source_ip: randomIP(false),
      destination_port: 22, // SSH
      protocol: "SSH",
      flags: "PSH,ACK",
    };
  }

  return basePacket;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { count = 1, attack_scenario } = await req.json().catch(() => ({}));
    
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log(`Generating ${count} packets, scenario: ${attack_scenario || "normal"}`);

    const packets = [];
    for (let i = 0; i < Math.min(count, 10); i++) {
      // 20% chance of generating attack traffic
      const attackType = attack_scenario || (Math.random() < 0.2 
        ? ["ddos", "port_scan", "brute_force"][Math.floor(Math.random() * 3)] 
        : undefined);
      
      packets.push(generatePacket(attackType));
    }

    // Insert packets
    const { data: savedPackets, error } = await supabase
      .from("network_packets")
      .insert(packets)
      .select();

    if (error) {
      console.error("Error saving packets:", error);
      throw error;
    }

    // Analyze each packet using the analyze-packet function
    const analysisResults = [];
    for (const packet of savedPackets || []) {
      try {
        // Call the analyze function internally
        const analyzeUrl = `${SUPABASE_URL}/functions/v1/analyze-packet`;
        const response = await fetch(analyzeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ packet }),
        });
        
        if (response.ok) {
          const result = await response.json();
          analysisResults.push(result);
        }
      } catch (e) {
        console.error("Error analyzing packet:", e);
      }
    }

    // Update traffic stats
    const now = new Date();
    now.setMinutes(0, 0, 0); // Round to current hour

    const { data: existingStats } = await supabase
      .from("traffic_stats")
      .select("*")
      .gte("timestamp", now.toISOString())
      .single();

    const threatsCount = analysisResults.filter(r => r.data?.analysis?.is_threat).length;
    const blockedCount = analysisResults.filter(r => r.data?.threat?.is_blocked).length;

    if (existingStats) {
      await supabase
        .from("traffic_stats")
        .update({
          total_packets: existingStats.total_packets + packets.length,
          safe_packets: existingStats.safe_packets + (packets.length - threatsCount),
          suspicious_packets: existingStats.suspicious_packets + threatsCount,
          blocked_packets: existingStats.blocked_packets + blockedCount,
          bandwidth_mbps: 50 + Math.random() * 100,
        })
        .eq("id", existingStats.id);
    } else {
      await supabase
        .from("traffic_stats")
        .insert({
          timestamp: now.toISOString(),
          total_packets: packets.length,
          safe_packets: packets.length - threatsCount,
          suspicious_packets: threatsCount,
          blocked_packets: blockedCount,
          bandwidth_mbps: 50 + Math.random() * 100,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          packets_generated: packets.length,
          threats_detected: threatsCount,
          blocked: blockedCount,
          results: analysisResults,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in simulate-traffic:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
