import { useEffect, useState } from "react";
import { Brain, Zap, Target, TrendingUp, Activity, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateMLStatus, generateThreat } from "@/services/mockData";
import type { MLModelStatus, ThreatDetection } from "@/types/network";

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

export function MLDetectionPanel() {
  const [mlStatus, setMLStatus] = useState<MLModelStatus>(generateMLStatus());
  const [recentDetections, setRecentDetections] = useState<ThreatDetection[]>(() =>
    Array.from({ length: 5 }, () => generateThreat())
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Simulate ML model making predictions
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsAnalyzing(true);
        setTimeout(() => {
          const newThreat = generateThreat();
          setRecentDetections(prev => [newThreat, ...prev.slice(0, 4)]);
          setIsAnalyzing(false);
          setMLStatus(prev => ({
            ...prev,
            total_predictions: prev.total_predictions + 1,
            threats_detected: prev.threats_detected + 1,
          }));
        }, 500);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cyber-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className={cn(
              "w-5 h-5 text-primary transition-all",
              isAnalyzing && "animate-pulse"
            )} />
            {isAnalyzing && (
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
            {(mlStatus.accuracy * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-xs">Predictions</span>
          </div>
          <div className="text-xl font-bold">
            {(mlStatus.total_predictions / 1000000).toFixed(2)}M
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

      {/* Real-time Detection Feed */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Recent AI Detections</span>
          {isAnalyzing && (
            <span className="text-xs text-primary animate-pulse ml-auto">Analyzing...</span>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
        {recentDetections.map((detection, index) => (
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
                  {(detection.confidence * 100).toFixed(0)}% conf
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
        ))}
      </div>

      {/* Performance Indicator */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>Threats Detected Today</span>
          </div>
          <span className="font-mono text-destructive font-bold">
            {mlStatus.threats_detected.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
