import { useEffect, useMemo, useState } from "react";
import { Activity, Shield, ShieldAlert, Camera, TrendingUp, AlertTriangle, Lightbulb, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDashboardStats } from "@/services/safeviewApi";
import { useRealtimeThreats, useDevices } from "@/hooks/useRealtimeData";

interface DashboardStats {
  packets_analyzed: number;
  threats_detected: number;
  attacks_blocked: number;
  active_devices: number;
  block_rate: number;
  critical_threats: number;
}

function fmt(v: number, kind: "count" | "pct" = "count") {
  if (kind === "pct") return `${v.toFixed(1)}%`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
}

export function InteractiveKpiCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [prev, setPrev] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { threats } = useRealtimeThreats(100);
  const { devices } = useDevices();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const s = await getDashboardStats();
        if (!mounted) return;
        setStats((curr) => {
          if (curr) setPrev(curr);
          return s;
        });
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 10_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const insights = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = {};
    threats.forEach((t) => {
      typeCounts[t.threat_type] = (typeCounts[t.threat_type] || 0) + 1;
      if (t.target_device) deviceCounts[t.target_device] = (deviceCounts[t.target_device] || 0) + 1;
    });
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
    const topDevice = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1])[0];
    const onlineDevices = devices.filter((d) => d.status === "online").length;
    const atRiskDevices = devices.filter((d) => d.threat_level === "at_risk").length;
    return {
      topType: topType ? topType[0].replace(/_/g, " ") : "—",
      topTypeCount: topType?.[1] || 0,
      topDevice: topDevice ? topDevice[0] : "—",
      topDeviceCount: topDevice?.[1] || 0,
      onlineDevices,
      atRiskDevices,
    };
  }, [threats, devices]);

  const trend = (curr?: number, prv?: number) => {
    if (curr === undefined || prv === undefined || prv === 0) return null;
    const diff = ((curr - prv) / prv) * 100;
    return diff;
  };

  const cards = [
    {
      title: "Packets Analyzed",
      value: fmt(stats?.packets_analyzed ?? 0),
      icon: Activity,
      color: "text-primary",
      back: {
        label: "Throughput",
        primary: `${fmt(stats?.packets_analyzed ?? 0)} total`,
        secondary: `Block rate ${fmt(stats?.block_rate ?? 0, "pct")}`,
        tip: "High packet volume with low block rate is healthy network behavior.",
        delta: trend(stats?.packets_analyzed, prev?.packets_analyzed),
      },
    },
    {
      title: "Threats Detected",
      value: fmt(stats?.threats_detected ?? 0),
      icon: ShieldAlert,
      color: "text-warning",
      back: {
        label: "Most Common Attack",
        primary: insights.topType.toUpperCase(),
        secondary: `${insights.topTypeCount} occurrences`,
        tip: "Review firewall rules to filter the dominant attack vector.",
        delta: trend(stats?.threats_detected, prev?.threats_detected),
      },
    },
    {
      title: "Attacks Blocked",
      value: fmt(stats?.attacks_blocked ?? 0),
      icon: Shield,
      color: "text-success",
      back: {
        label: "Defensive Action",
        primary: `${fmt(stats?.attacks_blocked ?? 0)} mitigated`,
        secondary: `${fmt(stats?.block_rate ?? 0, "pct")} block efficiency`,
        tip: "Consider auto-blocking sources with 3+ threats in 1 hour.",
        delta: trend(stats?.attacks_blocked, prev?.attacks_blocked),
      },
    },
    {
      title: "Active Devices",
      value: fmt(stats?.active_devices ?? 0),
      icon: Camera,
      color: "text-primary",
      back: {
        label: "Highest-Risk Device",
        primary: insights.topDevice,
        secondary: `${insights.topDeviceCount} alerts · ${insights.atRiskDevices} at-risk`,
        tip: "Isolate at-risk cameras on a dedicated VLAN.",
        delta: trend(stats?.active_devices, prev?.active_devices),
      },
    },
    {
      title: "Block Rate",
      value: fmt(stats?.block_rate ?? 0, "pct"),
      icon: TrendingUp,
      color: "text-success",
      back: {
        label: "Mitigation Health",
        primary: `${fmt(stats?.block_rate ?? 0, "pct")} efficiency`,
        secondary: `${fmt(stats?.attacks_blocked ?? 0)} of ${fmt(stats?.threats_detected ?? 0)} threats`,
        tip: "Aim for >85% block rate. Tune ML thresholds if below.",
        delta: trend(stats?.block_rate, prev?.block_rate),
      },
    },
    {
      title: "Critical Threats",
      value: fmt(stats?.critical_threats ?? 0),
      icon: AlertTriangle,
      color: "text-destructive",
      back: {
        label: "Recommendation",
        primary: stats?.critical_threats ? "Investigate now" : "All clear",
        secondary: `${stats?.critical_threats ?? 0} critical · ${insights.atRiskDevices} at-risk devices`,
        tip: "Escalate critical alerts and rotate device credentials.",
        delta: trend(stats?.critical_threats, prev?.critical_threats),
      },
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="cyber-card p-4 animate-pulse h-[112px]">
            <div className="h-3 bg-muted rounded w-3/4 mb-2" />
            <div className="h-7 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const delta = card.back.delta;
        const positive = delta !== null && delta !== undefined && delta >= 0;
        const DeltaIcon = positive ? ArrowUpRight : ArrowDownRight;
        return (
          <div key={card.title} className="kpi-flip h-[112px]" tabIndex={0} aria-label={card.title}>
            <div className="kpi-flip-inner">
              {/* Front */}
              <div className="kpi-face cyber-card p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {card.title}
                  </span>
                  <Icon className={cn("w-4 h-4", card.color)} />
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div className={cn("text-2xl font-bold font-mono leading-none", card.color)}>
                    {card.value}
                  </div>
                  {delta !== null && delta !== undefined && Math.abs(delta) >= 0.1 && (
                    <div
                      className={cn(
                        "flex items-center gap-0.5 text-[10px] font-mono",
                        positive ? "text-success" : "text-destructive"
                      )}
                    >
                      <DeltaIcon className="w-3 h-3" />
                      {Math.abs(delta).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>

              {/* Back */}
              <div className="kpi-face kpi-face-back cyber-card p-3 flex flex-col gap-1 bg-secondary/30">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Lightbulb className="w-3 h-3 text-warning" />
                  {card.back.label}
                </div>
                <div className="text-xs font-semibold truncate">{card.back.primary}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {card.back.secondary}
                </div>
                <p className="text-[10px] text-muted-foreground/90 leading-snug line-clamp-3 mt-auto">
                  {card.back.tip}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
