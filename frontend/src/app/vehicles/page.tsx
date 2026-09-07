import { PageShell } from "@/components/layout/PageShell";
import { Panel } from "@/components/ui/Panel";
import { DemoDataBanner } from "@/components/ui/DemoDataBanner";
import { VehiclesTable } from "@/components/vehicles/VehiclesTable";
import { getDummyVehicles } from "@/lib/dummy/vehicles";

export default function VehiclesPage() {
  const rows = getDummyVehicles();
  const online = rows.filter((r) => r.online).length;

  return (
    <PageShell title="Vehicles (2W)" subtitle={`${rows.length} two-wheelers (2W) · ${online} online — demo data`}>
      <div className="flex flex-col gap-3">
        <DemoDataBanner />
        <Panel>
          <VehiclesTable rows={rows} />
        </Panel>
      </div>
    </PageShell>
  );
}
