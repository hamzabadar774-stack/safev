import { CCTVLiveFeed } from "@/components/dashboard/CCTVLiveFeed";
import { RealDeviceStatus } from "@/components/dashboard/RealDeviceStatus";
import { ControlPanel } from "@/components/dashboard/ControlPanel";

export default function DevicesPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">CCTV Device Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage registered cameras, monitor live feeds and run interactive controls.
        </p>
      </div>

      <CCTVLiveFeed />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RealDeviceStatus />
        <ControlPanel />
      </div>
    </div>
  );
}
