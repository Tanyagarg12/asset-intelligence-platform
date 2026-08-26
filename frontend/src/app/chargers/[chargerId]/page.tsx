import Link from "next/link";
import { ArrowLeft, Info, LayoutGrid, Plug, Sparkles, Warehouse } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Panel } from "@/components/ui/Panel";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { HealthBar, healthColor } from "@/components/ui/HealthBar";
import { RiskPill } from "@/components/ui/RiskPill";
import { StatusDot } from "@/components/ui/StatusDot";
import { TelemetryChart } from "@/components/battery/TelemetryChart";
import { CreateFieldActionButton } from "@/components/battery/CreateFieldActionButton";
import { getChargerDetail } from "@/lib/api/resources";
import { formatScoredAt } from "@/lib/formatScoredAt";

function label(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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

  const { charger, station, dockRisk, telemetry } = data;

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

        {/* There is no per-charger scoring endpoint on this platform — a
            charger's own health/risk comes from the dock it sits on, cross-
            referenced via GET /assets (see deriveDockAssetId in resources.ts).
            When that lookup doesn't resolve, this says so instead of hiding
            the gap or inventing a score. */}
        {dockRisk ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel>
              <div className="text-[12px] text-text-muted">Dock Health ({dockRisk.assetId})</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[15px] font-semibold tabular-nums" style={{ color: healthColor(dockRisk.healthScore) }}>
                  {dockRisk.healthScore}/100
                </span>
                <span className="text-[12px] text-text-muted">{label(dockRisk.healthClassification)}</span>
              </div>
              <div className="mt-4 text-[12px] text-text-muted">Anomaly</div>
              <div className="mt-1 text-[15px] font-semibold tabular-nums text-text-primary">
                {dockRisk.anomalyScore}
                <span className="ml-1 text-[12px] font-normal text-text-muted">{label(dockRisk.anomalySeverity)}</span>
              </div>
            </Panel>

            <Panel>
              <div className="text-[12px] text-text-muted">Predictive Risk</div>
              <div className="mt-1">
                <RiskPill percent={dockRisk.riskScore} category={dockRisk.riskCategory} showCategory />
              </div>
              <div className="mt-4 text-[12px] text-text-muted">Priority</div>
              <div className="mt-1 text-[15px] font-semibold text-text-primary">{dockRisk.priority}</div>
              <div className="mt-4 text-[12px] text-text-muted">Prediction Window</div>
              <div className="mt-1 text-[13px] font-medium text-text-primary">{dockRisk.predictionWindow}</div>
            </Panel>

            <Panel title="AI Insight" action={<Sparkles size={16} className="text-[var(--series-1)]" />}>
              <p className="text-[13px] font-medium leading-relaxed text-text-primary">{dockRisk.likelyIssue}</p>
              <p className="mt-3 text-[11.5px] leading-relaxed text-text-muted">
                Scored at the dock this charger sits on ({dockRisk.assetId}) — this platform has no separate
                per-charger scoring engine.
              </p>
              <dl className="mt-4 space-y-1.5 border-t border-[var(--border-hairline)] pt-3 text-[12px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-text-muted">Business impact</dt>
                  <dd className="font-medium text-text-secondary">{dockRisk.businessImpact ?? "Not available"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-muted">SLA</dt>
                  <dd className="text-right font-medium text-text-secondary">
                    Not available
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-muted">Scored at</dt>
                  <dd className="font-medium text-text-secondary">
                    {dockRisk.scoredAt ? formatScoredAt(dockRisk.scoredAt) : "Not available"}
                  </dd>
                </div>
              </dl>
            </Panel>
          </div>
        ) : (
          <Panel>
            <div className="flex items-start gap-2.5 text-[13px] text-text-secondary">
              <Info size={16} className="mt-0.5 flex-none text-[var(--series-1)]" />
              <span>
                <span className="font-semibold text-text-primary">No predictive risk data for this charger.</span>{" "}
                This platform scores docks, not chargers directly, and this charger&apos;s dock could not be
                cross-referenced in the dock register.
              </span>
            </div>
          </Panel>
        )}

        {dockRisk && (
          <Panel title="Recommended Field Action">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[13px] text-text-secondary">
                  <span className="font-semibold text-text-primary">{dockRisk.priority}</span> ·{" "}
                  {dockRisk.likelyIssue}
                </p>
                <p className="mt-2 text-[12px] text-text-muted">
                  This platform doesn&apos;t provide a per-dock/charger checklist — inspect this charger and
                  its dock for signs of the likely issue above.
                </p>
              </div>
              <CreateFieldActionButton batteryId={charger.chargerId} sla="Not available" priority={dockRisk.priority} />
            </div>
          </Panel>
        )}

        {telemetry.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Charger Temperature" titleNote="(daily avg, °C)">
              <TelemetryChart data={telemetry} dataKey="temperature" color="var(--status-critical)" unit="°C" gradientId="charger-temp" />
            </Panel>
            <Panel title="Charging Duration" titleNote="(daily avg, seconds)">
              <TelemetryChart data={telemetry} dataKey="chargingDuration" color="var(--series-1)" unit="s" gradientId="charger-duration" />
            </Panel>
          </div>
        )}

      </div>
    </PageShell>
  );
}
