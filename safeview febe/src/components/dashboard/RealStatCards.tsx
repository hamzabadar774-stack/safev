import { useEffect, useState } from "react";
import { Activity, Shield, ShieldAlert, Camera, TrendingUp, AlertTriangle } from "lucide-react";
import { getDashboardStats } from "@/services/safeviewApi";
import { cn } from "@/lib/utils";

interface DashboardStats {
  packets_analyzed: number;
  threats_detected: number;
  attacks_blocked: number;
  active_devices: number;
  block_rate: number;
  critical_threats: number;
}

export function RealStatCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (e) {
        console.error("Error fetching stats:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      title: "Packets Analyzed",
      value: stats?.packets_analyzed || 0,
      icon: Activity,
      color: "text-primary",
      format: (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString(),
    },
    {
      title: "Threats Detected",
      value: stats?.threats_detected || 0,
      icon: ShieldAlert,
      color: "text-warning",
      format: (v: number) => v.toString(),
    },
    {
      title: "Attacks Blocked",
      value: stats?.attacks_blocked || 0,
      icon: Shield,
      color: "text-success",
      format: (v: number) => v.toString(),
    },
    {
      title: "Active Devices",
      value: stats?.active_devices || 0,
      icon: Camera,
      color: "text-primary",
      format: (v: number) => v.toString(),
    },
    {
      title: "Block Rate",
      value: stats?.block_rate || 0,
      icon: TrendingUp,
      color: "text-success",
      format: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      title: "Critical Threats",
      value: stats?.critical_threats || 0,
      icon: AlertTriangle,
      color: "text-destructive",
      format: (v: number) => v.toString(),
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="cyber-card p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-8 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="cyber-card p-4 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{card.title}</span>
              <Icon className={cn("w-4 h-4", card.color)} />
            </div>
            <div className={cn("text-2xl font-bold font-mono", card.color)}>
              {card.format(card.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
