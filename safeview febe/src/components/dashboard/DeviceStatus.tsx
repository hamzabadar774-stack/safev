import { useEffect, useState } from "react";
import { Camera, Wifi, WifiOff, Activity, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockDevices } from "@/services/mockData";
import type { CCTVDevice } from "@/types/network";

const statusStyles = {
  online: {
    dot: "bg-success",
    text: "text-success",
    label: "ONLINE",
  },
  offline: {
    dot: "bg-destructive",
    text: "text-destructive",
    label: "OFFLINE",
  },
  warning: {
    dot: "bg-warning",
    text: "text-warning",
    label: "WARNING",
  },
  compromised: {
    dot: "bg-destructive",
    text: "text-destructive",
    label: "COMPROMISED",
  },
};

const threatLevelStyles = {
  safe: "text-success",
  suspicious: "text-warning",
  at_risk: "text-destructive",
};

export function DeviceStatus() {
  const [devices, setDevices] = useState<CCTVDevice[]>(mockDevices.slice(0, 6));

  useEffect(() => {
    // Simulate device status updates
    const interval = setInterval(() => {
      setDevices(prev => prev.map(device => {
        if (device.status === "offline") return device;
        const newPackets = device.total_packets + Math.floor(Math.random() * 100);
        const newBlocked = Math.random() > 0.95 
          ? device.blocked_attacks + 1 
          : device.blocked_attacks;
        return {
          ...device,
          total_packets: newPackets,
          blocked_attacks: newBlocked,
          last_seen: new Date().toISOString(),
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const onlineCount = devices.filter(d => d.status === "online").length;
  const warningCount = devices.filter(d => d.status === "warning").length;

  return (
    <div className="cyber-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">CCTV Devices</h3>
        </div>
        <div className="flex items-center gap-3 text-sm font-mono">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-success">{onlineCount}</span>
          </span>
          {warningCount > 0 && (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-warning">{warningCount}</span>
            </span>
          )}
          <span className="text-muted-foreground">/ {devices.length}</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {devices.map(device => (
          <div
            key={device.id}
            className={cn(
              "p-3 rounded-lg bg-secondary/30 border border-border/50",
              "hover:bg-secondary/50 transition-colors",
              device.status === "warning" && "border-warning/30",
              device.status === "compromised" && "border-destructive/30"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {device.status === "offline" ? (
                    <WifiOff className="w-5 h-5 text-destructive" />
                  ) : (
                    <Wifi className={cn("w-5 h-5", statusStyles[device.status].text)} />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{device.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <span>{device.ip_address}</span>
                    <span className="text-border">•</span>
                    <span>{device.device_type}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className={cn("pulse-dot", statusStyles[device.status].dot)} />
                  <span className={cn(
                    "text-xs font-mono",
                    statusStyles[device.status].text
                  )}>
                    {statusStyles[device.status].label}
                  </span>
                </div>
              </div>
            </div>
            
            {device.status !== "offline" && (
              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border/50">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
                    <Activity className="w-3 h-3" />
                    <span>Packets</span>
                  </div>
                  <span className="text-xs font-mono">
                    {(device.total_packets / 1000).toFixed(1)}K
                  </span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
                    <Shield className="w-3 h-3" />
                    <span>Blocked</span>
                  </div>
                  <span className={cn(
                    "text-xs font-mono",
                    device.blocked_attacks > 0 ? "text-success" : ""
                  )}>
                    {device.blocked_attacks}
                  </span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Threat</span>
                  </div>
                  <span className={cn(
                    "text-xs font-mono uppercase",
                    threatLevelStyles[device.threat_level]
                  )}>
                    {device.threat_level}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
