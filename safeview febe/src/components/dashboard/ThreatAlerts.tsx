import { useEffect, useState } from "react";
import { AlertTriangle, Shield, Wifi, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  message: string;
  source: string;
  timestamp: Date;
  blocked: boolean;
}

const alertTypes = [
  { type: "critical" as const, message: "Potential DDoS attack detected", source: "192.168.1." },
  { type: "critical" as const, message: "Suspicious port scanning activity", source: "10.0.0." },
  { type: "warning" as const, message: "Unusual traffic pattern detected", source: "172.16.0." },
  { type: "warning" as const, message: "Multiple failed authentication attempts", source: "192.168.2." },
  { type: "info" as const, message: "New device connected to network", source: "192.168.1." },
  { type: "critical" as const, message: "Malicious payload signature detected", source: "10.0.1." },
  { type: "warning" as const, message: "Bandwidth threshold exceeded", source: "172.16.1." },
];

const generateAlert = (): Alert => {
  const template = alertTypes[Math.floor(Math.random() * alertTypes.length)];
  return {
    id: Math.random().toString(36).substr(2, 9),
    type: template.type,
    message: template.message,
    source: template.source + Math.floor(Math.random() * 255),
    timestamp: new Date(),
    blocked: template.type === "critical" ? Math.random() > 0.3 : false,
  };
};

const typeStyles = {
  critical: {
    bg: "bg-destructive/10 border-destructive/30",
    icon: "text-destructive",
    badge: "bg-destructive text-destructive-foreground",
  },
  warning: {
    bg: "bg-warning/10 border-warning/30",
    icon: "text-warning",
    badge: "bg-warning text-warning-foreground",
  },
  info: {
    bg: "bg-primary/10 border-primary/30",
    icon: "text-primary",
    badge: "bg-primary text-primary-foreground",
  },
};

export function ThreatAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>(() => 
    Array.from({ length: 5 }, generateAlert)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setAlerts(prev => [generateAlert(), ...prev.slice(0, 9)]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cyber-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h3 className="text-lg font-semibold">Threat Alerts</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="pulse-dot bg-destructive" />
          <span className="text-sm text-muted-foreground font-mono">LIVE</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {alerts.map((alert, index) => (
          <div
            key={alert.id}
            className={cn(
              "p-3 rounded-lg border animate-slide-in",
              typeStyles[alert.type].bg,
              index === 0 && "ring-1 ring-primary/50"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5", typeStyles[alert.type].icon)}>
                {alert.type === "critical" ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : alert.type === "warning" ? (
                  <Shield className="w-4 h-4" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded font-mono uppercase",
                    typeStyles[alert.type].badge
                  )}>
                    {alert.type}
                  </span>
                  {alert.blocked && (
                    <span className="flex items-center gap-1 text-xs text-success font-mono">
                      <Ban className="w-3 h-3" />
                      BLOCKED
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{alert.message}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
                  <span>SRC: {alert.source}</span>
                  <span>
                    {alert.timestamp.toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
