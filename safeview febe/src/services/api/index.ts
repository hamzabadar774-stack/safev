// Central API surface. Grouping HTTP/edge-function calls behind a single
// barrel lets us swap the transport (REST, edge function, websocket)
// without touching the call sites in pages/components.
export * from "@/services/safeviewApi";
export { safeViewAPI, SafeViewAPI } from "@/services/api";