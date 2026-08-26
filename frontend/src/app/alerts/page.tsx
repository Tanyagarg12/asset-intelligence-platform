import { PageShell } from "@/components/layout/PageShell";
import { Panel } from "@/components/ui/Panel";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { AlertsTable } from "@/components/alerts/AlertsTable";
import { getOperationsAlertsPage } from "@/lib/api/resources";

export default async function AlertsPage() {
  const { data: alerts, error } = await getOperationsAlertsPage(200);

  if (error || !alerts) {
    return (
      <PageShell title="Alerts" subtitle="Alert feed across the fleet">
        <ApiErrorState title="Could not load alerts" error={error ?? "Unknown error"} />
      </PageShell>
    );
  }

  return (
    <PageShell title="Alerts" subtitle={`${alerts.length.toLocaleString()} recent alerts across the fleet`}>
      <Panel>
        <AlertsTable alerts={alerts} />
      </Panel>
    </PageShell>
  );
}
