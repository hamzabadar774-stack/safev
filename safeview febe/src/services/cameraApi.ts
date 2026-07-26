// Reusable camera service layer — ready for swap to a real backend.
import { supabase } from "@/integrations/supabase/client";

export type CameraType = "ip" | "webcam" | "rtsp" | "dvr" | "demo";
export type CameraStatus =
  | "online" | "offline" | "warning" | "compromised" | "reconnecting" | "connecting";

export interface CameraConnectionInput {
  name: string;
  type: CameraType;
  ip_address?: string;
  rtsp_url?: string;
  username?: string;
  password?: string;
  location?: string;
  manufacturer?: string;
  zone?: string;
  proxy_url?: string;
}

export interface CameraDevice extends CameraConnectionInput {
  id: string;
  status: CameraStatus;
  latency_ms?: number;
  uptime_seconds?: number;
  last_seen?: string;
}

/** Tests connectivity to a camera. In demo/webcam mode this always succeeds. */
export async function testConnection(input: CameraConnectionInput): Promise<{
  ok: boolean;
  latency_ms: number;
  message: string;
}> {
  const start = performance.now();
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
  const latency = Math.round(performance.now() - start);

  if (input.type === "demo" || input.type === "webcam") {
    return { ok: true, latency_ms: latency, message: "Local stream available" };
  }
  if (!input.ip_address && !input.rtsp_url) {
    return { ok: false, latency_ms: latency, message: "Missing IP / RTSP URL" };
  }
  // Simulated: 80% success
  const ok = Math.random() > 0.2;
  return {
    ok,
    latency_ms: latency,
    message: ok ? "Reachable" : "Connection refused (timeout)",
  };
}

/** Persist a camera into the cctv_devices table. */
export async function registerCamera(input: CameraConnectionInput) {
  const { data, error } = await supabase
    .from("cctv_devices")
    .insert({
      name: input.name,
      device_type: input.type,
      ip_address: input.ip_address || "0.0.0.0",
      manufacturer: input.manufacturer || "Unknown",
      location: input.location || input.zone || "Unassigned",
      status: "online",
      threat_level: "safe",
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}
