import { useMemo } from "react";
import { Activity } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTrafficStats } from "@/hooks/useRealtimeData";

export function MiniThreatGraph() {
  const { stats, loading } = useTrafficStats(24);

  const data = useMemo(
    () =>
      stats.map((s) => ({
        time: new Date(s.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", hour12: false }),
        threats: (s.suspicious_packets || 0) + (s.blocked_packets || 0),
      })),
    [stats]
  );

  return (
    <div className="cyber-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Threat Activity (24h)</h3>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          {data.reduce((a, b) => a + b.threats, 0)} events
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
          Loading…
        </div>
      ) : data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
          No traffic data yet.
        </div>
      ) : (
        <div className="flex-1 min-h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="miniThreat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="threats"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                fill="url(#miniThreat)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
