import { IncidentTimeline } from "@/components/dashboard/IncidentTimeline";
import { RealThreatAlerts } from "@/components/dashboard/RealThreatAlerts";

export default function IncidentsPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Incident Timeline</h2>
        <p className="text-sm text-muted-foreground">
          Chronological view of detected threats and analyst response actions.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IncidentTimeline />
        <RealThreatAlerts />
      </div>
    </div>
  );
}
