import { Activity, CheckCircle2, Eye, ShieldCheck, XCircle, ArrowUpCircle, AlertTriangle, Ban, FileText, Download } from "lucide-react";
import { useAlertLogs } from "@/hooks/useRealtimeData";
import { Button } from "@/components/ui/button";
import { exportAlertsCSV } from "@/services/alertsApi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const actionMeta: Record<string, { label: string; icon: any; cls: string }> = {
  acknowledge: { label: "Alert acknowledged", icon: CheckCircle2, cls: "text-purple-400" },
  investigate: { label: "Investigation started", icon: Eye, cls: "text-amber-400" },
  resolve: { label: "Alert resolved", icon: ShieldCheck, cls: "text-success" },
  dismiss: { label: "Alert dismissed", icon: XCircle, cls: "text-muted-foreground" },
  escalate: { label: "Alert escalated", icon: ArrowUpCircle, cls: "text-orange-400" },
  false_positive: { label: "Marked false positive", icon: XCircle, cls: "text-muted-foreground" },
  block: { label: "Threat source blocked", icon: Ban, cls: "text-destructive" },
  note: { label: "Analyst note added", icon: FileText, cls: "text-blue-400" },
};

export function IncidentTimeline() {
  const { logs, loading } = useAlertLogs(50);

  function handleExport() {
    if (!logs.length) return toast.error("No log entries to export");
    exportAlertsCSV(
      logs.map((l) => ({
        log_id: l.id,
        threat_id: l.threat_id || "",
        action: l.action,
        actor: l.actor || "",
        notes: l.notes || "",
        timestamp: new Date(l.created_at).toISOString(),
      })),
      `safeview-incident-log-${Date.now()}.csv`
    );
    toast.success(`Exported ${logs.length} log entries`);
  }

  return (
    <div className="cyber-card p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Incident Timeline</h3>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {logs.length} EVENTS
        </span>
        <Button size="sm" variant="ghost" onClick={handleExport} title="Export logs">
          <Download className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading activity...</div>
        ) : logs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No analyst activity yet. Actions on alerts will appear here.
          </div>
        ) : (
          logs.map((log) => {
            const meta = actionMeta[log.action] || {
              label: log.action,
              icon: Activity,
              cls: "text-muted-foreground",
            };
            const Icon = meta.icon;
            return (
              <div key={log.id} className="flex gap-3 pb-3 border-b border-border/50 last:border-0">
                <div className={cn("mt-0.5", meta.cls)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{meta.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString("en-US", { hour12: false })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono">{log.actor || "system"}</span>
                    {log.threat_id && (
                      <>
                        <span>·</span>
                        <span className="font-mono">ALT-{log.threat_id.slice(0, 8).toUpperCase()}</span>
                      </>
                    )}
                  </div>
                  {log.notes && <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}