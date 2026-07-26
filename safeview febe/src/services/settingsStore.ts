import { useEffect, useState } from "react";

export type AppSettings = {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    criticalOnly: boolean;
    sound: boolean;
  };
  system: {
    refreshInterval: number; // seconds
    timezone: string;
    dateFormat: "ISO" | "US" | "EU";
    language: string;
  };
  cctv: {
    autoReconnect: boolean;
    streamQuality: "low" | "medium" | "high" | "ultra";
    autoRecord: boolean;
    sensitivity: "low" | "medium" | "high";
    severityFilter: "all" | "medium+" | "high+" | "critical";
  };
  security: {
    twoFactor: boolean;
    sessionTimeout: number; // minutes
  };
  profile: {
    username: string;
    phone: string;
    organization: string;
    role: string;
  };
};

const DEFAULTS: AppSettings = {
  notifications: { email: true, sms: false, push: true, criticalOnly: false, sound: true },
  system: { refreshInterval: 30, timezone: "UTC", dateFormat: "ISO", language: "en" },
  cctv: { autoReconnect: true, streamQuality: "medium", autoRecord: false, sensitivity: "medium", severityFilter: "all" },
  security: { twoFactor: false, sessionTimeout: 60 },
  profile: { username: "", phone: "", organization: "SafeView Security", role: "SOC Analyst" },
};

const KEY = "safeview-settings-v1";

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

const listeners = new Set<(s: AppSettings) => void>();
let current: AppSettings = typeof window !== "undefined" ? load() : DEFAULTS;

export function getSettings(): AppSettings { return current; }

export function updateSettings(patch: Partial<AppSettings>) {
  current = { ...current, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch {}
  listeners.forEach((l) => l(current));
}

export function useSettings() {
  const [s, setS] = useState<AppSettings>(current);
  useEffect(() => {
    const fn = (next: AppSettings) => setS(next);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return [s, updateSettings] as const;
}
