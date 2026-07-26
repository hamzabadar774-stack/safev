// Small API module for backend system status + mode toggle.
// Kept separate from safeviewApi so business modules stay focused.

const API_URL: string =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

export interface SystemStatus {
  backend_connected: boolean;
  database_connected: boolean;
  detection_engine_running: boolean;
  replay_running: boolean;
  mode: "demo" | "live";
  cameras_total: number;
  cameras_online: number;
  packets_total: number;
  threats_active: number;
  uptime_seconds: number;
  timestamp: string;
}

function authHeaders(): Record<string, string> {
  try {
    const t = localStorage.getItem("safeview.token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch { return {}; }
}

export async function getSystemStatus(): Promise<SystemStatus | null> {
  try {
    const r = await fetch(`${API_URL}/system/status`);
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as SystemStatus;
  } catch {
    return null;
  }
}

export async function getSystemMode(): Promise<{ mode: "demo" | "live" } | null> {
  try {
    const r = await fetch(`${API_URL}/system/mode`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function setSystemMode(mode: "demo" | "live") {
  const r = await fetch(`${API_URL}/system/mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ mode }),
  });
  return r.json();
}
