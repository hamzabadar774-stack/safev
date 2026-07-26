import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_threats",
  title: "List threats",
  description: "List detected network threats/anomalies, optionally filtered by severity or status.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    status: z.enum(["new", "investigating", "acknowledged", "escalated", "resolved", "false_positive", "blocked"]).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, severity, status }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let query = supabaseForUser(ctx)
      .from("threats")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(limit ?? 50);
    if (severity) query = query.eq("severity", severity);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { threats: data ?? [] },
    };
  },
});