import { Camera, Wifi, WifiOff, AlertTriangle, Shield, ShieldAlert, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDevices, type CCTVDevice } from "@/hooks/useRealtimeData";

const statusConfig = {
  online: { color: "text-success", bg: "bg-success/10", icon: Wifi },
  offline: { color: "text-muted-foreground", bg: "bg-muted", icon: WifiOff },
  warning: { color: "text-warning", bg: "bg-warning/10", icon: AlertTriangle },
};

const threatLevelConfig = {
  safe: { color: "text-success", icon: Shield },
  suspicious: { color: "text-warning", icon: ShieldAlert },
  at_risk: { color: "text-destructive", icon: ShieldX },
};

export function RealDeviceStatus() {
  const { devices, loading } = useDevices();

  const onlineCount = devices.filter(d => d.status === "online").length;
  const warningCount = devices.filter(d => d.status === "warning").length;

  return (
    <div className="cyber-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">CCTV Devices</h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-success">{onlineCount} ONLINE</span>
          {warningCount > 0 && (
            <span className="text-warning">{warningCount} WARNING</span>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading devices...
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No devices configured
          </div>
        ) : (
          devices.map((device) => {
            const status = statusConfig[device.status];
            const threatLevel = threatLevelConfig[device.threat_level];
            const StatusIcon = status.icon;
            const ThreatIcon = threatLevel.icon;

            return (
              <div
                key={device.id}
                className={cn(
                  "p-3 rounded-lg border border-border transition-all hover:border-primary/30",
                  status.bg
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={cn("w-4 h-4", status.color)} />
                    <span className="font-medium text-sm">{device.name}</span>
                  </div>
                  <ThreatIcon className={cn("w-4 h-4", threatLevel.color)} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-mono">{device.ip_address}</span>
                  </div>
                  <div className="text-right">
                    {device.manufacturer}
                  </div>
                  <div>
                    {device.device_type}
                  </div>
                  <div className="text-right">
                    {device.location}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
                  <span className="text-muted-foreground">
                    {device.total_packets.toLocaleString()} packets
                  </span>
                  {device.blocked_attacks > 0 && (
                    <span className="text-destructive font-mono">
                      {device.blocked_attacks} blocked
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
