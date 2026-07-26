import { supabase } from "@/integrations/supabase/client";

export type AlertStatus = "new" | "investigating" | "acknowledged" | "resolved" | "false_positive";
export type AlertAction = "acknowledge" | "resolve" | "dismiss" | "escalate" | "investigate" | "false_positive" | "block" | "note";

const statusByAction: Record<AlertAction, AlertStatus | null> = {
  acknowledge: "acknowledged",
  investigate: "investigating",
  resolve: "resolved",
  dismiss: "resolved",
  escalate: "investigating",
  false_positive: "false_positive",
  block: null,
  note: null,
};

export async function performAlertAction(
  threatId: string,
  action: AlertAction,
  opts?: { actor?: string; notes?: string }
) {
  const newStatus = statusByAction[action];
  if (newStatus) {
    const { error } = await supabase
      .from("threats")
      .update({ status: newStatus })
      .eq("id", threatId);
    if (error) return { success: false, error: error.message };
  }
  const { error: logErr } = await supabase.from("alert_logs").insert({
    threat_id: threatId,
    action,
    actor: opts?.actor ?? "analyst",
    notes: opts?.notes ?? null,
  });
  if (logErr) return { success: false, error: logErr.message };
  return { success: true };
}

export function exportAlertsCSV(rows: Array<Record<string, any>>, filename = "safeview-alerts.csv") {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Convenience: fetch all alert_logs and export as CSV. */
export async function exportLogsCsv(filename = `safeview-audit-${new Date().toISOString().slice(0,10)}.csv`) {
  const { data, error } = await supabase
    .from("alert_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error || !data) return;
  exportAlertsCSV(data as any[], filename);
}