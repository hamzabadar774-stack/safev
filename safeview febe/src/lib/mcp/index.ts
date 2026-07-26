import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDevicesTool from "./tools/list-devices";
import listThreatsTool from "./tools/list-threats";
import getDashboardStatsTool from "./tools/get-dashboard-stats";
import acknowledgeThreatTool from "./tools/acknowledge-threat";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "safeview-mcp",
  title: "SafeView SOC",
  version: "0.1.0",
  instructions:
    "Tools for the SafeView CCTV intrusion detection platform. Use `get_dashboard_stats` for a high-level overview, `list_devices` and `list_threats` to inspect the SOC, and `acknowledge_threat` to triage a specific threat.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getDashboardStatsTool, listDevicesTool, listThreatsTool, acknowledgeThreatTool],
});