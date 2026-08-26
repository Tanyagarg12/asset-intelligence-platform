import Link from "next/link";
import { ArrowLeft, LayoutGrid, Plug, Warehouse } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Panel } from "@/components/ui/Panel";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { HealthBar } from "@/components/ui/HealthBar";
import { StatusDot } from "@/components/ui/StatusDot";
import { getChargerDetail } from "@/lib/api/resources";

/** The service sends `last_seen: null` for chargers that have never reported;
 * without this guard `new Date(null)` renders as 1 Jan 1970. */
function formatLastSeen(value: string | null): string {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() === 0) return "Never";
  return parsed.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function ChargerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ chargerId: string }>;
  // `charger_id` repeats across stations (CHG01..CHG15 at every station), so
  // the station id disambiguates which charger this page means.
  searchParams: Promise<{ station?: string }>;
}) {
  const { chargerId } = await params;
  const { station: stationId } = await searchParams;
  const { data, error } = await getChargerDetail(chargerId, stationId);

  if (error || !data) {
    return (
      <PageShell title={chargerId} subtitle="Charger detail">
        <ApiErrorState title={`Could not load ${chargerId}${stationId ? ` at ${stationId}` : ""}`} error={error ?? "Unknown error"} />
      </PageShell>
    );
  }

  const { charger, station, siblings } = data;

  return (
    <PageShell title={`${charger.stationId} · ${charger.chargerId}`} subtitle={`Dock ${charger.dockId}`}>
      <div className="flex flex-col gap-4">
        <Link
          href="/chargers"
          className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--series-1)] hover:underline"
        >
          <ArrowLeft size={14} />
          All chargers
        </Link>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Panel>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
                style={{ backgroundColor: "color-mix(in srgb, var(--series-1) 12%, transparent)" }}
              >
                <Plug size={19} style={{ color: "var(--series-1)" }} />
              </span>
              <div>
                <div className="text-[12px] text-text-muted">Status</div>
                <div className="mt-0.5">
                  <StatusDot status={charger.online ? "ONLINE" : "OFFLINE"} />
                </div>
              </div>
            </div>
            <div className="mt-4 text-[12px] text-text-muted">Faulty</div>
            <div className="mt-1 text-[15px] font-semibold" style={{ color: charger.faulty ? "var(--status-critical)" : "var(--text-primary)" }}>
              {charger.faulty ? "Yes — fault reported" : "No"}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
                style={{ backgroundColor: "color-mix(in srgb, var(--series-7) 12%, transparent)" }}
              >
                <LayoutGrid size={19} style={{ color: "var(--series-7)" }} />
              </span>
              <div>
                <div className="text-[12px] text-text-muted">Dock</div>
                <div className="mt-0.5 text-[15px] font-semibold text-text-primary">{charger.dockId}</div>
              </div>
            </div>
            <div className="mt-4 text-[12px] text-text-muted">Last Seen</div>
            <div className="mt-1 text-[13px] font-medium tabular-nums text-text-primary">
              {formatLastSeen(charger.lastSeen)}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
                style={{ backgroundColor: "color-mix(in srgb, var(--status-good) 12%, transparent)" }}
              >
                <Warehouse size={19} style={{ color: "var(--status-good)" }} />
              </span>
              <div>
                <div className="text-[12px] text-text-muted">Station</div>
                <Link
                  href={`/stations/${charger.stationId}`}
                  className="mt-0.5 block text-[15px] font-semibold text-[var(--series-1)] hover:underline"
                >
                  {charger.stationId}
                </Link>
              </div>
            </div>
            {station && (
              <>
                <div className="mt-4 text-[12px] text-text-muted">Station Avg Dock Health</div>
                <div className="mt-1">
                  <HealthBar score={station.avgHealthScore} />
                </div>
              </>
            )}
          </Panel>
        </div>

        {station && (
          <Panel title="Parent Station" action={
            <Link href={`/stations/${station.stationId}`} className="text-[12px] font-medium text-[var(--series-1)] hover:underline">
              Open station →
            </Link>
          }>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-[12px] text-text-muted">Docks</div>
                <div className="mt-1 text-[15px] font-semibold text-text-primary">{station.dockCount}</div>
              </div>
              <div>
                <div className="text-[12px] text-text-muted">Chargers Online</div>
                <div className="mt-1 text-[15px] font-semibold text-text-primary">{station.chargersOnline}</div>
              </div>
              <div>
                <div className="text-[12px] text-text-muted">High Risk Docks</div>
                <div className="mt-1 text-[15px] font-semibold" style={{ color: station.highRiskDocks > 0 ? "var(--status-critical)" : "var(--text-primary)" }}>
                  {station.highRiskDocks}
                </div>
              </div>
              <div>
                <div className="text-[12px] text-text-muted">Station Status</div>
                <div className="mt-1">
                  <StatusDot status={station.online ? "ONLINE" : "OFFLINE"} />
                </div>
              </div>
            </div>
          </Panel>
        )}

        <Panel title="Other Chargers at This Station" titleNote={`(${siblings.length})`}>
          {siblings.length === 0 ? (
            <p className="text-[13px] text-text-muted">No other chargers reported at this station.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-text-muted">
                    <th className="pb-2 pr-3 font-medium">Charger</th>
                    <th className="pb-2 pr-3 font-medium">Dock</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 font-medium">Faulty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)]">
                  {siblings.map((c) => (
                    <tr key={c.chargerId} className="hover:bg-[var(--surface-2)]">
                      <td className="py-2.5 pr-3 text-[13px]">
                        <Link
                          href={`/chargers/${c.chargerId}?station=${c.stationId}`}
                          className="font-medium text-[var(--series-1)] hover:underline"
                        >
                          {c.chargerId}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-[13px] text-text-secondary">{c.dockId}</td>
                      <td className="py-2.5 pr-3">
                        <StatusDot status={c.online ? "ONLINE" : "OFFLINE"} />
                      </td>
                      <td className="py-2.5 text-[13px]">
                        {c.faulty ? (
                          <span className="font-medium text-[var(--status-critical)]">Yes</span>
                        ) : (
                          <span className="text-text-muted">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
