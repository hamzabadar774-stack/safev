import { useMemo, useState } from "react";
import {
  AlertTriangle, Shield, ShieldCheck, ShieldX, Search, Download,
  CheckCircle2, Eye, XCircle, ArrowUpCircle, FileText, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeThreats, type ThreatDetection } from "@/hooks/useRealtimeData";
import { performAlertAction, exportAlertsCSV, type AlertStatus } from "@/services/alertsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const threatTypeLabels: Record<string, string> = {
  ddos_attack: "DDoS Attack",
  port_scan: "Port Scan",
  brute_force: "Brute Force Login",
  unauthorized_access: "Unauthorized Access",
  stream_hijacking: "Stream Hijack",
  command_injection: "Command Injection",
  malware_payload: "Malware Payload",
  abnormal_traffic: "Suspicious Traffic Spike",
  rtsp_exploit: "RTSP Exploit",
  onvif_attack: "ONVIF Attack",
  device_offline: "Camera Offline",
  unknown_device: "Unknown Device",
};

const severityClass: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

const statusClass: Record<AlertStatus, string> = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  investigating: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  acknowledged: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  resolved: "bg-success/15 text-success border-success/30",
  false_positive: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<AlertStatus, string> = {
  new: "New",
  investigating: "Investigating",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
  false_positive: "False Positive",
};

function shortId(id: string) {
  return "ALT-" + id.slice(0, 8).toUpperCase();
}

export function AlertManagement() {
  const { threats, loading } = useRealtimeThreats(100);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");

  const devices = useMemo(
    () => Array.from(new Set(threats.map((t) => t.target_device).filter(Boolean) as string[])),
    [threats]
  );
  const types = useMemo(
    () => Array.from(new Set(threats.map((t) => t.threat_type))),
    [threats]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threats.filter((t) => {
      const status = (t.status || "new") as AlertStatus;
      if (severityFilter !== "all" && t.severity !== severityFilter) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (typeFilter !== "all" && t.threat_type !== typeFilter) return false;
      if (deviceFilter !== "all" && t.target_device !== deviceFilter) return false;
      if (!q) return true;
      return (
        t.source_ip?.toLowerCase().includes(q) ||
        (t.target_device || "").toLowerCase().includes(q) ||
        t.threat_type.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        shortId(t.id).toLowerCase().includes(q)
      );
    });
  }, [threats, search, severityFilter, statusFilter, typeFilter, deviceFilter]);

  const counts = useMemo(() => {
    const c = { new: 0, investigating: 0, acknowledged: 0, resolved: 0, false_positive: 0 };
    threats.forEach((t) => {
      const s = (t.status || "new") as AlertStatus;
      c[s] = (c[s] || 0) + 1;
    });
    return c;
  }, [threats]);

  async function act(t: ThreatDetection, action: Parameters<typeof performAlertAction>[1], label: string) {
    setBusyId(t.id);
    const res = await performAlertAction(t.id, action);
    if (res.success) toast.success(`${label}: ${shortId(t.id)}`);
    else toast.error(res.error || `Failed to ${label.toLowerCase()}`);
    setBusyId(null);
  }

  function handleExport() {
    const rows = filtered.map((t) => ({
      alert_id: shortId(t.id),
      timestamp: new Date(t.timestamp).toISOString(),
      device: t.target_device || "—",
      severity: t.severity,
      threat_type: threatTypeLabels[t.threat_type] || t.threat_type,
      source_ip: t.source_ip,
      status: statusLabels[(t.status || "new") as AlertStatus],
      confidence: Number(t.confidence).toFixed(2),
      blocked: t.is_blocked ? "yes" : "no",
      description: t.description || "",
    }));
    if (!rows.length) {
      toast.error("No alerts to export");
      return;
    }
    exportAlertsCSV(rows, `safeview-alerts-${Date.now()}.csv`);
    toast.success(`Exported ${rows.length} alert${rows.length === 1 ? "" : "s"}`);
  }

  return (
    <div className="cyber-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="text-lg font-semibold">Alert Management</h3>
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
              AI-Assisted Simulation Mode Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Triage and respond to incidents detected across your CCTV and network infrastructure.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Status counts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        {(Object.keys(statusLabels) as AlertStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            className={cn(
              "text-left rounded-md border p-3 transition-colors hover:bg-muted/50",
              statusFilter === s ? "border-primary bg-muted/30" : "border-border"
            )}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{statusLabels[s]}</div>
            <div className="text-xl font-semibold font-mono">{counts[s] || 0}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by alert ID, IP, device, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(statusLabels) as AlertStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Threat type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>{threatTypeLabels[t] || t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {devices.length > 0 && (
          <Select value={deviceFilter} onValueChange={setDeviceFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Device" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All devices</SelectItem>
              {devices.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Alerts table */}
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-xs uppercase tracking-wider">Alert ID</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Severity</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Threat Type</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Device</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Source IP</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Timestamp</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">Loading alerts...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-success" />
                  No alerts match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => {
                const status = (t.status || "new") as AlertStatus;
                const isClosed = status === "resolved" || status === "false_positive";
                return (
                  <TableRow key={t.id} className={cn(isClosed && "opacity-60")}>
                    <TableCell className="font-mono text-xs">{shortId(t.id)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("uppercase text-[10px] font-mono", severityClass[t.severity])}>
                        {t.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {threatTypeLabels[t.threat_type] || t.threat_type}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.target_device || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{t.source_ip}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] uppercase font-mono", statusClass[status])}>
                        {statusLabels[status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(t.timestamp).toLocaleString("en-US", { hour12: false })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" title="Investigate"
                          disabled={busyId === t.id || isClosed}
                          onClick={() => act(t, "investigate", "Investigating")}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Acknowledge"
                          disabled={busyId === t.id || isClosed}
                          onClick={() => act(t, "acknowledge", "Acknowledged")}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Escalate"
                          disabled={busyId === t.id || isClosed}
                          onClick={() => act(t, "escalate", "Escalated")}>
                          <ArrowUpCircle className="w-3.5 h-3.5 text-orange-400" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Resolve"
                          disabled={busyId === t.id || isClosed}
                          onClick={() => act(t, "resolve", "Resolved")}>
                          <ShieldCheck className="w-3.5 h-3.5 text-success" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Mark false positive / Dismiss"
                          disabled={busyId === t.id || isClosed}
                          onClick={() => act(t, "false_positive", "Marked false positive")}>
                          <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
        <Filter className="w-3 h-3" /> Showing {filtered.length} of {threats.length} alert{threats.length === 1 ? "" : "s"} ·
        Real-time updates enabled
      </p>
    </div>
  );
}