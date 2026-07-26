import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight, ShieldCheck } from "lucide-react";
import { useRealtimeThreats } from "@/hooks/useRealtimeData";
import { cn } from "@/lib/utils";

const severityClass: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive",
  high: "bg-orange-500/15 text-orange-400",
  medium: "bg-warning/15 text-warning",
  low: "bg-muted text-muted-foreground",
};

export function AlertsPreview() {
  const { threats, loading } = useRealtimeThreats(5);

  return (
    <div className="cyber-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <h3 className="text-sm font-semibold">Latest Alerts</h3>
        </div>
        <Link
          to="/alerts"
          className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : threats.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">
            <ShieldCheck className="w-6 h-6 text-success mx-auto mb-1" />
            No alerts. System is secure.
          </div>
        ) : (
          threats.slice(0, 5).map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 text-xs py-1.5 border-b border-border/50 last:border-0"
            >
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] uppercase font-mono shrink-0",
                  severityClass[t.severity]
                )}
              >
                {t.severity}
              </span>
              <span className="font-medium truncate flex-1">
                {t.threat_type.replace(/_/g, " ")}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {t.source_ip}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
