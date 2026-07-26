import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
type RealtimeChannel = ReturnType<typeof supabase.channel>;


export interface NetworkPacket {
  id: string;
  timestamp: string;
  source_ip: string;
  destination_ip: string;
  source_port: number;
  destination_port: number;
  protocol: string;
  packet_size: number;
  flags: string | null;
}

export interface ThreatDetection {
  id: string;
  packet_id: string | null;
  timestamp: string;
  threat_type: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  source_ip: string;
  target_device: string | null;
  description: string | null;
  ml_model_version: string | null;
  is_blocked: boolean;
  action_taken: string;
  status: "new" | "investigating" | "acknowledged" | "resolved" | "false_positive";
  updated_at?: string;
}

export interface AlertLog {
  id: string;
  threat_id: string | null;
  action: string;
  actor: string | null;
  notes: string | null;
  created_at: string;
}

export function useAlertLogs(limit = 50) {
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: RealtimeChannel;
    async function fetchInitial() {
      const { data } = await supabase
        .from("alert_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (data) setLogs(data as AlertLog[]);
      setLoading(false);
    }
    fetchInitial();
    channel = supabase
      .channel("alert_logs_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alert_logs" }, (payload) => {
        setLogs((prev) => [payload.new as AlertLog, ...prev.slice(0, limit - 1)]);
      })
      .subscribe();
    return () => {
      channel?.unsubscribe();
    };
  }, [limit]);

  return { logs, loading };
}

export interface CCTVDevice {
  id: string;
  name: string;
  ip_address: string;
  mac_address: string | null;
  device_type: string;
  manufacturer: string | null;
  status: "online" | "offline" | "warning";
  last_seen: string | null;
  location: string | null;
  firmware_version: string | null;
  threat_level: "safe" | "suspicious" | "at_risk";
  total_packets: number;
  blocked_attacks: number;
}

export interface MLModelStatus {
  id: string;
  is_active: boolean;
  model_name: string;
  model_version: string;
  accuracy: number;
  last_trained: string | null;
  total_predictions: number;
  threats_detected: number;
}

export interface TrafficStats {
  id: string;
  timestamp: string;
  total_packets: number;
  safe_packets: number;
  suspicious_packets: number;
  blocked_packets: number;
  bandwidth_mbps: number;
}

export function useRealtimePackets(limit = 50) {
  const [packets, setPackets] = useState<NetworkPacket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: RealtimeChannel;

    async function fetchInitial() {
      const { data, error } = await supabase
        .from("network_packets")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (!error && data) {
        setPackets(data as NetworkPacket[]);
      }
      setLoading(false);
    }

    fetchInitial();

    channel = supabase
      .channel("network_packets_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "network_packets" },
        (payload) => {
          setPackets((prev) => [payload.new as NetworkPacket, ...prev.slice(0, limit - 1)]);
        }
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, [limit]);

  return { packets, loading };
}

export function useRealtimeThreats(limit = 20) {
  const [threats, setThreats] = useState<ThreatDetection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: RealtimeChannel;

    async function fetchInitial() {
      const { data, error } = await supabase
        .from("threats")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (!error && data) {
        setThreats(data as ThreatDetection[]);
      }
      setLoading(false);
    }

    fetchInitial();

    channel = supabase
      .channel("threats_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "threats" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setThreats((prev) => [payload.new as ThreatDetection, ...prev.slice(0, limit - 1)]);
          } else if (payload.eventType === "UPDATE") {
            setThreats((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as ThreatDetection) : t))
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, [limit]);

  return { threats, loading };
}

export function useDevices() {
  const [devices, setDevices] = useState<CCTVDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: RealtimeChannel;

    async function fetchInitial() {
      const { data, error } = await supabase
        .from("cctv_devices")
        .select("*")
        .order("name");

      if (!error && data) {
        setDevices(data as CCTVDevice[]);
      }
      setLoading(false);
    }

    fetchInitial();

    channel = supabase
      .channel("cctv_devices_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cctv_devices" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setDevices((prev) =>
              prev.map((d) => (d.id === payload.new.id ? (payload.new as CCTVDevice) : d))
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, []);

  return { devices, loading };
}

export function useMLStatus() {
  const [status, setStatus] = useState<MLModelStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      const { data, error } = await supabase
        .from("ml_model_status")
        .select("*")
        .single();

      if (!error && data) {
        setStatus(data as MLModelStatus);
      }
      setLoading(false);
    }

    fetchStatus();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return { status, loading };
}

export function useTrafficStats(hours = 24) {
  const [stats, setStats] = useState<TrafficStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const since = new Date();
      since.setHours(since.getHours() - hours);

      const { data, error } = await supabase
        .from("traffic_stats")
        .select("*")
        .gte("timestamp", since.toISOString())
        .order("timestamp", { ascending: true });

      if (!error && data) {
        setStats(data as TrafficStats[]);
      }
      setLoading(false);
    }

    fetchStats();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, [hours]);

  return { stats, loading };
}
