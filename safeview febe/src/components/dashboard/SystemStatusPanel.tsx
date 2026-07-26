// Small backend status widget. Reads /system/status every 5s and exposes the
// Demo/Live mode toggle. Intentionally minimal — matches existing cyber-card
// styling; no new visual system introduced.

import { useEffect, useState } from "react";
import { Activity, Database, ShieldCheck, Video, Radio, Cpu } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  getSystemStatus,
  setSystemMode,
  type SystemStatus,
} from "@/services/systemApi";

function Row({
  icon: Icon,
  label,
  value,
  ok,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  ok?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <div
        className={
          "font-mono " +
          (ok === true
            ? "text-success"
            : ok === false
            ? "text-destructive"
            : "text-foreground")
        }
      >
        {value}
      </div>
    </div>
  );
}

export function SystemStatusPanel() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const s = await getSystemStatus();
      if (alive) setStatus(s);
    };
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const isDemo = status?.mode === "demo";

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      const mode = next ? "demo" : "live";
      const res = await setSystemMode(mode);
      setStatus((prev) => (prev ? { ...prev, ...res } : prev));
      toast.success(
        mode === "demo"
          ? "Demo Mode — replaying dataset traffic"
          : "Live Mode — waiting for real network traffic"
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to change mode");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cyber-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Backend Status</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {isDemo ? "Demo" : "Live"}
          </span>
          <Switch checked={!!isDemo} disabled={busy} onCheckedChange={toggle} />
        </div>
      </div>

      {!status ? (
        <p className="text-xs text-muted-foreground">Connecting to backend…</p>
      ) : (
        <div className="space-y-0.5">
          <Row icon={Activity} label="Backend" value={status.backend_connected ? "Connected" : "Down"} ok={status.backend_connected} />
          <Row icon={Database} label="Database" value={status.database_connected ? "Connected" : "Down"} ok={status.database_connected} />
          <Row icon={ShieldCheck} label="Detection engine" value={status.detection_engine_running ? "Running" : "Idle"} ok={status.detection_engine_running} />
          <Row icon={Video} label="Cameras online" value={`${status.cameras_online} / ${status.cameras_total}`} />
          <Row icon={Radio} label="Total packets" value={status.packets_total.toLocaleString()} />
          <Row icon={ShieldCheck} label="Active threats" value={status.threats_active} ok={status.threats_active === 0} />
        </div>
      )}

      {status?.mode === "live" && status.packets_total === 0 && (
        <p className="mt-3 text-xs text-muted-foreground italic">
          Waiting for network traffic…
        </p>
      )}
    </div>
  );
}
