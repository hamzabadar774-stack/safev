import { RealTrafficChart } from "@/components/dashboard/RealTrafficChart";
import { RealMLDetectionPanel } from "@/components/dashboard/RealMLDetectionPanel";
import { RealPacketMonitor } from "@/components/dashboard/RealPacketMonitor";
import { RealStatCards } from "@/components/dashboard/RealStatCards";

export default function ReportsPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Reports &amp; Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Aggregated traffic analytics, AI engine performance and packet-level inspection.
        </p>
      </div>

      <RealStatCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RealTrafficChart />
        </div>
        <div>
          <RealMLDetectionPanel />
        </div>
      </div>

      <RealPacketMonitor />
    </div>
  );
}
