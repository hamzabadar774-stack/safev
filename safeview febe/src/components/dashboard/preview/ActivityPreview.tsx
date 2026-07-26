import { Link } from "react-router-dom";
import { Activity, ChevronRight, CheckCircle2, Eye, ShieldCheck, XCircle, ArrowUpCircle, Ban, FileText } from "lucide-react";
import { useAlertLogs } from "@/hooks/useRealtimeData";
import { cn } from "@/lib/utils";

const meta: Record<string, { label: string; icon: any; cls: string }> = {
  acknowledge: { label: "Acknowledged", icon: CheckCircle2, cls: "text-purple-400" },
  investigate: { label: "Investigating", icon: Eye, cls: "text-amber-400" },
  resolve: { label: "Resolved", icon: ShieldCheck, cls: "text-success" },
  dismiss: { label: "Dismissed", icon: XCircle, cls: "text-muted-foreground" },
  escalate: { label: "Escalated", icon: ArrowUpCircle, cls: "text-orange-400" },
  false_positive: { label: "False positive", icon: XCircle, cls: "text-muted-foreground" },
  block: { label: "Source blocked", icon: Ban, cls: "text-destructive" },
  note: { label: "Note added", icon: FileText, cls: "text-blue-400" },
};

export function ActivityPreview() {
  const { logs, loading } = useAlertLogs(8);

  return (
    <div className="cyber-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Recent Activity</h3>
        </div>
        <Link
          to="/incidents"
          className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
        >
          Timeline <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No analyst activity yet.
          </p>
        ) : (
          logs.slice(0, 6).map((l) => {
            const m = meta[l.action] || { label: l.action, icon: Activity, cls: "text-muted-foreground" };
            const Icon = m.icon;
            return (
              <div key={l.id} className="flex items-start gap-2 text-xs">
                <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", m.cls)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{m.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {new Date(l.created_at).toLocaleTimeString("en-US", { hour12: false })}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {l.actor || "system"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
