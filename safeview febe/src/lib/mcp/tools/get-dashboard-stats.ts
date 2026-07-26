import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_dashboard_stats",
  title: "Get SafeView SOC stats",
  description: "Returns a summary of the SafeView SOC: device counts by status and threat counts by severity/status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const [devices, threats] = await Promise.all([
      sb.from("cctv_devices").select("status"),
      sb.from("threats").select("severity,status"),
    ]);
    if (devices.error) return { content: [{ type: "text", text: devices.error.message }], isError: true };
    if (threats.error) return { content: [{ type: "text", text: threats.error.message }], isError: true };
    const bucket = (rows: any[], key: string) =>
      rows.reduce<Record<string, number>>((acc, r) => ((acc[r[key]] = (acc[r[key]] ?? 0) + 1), acc), {});
    const stats = {
      devices: { total: devices.data?.length ?? 0, by_status: bucket(devices.data ?? [], "status") },
      threats: {
        total: threats.data?.length ?? 0,
        by_severity: bucket(threats.data ?? [], "severity"),
        by_status: bucket(threats.data ?? [], "status"),
      },
    };
    return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }], structuredContent: stats };
  },
});