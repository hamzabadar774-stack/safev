import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity } from "lucide-react";
import { useTrafficStats } from "@/hooks/useRealtimeData";

export function RealTrafficChart() {
  const { stats, loading } = useTrafficStats(24);

  // Format data for chart
  const chartData = stats.map((stat) => ({
    time: new Date(stat.timestamp).toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      hour12: false 
    }),
    safe: stat.safe_packets,
    suspicious: stat.suspicious_packets,
    blocked: stat.blocked_packets,
  }));

  return (
    <div className="cyber-card p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Traffic Analysis (24h)</h3>
      </div>

      {loading ? (
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          Loading traffic data...
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          No traffic data available. Simulate traffic to see the chart.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSuspicious" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend 
              wrapperStyle={{ fontSize: "11px" }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey="safe"
              name="Safe"
              stroke="hsl(var(--success))"
              fillOpacity={1}
              fill="url(#colorSafe)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="suspicious"
              name="Suspicious"
              stroke="hsl(var(--warning))"
              fillOpacity={1}
              fill="url(#colorSuspicious)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="blocked"
              name="Blocked"
              stroke="hsl(var(--destructive))"
              fillOpacity={1}
              fill="url(#colorBlocked)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
