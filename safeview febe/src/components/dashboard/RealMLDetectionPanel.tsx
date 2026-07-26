import { useState } from "react";
import { Brain, Zap, Target, TrendingUp, Activity, CheckCircle, Play, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMLStatus, useRealtimeThreats } from "@/hooks/useRealtimeData";
import { simulateTraffic } from "@/services/safeviewApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const severityStyles = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning border-warning/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critical: "bg-destructive/20 text-destructive border-destructive/30",
};

const threatTypeLabels: Record<string, string> = {
  ddos_attack: "DDoS Attack",
  port_scan: "Port Scan",
  brute_force: "Brute Force",
  unauthorized_access: "Unauthorized Access",
  stream_hijacking: "Stream Hijack",
  command_injection: "Cmd Injection",
  malware_payload: "Malware",
  abnormal_traffic: "Anomaly",
  rtsp_exploit: "RTSP Exploit",
  onvif_attack: "ONVIF Attack",
};

export function RealMLDetectionPanel() {
  const { status: mlStatus, loading: statusLoading } = useMLStatus();
  const { threats, loading: threatsLoading } = useRealtimeThreats(5);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = async (scenario?: "ddos" | "port_scan" | "brute_force") => {
    setIsSimulating(true);
    try {
      const result = await simulateTraffic(3, scenario);
      if (result.success && result.data) {
        const { packets_generated, threats_detected, blocked } = result.data;
        toast.success(
          `Generated ${packets_generated} packets: ${threats_detected} threats detected, ${blocked} blocked`,
          { duration: 4000 }
        );
      } else {
        toast.error(result.error || "Failed to simulate traffic");
      }
    } catch (e) {
      toast.error("Error simulating traffic");
    } finally {
      setIsSimulating(false);
    }
  };

  if (statusLoading || !mlStatus) {
    return (
      <div className="cyber-card p-6 h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading AI Engine...</div>
      </div>
    );
  }

  return (
    <div className="cyber-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className={cn(
              "w-5 h-5 text-primary transition-all",
              isSimulating && "animate-pulse"
            )} />
            {isSimulating && (
              <div className="absolute inset-0 w-5 h-5 bg-primary/30 rounded-full animate-ping" />
            )}
          </div>
          <h3 className="text-lg font-semibold">AI Detection Engine</h3>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono",
          mlStatus.is_active 
            ? "bg-success/10 text-success border border-success/30"
            : "bg-destructive/10 text-destructive border border-destructive/30"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            mlStatus.is_active ? "bg-success animate-pulse" : "bg-destructive"
          )} />
          {mlStatus.is_active ? "ACTIVE" : "OFFLINE"}
        </div>
      </div>

      {/* Model Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-secondary/30 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Target className="w-4 h-4" />
            <span className="text-xs">Accuracy</span>
          </div>
          <div className="text-xl font-bold text-primary">
            {(Number(mlStatus.accuracy) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-xs">Predictions</span>
          </div>
          <div className="text-xl font-bold">
            {mlStatus.total_predictions.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Model Info */}
      <div className="bg-secondary/20 rounded-lg p-3 border border-border mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Model</span>
          <span className="font-mono text-primary">{mlStatus.model_name}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Version</span>
          <span className="font-mono">{mlStatus.model_version}</span>
        </div>
      </div>

      {/* Simulate Traffic Buttons */}
      <div className="mb-4">
        <div className="text-xs text-muted-foreground mb-2">Simulate Traffic</div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSimulate()}
            disabled={isSimulating}
            className="text-xs"
          >
            <Play className="w-3 h-3 mr-1" />
            Normal
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSimulate("ddos")}
            disabled={isSimulating}
            className="text-xs text-orange-400 border-orange-400/50 hover:bg-orange-400/10"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            DDoS
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSimulate("brute_force")}
            disabled={isSimulating}
            className="text-xs text-red-400 border-red-400/50 hover:bg-red-400/10"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Brute Force
          </Button>
        </div>
      </div>

      {/* Real-time Detection Feed */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Recent AI Detections</span>
          {isSimulating && (
            <span className="text-xs text-primary animate-pulse ml-auto">Analyzing...</span>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
        {threatsLoading ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            Loading threats...
          </div>
        ) : threats.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            No threats detected yet. Simulate traffic to test the AI.
          </div>
        ) : (
          threats.map((detection, index) => (
            <div
              key={detection.id}
              className={cn(
                "p-2 rounded-lg border transition-all",
                severityStyles[detection.severity],
                index === 0 && "ring-1 ring-primary/50"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono uppercase">
                  {threatTypeLabels[detection.threat_type] || detection.threat_type}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono">
                    {(Number(detection.confidence) * 100).toFixed(0)}% conf
                  </span>
                  {detection.is_blocked && (
                    <CheckCircle className="w-3 h-3 text-success" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">{detection.source_ip}</span>
                <span>
                  {new Date(detection.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Performance Indicator */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>Total Threats Detected</span>
          </div>
          <span className="font-mono text-destructive font-bold">
            {mlStatus.threats_detected.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
