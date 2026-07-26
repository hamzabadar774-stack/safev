import { Link } from "react-router-dom";
import { Camera, ChevronRight, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { useDevices } from "@/hooks/useRealtimeData";
import { cn } from "@/lib/utils";

export function DevicesPreview() {
  const { devices, loading } = useDevices();
  const online = devices.filter((d) => d.status === "online").length;
  const offline = devices.filter((d) => d.status === "offline").length;
  const warning = devices.filter((d) => d.status === "warning").length;

  return (
    <div className="cyber-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Devices</h3>
        </div>
        <Link
          to="/devices"
          className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
        >
          Manage <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-md border border-border p-2 text-center">
          <Wifi className="w-3.5 h-3.5 text-success mx-auto mb-0.5" />
          <div className="text-base font-mono font-semibold">{online}</div>
          <div className="text-[9px] text-muted-foreground uppercase">Online</div>
        </div>
        <div className="rounded-md border border-border p-2 text-center">
          <AlertTriangle className="w-3.5 h-3.5 text-warning mx-auto mb-0.5" />
          <div className="text-base font-mono font-semibold">{warning}</div>
          <div className="text-[9px] text-muted-foreground uppercase">Warning</div>
        </div>
        <div className="rounded-md border border-border p-2 text-center">
          <WifiOff className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
          <div className="text-base font-mono font-semibold">{offline}</div>
          <div className="text-[9px] text-muted-foreground uppercase">Offline</div>
        </div>
      </div>

      <div className="flex-1 space-y-1.5 overflow-hidden">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          devices.slice(0, 4).map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    d.status === "online" && "bg-success",
                    d.status === "warning" && "bg-warning",
                    d.status === "offline" && "bg-muted-foreground"
                  )}
                />
                <span className="truncate font-medium">{d.name}</span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{d.ip_address}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
