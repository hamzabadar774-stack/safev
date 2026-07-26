import { AlertManagement } from "@/components/dashboard/AlertManagement";

export default function AlertsPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Alert Management</h2>
        <p className="text-sm text-muted-foreground">
          Triage, investigate and resolve incidents detected across your infrastructure.
        </p>
      </div>
      <AlertManagement />
    </div>
  );
}
