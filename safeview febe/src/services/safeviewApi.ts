import { supabase } from "@/integrations/supabase/client";

export interface AnalyzePacketResult {
  success: boolean;
  data?: {
    packet: any;
    analysis: {
      is_threat: boolean;
      threat_type: string | null;
      severity: string;
      confidence: number;
      description: string;
      recommendation: string;
    };
    threat: any | null;
  };
  error?: string;
}

export interface SimulateTrafficResult {
  success: boolean;
  data?: {
    packets_generated: number;
    threats_detected: number;
    blocked: number;
    results: any[];
  };
  error?: string;
}

export async function analyzePacket(packet: {
  source_ip: string;
  destination_ip: string;
  source_port: number;
  destination_port: number;
  protocol: string;
  packet_size: number;
  flags?: string;
  target_device?: string;
}): Promise<AnalyzePacketResult> {
  try {
    const { data, error } = await supabase.functions.invoke("analyze-packet", {
      body: { packet },
    });

    if (error) {
      console.error("Error analyzing packet:", error);
      return { success: false, error: error.message };
    }

    return data as AnalyzePacketResult;
  } catch (e) {
    console.error("Error calling analyze-packet:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function simulateTraffic(
  count = 1,
  attackScenario?: "ddos" | "port_scan" | "brute_force"
): Promise<SimulateTrafficResult> {
  try {
    const { data, error } = await supabase.functions.invoke("simulate-traffic", {
      body: { count, attack_scenario: attackScenario },
    });

    if (error) {
      console.error("Error simulating traffic:", error);
      return { success: false, error: error.message };
    }

    return data as SimulateTrafficResult;
  } catch (e) {
    console.error("Error calling simulate-traffic:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function blockThreat(threatId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("block-threat", {
      body: { threat_id: threatId },
    });

    if (error) {
      console.error("Error blocking threat:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    console.error("Error calling block-threat:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function getDashboardStats() {
  const [packetsResult, threatsResult, devicesResult] = await Promise.all([
    supabase.from("network_packets").select("*", { count: "exact", head: true }),
    supabase.from("threats").select("*", { count: "exact", head: true }),
    supabase.from("cctv_devices").select("*").eq("status", "online"),
  ]);

  const { count: totalPackets } = packetsResult;
  const { count: totalThreats } = threatsResult;
  const { data: onlineDevices } = devicesResult;

  // Get blocked threats count
  const { count: blockedCount } = await supabase
    .from("threats")
    .select("*", { count: "exact", head: true })
    .eq("is_blocked", true);

  // Get critical threats count
  const { count: criticalCount } = await supabase
    .from("threats")
    .select("*", { count: "exact", head: true })
    .eq("severity", "critical");

  const blockRate = totalThreats && totalThreats > 0 
    ? ((blockedCount || 0) / totalThreats) * 100 
    : 0;

  return {
    packets_analyzed: totalPackets || 0,
    threats_detected: totalThreats || 0,
    attacks_blocked: blockedCount || 0,
    active_devices: onlineDevices?.length || 0,
    block_rate: blockRate,
    critical_threats: criticalCount || 0,
  };
}
