import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InteractiveKpiCards } from "@/components/dashboard/InteractiveKpiCards";
import { MiniThreatGraph } from "@/components/dashboard/preview/MiniThreatGraph";
import { AlertsPreview } from "@/components/dashboard/preview/AlertsPreview";
import { DevicesPreview } from "@/components/dashboard/preview/DevicesPreview";
import { ActivityPreview } from "@/components/dashboard/preview/ActivityPreview";
import { SystemStatusPanel } from "@/components/dashboard/SystemStatusPanel";

const Index = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-semibold tracking-tight">Security Overview</h2>
            <Badge
              variant="outline"
              className="font-mono text-[10px] uppercase tracking-wider"
            >
              AI-Assisted Simulation Mode
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            High-level view of CCTV and network security posture.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
          <span>System operational</span>
          <span className="font-mono">·</span>
          <span className="font-mono">
            Updated {now.toLocaleTimeString("en-US", { hour12: false })}
          </span>
        </div>
      </div>

      {/* Interactive KPI cards */}
      <InteractiveKpiCards />

      {/* Threat graph + Latest alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-h-[260px]">
          <MiniThreatGraph />
        </div>
        <div className="min-h-[260px]">
          <AlertsPreview />
        </div>
      </div>

      {/* Devices + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DevicesPreview />
        <ActivityPreview />
      </div>

      {/* Backend status + Demo/Live mode toggle */}
      <SystemStatusPanel />
    </div>
  );
};

export default Index;
