import Link from "next/link";
import { ArrowLeft, Gauge, MapPin, Sparkles, User } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Panel } from "@/components/ui/Panel";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { DemoDataBanner } from "@/components/ui/DemoDataBanner";
import { StatusDot } from "@/components/ui/StatusDot";
import { HealthBar, healthColor } from "@/components/ui/HealthBar";
import { RiskPill } from "@/components/ui/RiskPill";
import { TelemetryChart } from "@/components/battery/TelemetryChart";
import { CreateFieldActionButton } from "@/components/battery/CreateFieldActionButton";
import { getDummyVehicleDetail } from "@/lib/dummy/vehicles";
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
  const vehicle = getDummyVehicleDetail(vehicleId);

  if (!vehicle) {
    return (
      <PageShell title={vehicleId} subtitle="Vehicle detail — demo data">
        <ApiErrorState
          title={`Could not find ${vehicleId}`}
          error="This demo register only has VEH-001 through VEH-014 — check the id and try again."
        />
      </PageShell>
    );
  }

  const scoredLabel = formatScoredAt(vehicle.scoredAt);

  return (
    <PageShell title={vehicle.vehicleId} subtitle={`${vehicle.model} — demo data`}>
      <div className="flex flex-col gap-4">
        <Link
          href="/vehicles"
          className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--series-1)] hover:underline"
        >
          <ArrowLeft size={14} />
          All vehicles
        </Link>

        <DemoDataBanner message="This vehicle and every score, signal and chart below are fabricated for UI preview — there is no live telemetry behind this page yet." />

        {/* Vehicle overview — mirrors the station page's layout: the
            vehicle's own facts first, AI scoring below. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Panel>
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
                style={{ backgroundColor: "color-mix(in srgb, var(--series-7) 12%, transparent)" }}
              >
                <Gauge size={19} style={{ color: "var(--series-7)" }} />
              </span>
              <div>
                <div className="text-[12px] text-text-muted">Odometer</div>
                <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-text-primary">
                  {vehicle.odometerKm.toLocaleString("en-IN")}
                  <span className="ml-1 text-[12px] font-normal text-text-muted">km</span>
                </div>
              </div>
            </div>
            <div className="mt-4 text-[12px] text-text-muted">Model</div>
            <div className="mt-1 text-[13px] font-medium text-text-primary">{vehicle.model}</div>
          </Panel>
          <Panel>
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
                style={{ backgroundColor: "color-mix(in srgb, var(--series-1) 12%, transparent)" }}
              >
                <User size={19} style={{ color: "var(--series-1)" }} />
              </span>
              <div>
                <div className="text-[12px] text-text-muted">Driver</div>
                <div className="mt-0.5 text-[15px] font-semibold text-text-primary">{vehicle.driver}</div>
              </div>
            </div>
            <div className="mt-4 text-[12px] text-text-muted">Registration</div>
            <div className="mt-1 text-[13px] font-medium tabular-nums text-text-primary">{vehicle.registration}</div>
          </Panel>
          <Panel>
            <div className="text-[12px] text-text-muted">Status</div>
            <div className="mt-1">
              <StatusDot status={vehicle.online ? "ONLINE" : "OFFLINE"} />
            </div>
            <div className="mt-4 text-[12px] text-text-muted">Home Station</div>
            <Link
              href={`/stations/${vehicle.stationId}`}
              className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-[var(--series-1)] hover:underline"
            >
              <MapPin size={13} className="flex-none text-text-muted" />
              {vehicle.stationId}
            </Link>
          </Panel>
          <Panel>
            <div className="text-[12px] text-text-muted">Assigned Battery</div>
            <div className="mt-1 text-[13px] font-medium tabular-nums text-text-primary" title="Demo data — this id is fabricated and won't match a real battery">
              {vehicle.batteryId}
            </div>
            <div className="mt-4 text-[12px] text-text-muted">Last Scored</div>
            <div className="mt-1 text-[13px] font-medium text-text-primary">{scoredLabel}</div>
          </Panel>
        </div>

        <Panel>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">
            <div>
              <div className="text-[12px] text-text-muted">Condition</div>
              <div className="mt-1 text-[15px] font-semibold" style={{ color: healthColor(vehicle.healthScore) }}>
                {label(vehicle.healthClassification)}
              </div>
            </div>
            <div>
              <div className="text-[12px] text-text-muted">Health Score</div>
              <div
                className="mt-1 text-[15px] font-semibold tabular-nums"
                style={{ color: healthColor(vehicle.healthScore) }}
              >
                {vehicle.healthScore}
                <span className="text-[12px] font-normal text-text-muted">/100</span>
              </div>
            </div>
            <div>
              <div className="text-[12px] text-text-muted">Anomaly</div>
              <div className="mt-1 text-[15px] font-semibold tabular-nums text-text-primary">
                {vehicle.anomalyScore}
                <span className="ml-1 text-[12px] font-normal text-text-muted">{label(vehicle.anomalySeverity)}</span>
              </div>
            </div>
            <div>
              <div className="text-[12px] text-text-muted">Predictive Risk</div>
              <div className="mt-1">
                <RiskPill percent={vehicle.riskScore} category={vehicle.riskCategoryRaw} showCategory />
              </div>
            </div>
            <div>
              <div className="text-[12px] text-text-muted">Priority</div>
              <div className="mt-1 text-[15px] font-semibold tabular-nums text-text-primary">{vehicle.priority}</div>
            </div>
            <div>
              <div className="text-[12px] text-text-muted">Prediction Window</div>
              <div className="mt-1 text-[13px] font-medium text-text-primary">{vehicle.predictionWindow}</div>
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Health Dimensions">
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
            <p className="text-[13px] font-medium leading-relaxed text-text-primary">{vehicle.likelyIssue}</p>
            <p className="mt-3 text-[12.5px] leading-relaxed text-text-secondary">{vehicle.riskNote}</p>
            <dl className="mt-4 space-y-1.5 border-t border-[var(--border-hairline)] pt-3 text-[12px]">
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Business impact</dt>
                <dd className="font-medium text-text-secondary">{vehicle.businessImpact}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">SLA</dt>
                <dd className="text-right font-medium text-text-secondary">{vehicle.sla}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Scored at</dt>
                <dd className="font-medium text-text-secondary">{scoredLabel}</dd>
              </div>
            </dl>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Battery Temperature" titleNote="(daily avg, °C — demo data)">
            <TelemetryChart data={vehicle.telemetry} dataKey="batteryTemp" color="var(--status-critical)" unit="°C" gradientId="vehicle-temp" />
          </Panel>
          <Panel title="Average Speed" titleNote="(daily avg, km/h — demo data)">
            <TelemetryChart data={vehicle.telemetry} dataKey="avgSpeed" color="var(--series-1)" unit="km/h" gradientId="vehicle-speed" />
          </Panel>
          <Panel title="Distance Covered" titleNote="(daily, km — demo data)">
            <TelemetryChart data={vehicle.telemetry} dataKey="distanceKm" color="var(--status-good)" unit="km" gradientId="vehicle-distance" />
          </Panel>
          <Panel title="Efficiency" titleNote="(daily avg, % — demo data)">
            <TelemetryChart data={vehicle.telemetry} dataKey="efficiency" color="var(--series-7)" unit="%" gradientId="vehicle-efficiency" />
          </Panel>
        </div>

        <Panel title="Recommended Field Action">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] text-text-secondary">
                <span className="font-semibold text-text-primary">{vehicle.priority}</span> · {vehicle.sla} ·{" "}
                {vehicle.likelyIssue}
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
            <CreateFieldActionButton batteryId={vehicle.vehicleId} sla={vehicle.sla} priority={vehicle.priority} />
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
