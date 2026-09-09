import Link from "next/link";
import { ArrowLeft, BatteryCharging, Gauge, MapPin, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Panel } from "@/components/ui/Panel";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { StatusDot } from "@/components/ui/StatusDot";
import { HealthBar, healthColor } from "@/components/ui/HealthBar";
import { RiskPill } from "@/components/ui/RiskPill";
import { TelemetryChart } from "@/components/battery/TelemetryChart";
import { CreateFieldActionButton } from "@/components/battery/CreateFieldActionButton";
import { getVehicleDetail } from "@/lib/api/resources";
import { formatScoredAt } from "@/lib/formatScoredAt";

function label(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const { data, error } = await getVehicleDetail(vehicleId);

  if (error || !data) {
    return (
      <PageShell title={vehicleId} subtitle="Vehicle detail">
        <ApiErrorState title={`Could not load ${vehicleId}`} error={error ?? "Unknown error"} />
      </PageShell>
    );
  }

  const { vehicle, linkage, telemetry } = data;
  const scoredLabel = vehicle.scoredAt ? formatScoredAt(vehicle.scoredAt) : "Not available";
  const t = vehicle.latestTelemetry;

  return (
    <PageShell title={vehicle.vehicleId} subtitle={`${vehicle.model} · ${vehicle.vehicleType} EV`}>
      <div className="flex flex-col gap-4">
        <Link
          href="/vehicles"
          className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--series-1)] hover:underline"
        >
          <ArrowLeft size={14} />
          All vehicles
        </Link>

        {/* Vehicle overview — the vehicle's own facts first, AI scoring below,
            mirroring the station page's layout. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Panel>
            <div className="text-[12px] text-text-muted">Status</div>
            <div className="mt-1">
              <StatusDot status={vehicle.online ? "ONLINE" : "OFFLINE"} />
            </div>
            <div className="mt-4 text-[12px] text-text-muted">Operational Status</div>
            <div className="mt-1 text-[13px] font-medium text-text-primary">
              {vehicle.operationalStatus ? label(vehicle.operationalStatus) : "Not available"}
            </div>
          </Panel>
          <Panel>
            <div className="text-[12px] text-text-muted">Model</div>
            <div className="mt-1 text-[13px] font-medium text-text-primary">
              {vehicle.model}
              <span className="ml-1.5 rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-text-muted ring-1 ring-[var(--border-hairline)]">
                {vehicle.vehicleType}
              </span>
            </div>
            <div className="mt-4 text-[12px] text-text-muted">Manufacturer</div>
            <div className="mt-1 text-[13px] font-medium text-text-primary">{vehicle.manufacturer ?? "—"}</div>
          </Panel>
          <Panel>
            <div className="text-[12px] text-text-muted">Registration</div>
            <div className="mt-1 text-[13px] font-medium tabular-nums text-text-primary">
              {vehicle.registration ?? "—"}
            </div>
            <div className="mt-4 text-[12px] text-text-muted">Home Station</div>
            {vehicle.stationId ? (
              <Link
                href={`/stations/${vehicle.stationId}`}
                className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-[var(--series-1)] hover:underline"
              >
                <MapPin size={13} className="flex-none text-text-muted" />
                {vehicle.stationId}
              </Link>
            ) : (
              <div className="mt-1 text-[13px] text-text-muted">Not available</div>
            )}
          </Panel>
          <Panel>
            <div className="text-[12px] text-text-muted">Average Health</div>
            <div className="mt-1">
              {vehicle.healthScore !== null ? (
                <HealthBar score={vehicle.healthScore} />
              ) : (
                <span className="text-[13px] text-text-muted">Not available</span>
              )}
            </div>
            <div className="mt-4 text-[12px] text-text-muted">Last Scored</div>
            <div className="mt-1 text-[13px] font-medium text-text-primary">{scoredLabel}</div>
          </Panel>
        </div>

        {/* Latest single telemetry reading, from GET /vehicles/{id} — separate
            from the daily trend charts further down. */}
        {t && (
          <Panel title="Latest Telemetry" titleNote={t.timestamp ? `(${formatScoredAt(t.timestamp)})` : undefined}>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">
              <div>
                <div className="flex items-center gap-1.5 text-[12px] text-text-muted">
                  <BatteryCharging size={13} className="flex-none" />
                  Battery SoC
                </div>
                <div className="mt-1 text-[15px] font-semibold tabular-nums text-text-primary">
                  {t.batterySoc !== null ? `${Math.round(t.batterySoc)}%` : "—"}
                </div>
              </div>
              <div>
                <div className="text-[12px] text-text-muted">Battery Temp</div>
                <div className="mt-1 text-[15px] font-semibold tabular-nums text-text-primary">
                  {t.batteryTemperature !== null ? `${t.batteryTemperature.toFixed(1)}°C` : "—"}
                </div>
              </div>
              <div>
                <div className="text-[12px] text-text-muted">Motor Temp</div>
                <div className="mt-1 text-[15px] font-semibold tabular-nums text-text-primary">
                  {t.motorTemperature !== null ? `${t.motorTemperature.toFixed(1)}°C` : "—"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[12px] text-text-muted">
                  <Gauge size={13} className="flex-none" />
                  Speed
                </div>
                <div className="mt-1 text-[15px] font-semibold tabular-nums text-text-primary">
                  {t.vehicleSpeed !== null ? `${t.vehicleSpeed.toFixed(0)} km/h` : "—"}
                </div>
              </div>
              <div>
                <div className="text-[12px] text-text-muted">Odometer</div>
                <div className="mt-1 text-[15px] font-semibold tabular-nums text-text-primary">
                  {t.odometerKm !== null ? `${Math.round(t.odometerKm).toLocaleString("en-IN")} km` : "—"}
                </div>
              </div>
              <div>
                <div className="text-[12px] text-text-muted">Range Estimate</div>
                <div className="mt-1 text-[15px] font-semibold tabular-nums text-text-primary">
                  {t.rangeEstimateKm !== null ? `${Math.round(t.rangeEstimateKm)} km` : "—"}
                </div>
              </div>
            </div>
          </Panel>
        )}

        <Panel>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">
            <div>
              <div className="text-[12px] text-text-muted">Condition</div>
              <div
                className="mt-1 text-[15px] font-semibold"
                style={{ color: vehicle.healthScore !== null ? healthColor(vehicle.healthScore) : undefined }}
              >
                {vehicle.healthClassification ? label(vehicle.healthClassification) : "—"}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-text-muted">Health Score</div>
              <div
                className="mt-1 text-[15px] font-semibold tabular-nums"
                style={{ color: vehicle.healthScore !== null ? healthColor(vehicle.healthScore) : undefined }}
              >
                {vehicle.healthScore ?? "—"}
                <span className="text-[12px] font-normal text-text-muted">/100</span>
              </div>
            </div>
            <div>
              <div className="text-[12px] text-text-muted">Anomaly</div>
              <div className="mt-1 text-[15px] font-semibold tabular-nums text-text-primary">
                {vehicle.anomalyScore ?? "—"}
                <span className="ml-1 text-[12px] font-normal text-text-muted">
                  {vehicle.anomalySeverity ? label(vehicle.anomalySeverity) : ""}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[12px] text-text-muted">Predictive Risk</div>
              <div className="mt-1">
                {vehicle.riskScore !== null && vehicle.riskCategoryRaw ? (
                  <RiskPill percent={vehicle.riskScore} category={vehicle.riskCategoryRaw} showCategory />
                ) : (
                  <span className="text-[13px] text-text-muted">—</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-text-muted">Priority</div>
              <div className="mt-1 text-[15px] font-semibold tabular-nums text-text-primary">
                {vehicle.priority ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-text-muted">Prediction Window</div>
              <div className="mt-1 text-[13px] font-medium text-text-primary">
                {vehicle.predictionWindow ?? "Not available"}
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Health Dimensions">
            {vehicle.dimensions.length === 0 ? (
              <p className="text-[13px] text-text-muted">No dimension scores reported.</p>
            ) : (
              <ul className="space-y-3">
                {vehicle.dimensions.map((dimension) => (
                  <li key={dimension.key} className="flex items-center gap-3">
                    <span className="w-36 flex-none text-[13px] text-text-secondary">{dimension.label}</span>
                    <div className="flex-1">
                      <HealthBar score={dimension.score} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Detected Signals">
            {vehicle.detectedSignals.length === 0 ? (
              <p className="text-[13px] text-text-muted">No anomaly signals detected against this vehicle&apos;s baseline.</p>
            ) : (
              <ul className="space-y-2">
                {vehicle.detectedSignals.map((signal) => (
                  <li key={signal} className="flex items-start gap-2 text-[13px] text-text-secondary">
                    <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[var(--status-warning)]" />
                    {signal}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="AI Insight" action={<Sparkles size={16} className="text-[var(--series-1)]" />}>
            <p className="text-[13px] font-medium leading-relaxed text-text-primary">
              {vehicle.likelyIssue ?? "No issue reported"}
            </p>
            {vehicle.riskNote && (
              <p className="mt-3 text-[12.5px] leading-relaxed text-text-secondary">{vehicle.riskNote}</p>
            )}
            <dl className="mt-4 space-y-1.5 border-t border-[var(--border-hairline)] pt-3 text-[12px]">
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Business impact</dt>
                <dd className="font-medium text-text-secondary">{vehicle.businessImpact ?? "Not available"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">SLA</dt>
                <dd className="text-right font-medium text-text-secondary">{vehicle.sla ?? "Not available"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Scored at</dt>
                <dd className="font-medium text-text-secondary">{scoredLabel}</dd>
              </div>
            </dl>
          </Panel>
        </div>

        {linkage?.homeStation && (
          <Panel
            title="Home Station"
            action={
              <Link
                href={`/stations/${linkage.homeStation.stationId}`}
                className="text-[12px] font-medium text-[var(--series-1)] hover:underline"
              >
                Open station →
              </Link>
            }
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-[12px] text-text-muted">Station</div>
                <div className="mt-1 text-[15px] font-semibold text-text-primary">{linkage.homeStation.stationId}</div>
              </div>
              <div>
                <div className="text-[12px] text-text-muted">Condition</div>
                <div className="mt-1 text-[15px] font-semibold" style={{ color: healthColor(linkage.homeStation.healthScore) }}>
                  {label(linkage.homeStation.healthClassification)}
                </div>
              </div>
              <div>
                <div className="text-[12px] text-text-muted">Health Score</div>
                <div className="mt-1"><HealthBar score={linkage.homeStation.healthScore} /></div>
              </div>
              <div>
                <div className="text-[12px] text-text-muted">Risk</div>
                <div className="mt-1">
                  <RiskPill percent={linkage.homeStation.riskScore} category={linkage.homeStation.riskCategoryRaw} />
                </div>
              </div>
            </div>
          </Panel>
        )}

        {telemetry.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Battery Temperature" titleNote="(daily avg, °C)">
              <TelemetryChart data={telemetry} dataKey="batteryTemp" color="var(--status-critical)" unit="°C" gradientId="vehicle-temp" />
            </Panel>
            <Panel title="Average Speed" titleNote="(daily avg, km/h)">
              <TelemetryChart data={telemetry} dataKey="avgSpeed" color="var(--series-1)" unit="km/h" gradientId="vehicle-speed" />
            </Panel>
            <Panel title="Distance Covered" titleNote="(daily, km)">
              <TelemetryChart data={telemetry} dataKey="distanceKm" color="var(--status-good)" unit="km" gradientId="vehicle-distance" />
            </Panel>
            <Panel title="Energy Consumption" titleNote="(daily avg, Wh/km)">
              <TelemetryChart data={telemetry} dataKey="energyPerKm" color="var(--series-7)" unit="Wh/km" gradientId="vehicle-energy" />
            </Panel>
          </div>
        )}

        <Panel title="Recommended Field Action">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] text-text-secondary">
                <span className="font-semibold text-text-primary">{vehicle.priority ?? "—"}</span> ·{" "}
                {vehicle.sla ?? "SLA not available"} · {vehicle.recommendedAction ?? vehicle.likelyIssue ?? "No action reported"}
              </p>
              {vehicle.suggestedChecks.length > 0 ? (
                <ol className="mt-3 ml-4 list-decimal space-y-1 text-[13px] text-text-secondary">
                  {vehicle.suggestedChecks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-[13px] text-text-muted">No checks suggested.</p>
              )}
            </div>
            <CreateFieldActionButton
              batteryId={vehicle.vehicleId}
              sla={vehicle.sla ?? "Not available"}
              priority={vehicle.priority ?? "—"}
            />
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
