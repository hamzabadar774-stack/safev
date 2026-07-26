import { useState } from "react";
import { AlertTriangle, Shield, ShieldCheck, ShieldX, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeThreats, type ThreatDetection } from "@/hooks/useRealtimeData";
import { blockThreat } from "@/services/safeviewApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const severityConfig = {
  low: { 
    bg: "bg-muted", 
    border: "border-muted-foreground/20",
    icon: Shield,
    iconColor: "text-muted-foreground"
  },
  medium: { 
    bg: "bg-warning/10", 
    border: "border-warning/30",
    icon: Shield,
    iconColor: "text-warning"
  },
  high: { 
    bg: "bg-orange-500/10", 
    border: "border-orange-500/30",
    icon: ShieldX,
    iconColor: "text-orange-400"
  },
  critical: { 
    bg: "bg-destructive/10", 
    border: "border-destructive/30",
    icon: AlertTriangle,
    iconColor: "text-destructive"
  },
};

const threatTypeLabels: Record<string, string> = {
  ddos_attack: "DDoS Attack",
  port_scan: "Port Scan",
  brute_force: "Brute Force",
  unauthorized_access: "Unauthorized Access",
  stream_hijacking: "Stream Hijack",
  command_injection: "Command Injection",
  malware_payload: "Malware Payload",
  abnormal_traffic: "Abnormal Traffic",
  rtsp_exploit: "RTSP Exploit",
  onvif_attack: "ONVIF Attack",
};

export function RealThreatAlerts() {
  const { threats, loading } = useRealtimeThreats(10);
  const [blockingId, setBlockingId] = useState<string | null>(null);

  const handleBlock = async (threat: ThreatDetection) => {
    if (threat.is_blocked) return;
    
    setBlockingId(threat.id);
    try {
      const result = await blockThreat(threat.id);
      if (result.success) {
        toast.success(`Blocked threat from ${threat.source_ip}`);
      } else {
        toast.error(result.error || "Failed to block threat");
      }
    } catch (e) {
      toast.error("Error blocking threat");
    } finally {
      setBlockingId(null);
    }
  };

  return (
    <div className="cyber-card p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h3 className="text-lg font-semibold">Threat Alerts</h3>
        <div className="ml-auto">
          <span className="text-xs text-muted-foreground font-mono">
            {threats.filter(t => !t.is_blocked).length} ACTIVE
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading threats...
          </div>
        ) : threats.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <ShieldCheck className="w-12 h-12 mx-auto mb-2 text-success" />
            <p>No threats detected</p>
            <p className="text-xs mt-1">System is secure</p>
          </div>
        ) : (
          threats.map((threat) => {
            const config = severityConfig[threat.severity];
            const Icon = config.icon;
            
            return (
              <div
                key={threat.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  config.bg,
                  config.border,
                  threat.is_blocked && "opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", config.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm">
                        {threatTypeLabels[threat.threat_type] || threat.threat_type}
                      </span>
                      <span className={cn(
                        "text-xs font-mono uppercase px-2 py-0.5 rounded",
                        threat.severity === "critical" && "bg-destructive text-destructive-foreground",
                        threat.severity === "high" && "bg-orange-500 text-white",
                        threat.severity === "medium" && "bg-warning text-warning-foreground",
                        threat.severity === "low" && "bg-muted text-muted-foreground"
                      )}>
                        {threat.severity}
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {threat.description || "Suspicious activity detected"}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="font-mono">{threat.source_ip}</span>
                        {threat.target_device && (
                          <span>→ {threat.target_device}</span>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(threat.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Confidence: {(Number(threat.confidence) * 100).toFixed(0)}%
                        </span>
                      </div>
                      {threat.is_blocked ? (
                        <div className="flex items-center gap-1 text-success text-xs">
                          <ShieldCheck className="w-3 h-3" />
                          Blocked
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-6 text-xs"
                          onClick={() => handleBlock(threat)}
                          disabled={blockingId === threat.id}
                        >
                          <Ban className="w-3 h-3 mr-1" />
                          {blockingId === threat.id ? "Blocking..." : "Block"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
