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
  name: "acknowledge_threat",
  title: "Acknowledge threat",
  description: "Mark a SafeView threat as acknowledged and append an alert log entry.",
  inputSchema: {
    threat_id: z.string().uuid().describe("Threat UUID to acknowledge."),
    notes: z.string().optional().describe("Optional analyst notes."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ threat_id, notes }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("threats")
      .update({ status: "acknowledged" })
      .eq("id", threat_id)
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    await sb.from("alert_logs").insert({
      threat_id,
      action: "acknowledged",
      actor: ctx.getUserEmail() ?? ctx.getUserId(),
      notes: notes ?? null,
    });
    return {
      content: [{ type: "text", text: `Threat ${threat_id} acknowledged.` }],
      structuredContent: { threat: data },
    };
  },
});