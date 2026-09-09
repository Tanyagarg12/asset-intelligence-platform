import { PageShell } from "@/components/layout/PageShell";
import { Panel } from "@/components/ui/Panel";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { VehiclesTable } from "@/components/vehicles/VehiclesTable";
import { getVehiclesPage } from "@/lib/api/resources";

export default async function VehiclesPage() {
  const { data, error } = await getVehiclesPage();

  const subtitle = data
    ? `${data.rows.length} two-wheelers (2W)${
        data.summary ? ` · ${data.summary.healthy} healthy, ${data.summary.atRisk + data.summary.critical} at risk` : ""
      }`
    : "Live 2W EV fleet";

  return (
    <PageShell title="Vehicles (2W)" subtitle={subtitle}>
      {error || !data ? (
        <ApiErrorState title="Could not load vehicles" error={error ?? "Unknown error"} />
      ) : (
        <Panel>
          <VehiclesTable rows={data.rows} />
        </Panel>
      )}
    </PageShell>
  );
}
