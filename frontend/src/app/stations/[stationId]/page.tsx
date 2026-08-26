import Link from "next/link";
import { ArrowLeft, BatteryCharging, LayoutGrid, Plug, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Panel } from "@/components/ui/Panel";
import { ApiErrorState } from "@/components/ui/ApiErrorState";
import { StatCard } from "@/components/ui/StatCard";
import { StatusDot } from "@/components/ui/StatusDot";
import { HealthBar, healthColor } from "@/components/ui/HealthBar";
import { RiskPill } from "@/components/ui/RiskPill";
import { CreateFieldActionButton } from "@/components/battery/CreateFieldActionButton";
import { getStationDetail } from "@/lib/api/resources";
import { formatScoredAt } from "@/lib/formatScoredAt";

function label(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function StationDetailPage({
  params,
}: {
  params: Promise<{ stationId: string }>;
}) {
  const { stationId } = await params;
  const { data, error } = await getStationDetail(stationId);

  if (error || !data) {
    return (
      <PageShell title={stationId} subtitle="Station detail">
        <ApiErrorState title={`Could not load ${stationId}`} error={error ?? "Unknown error"} />
      </PageShell>
    );
  }

  const { station, chargers, scoring } = data;
  const faulty = chargers.filter((c) => c.faulty).length;
  const scoredLabel = scoring ? formatScoredAt(scoring.scoredAt) : null;

  return (
    <PageShell title={station.stationId} subtitle={station.name}>
      <div className="flex flex-col gap-4">
        <Link
          href="/stations"
          className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-[var(--series-1)] hover:underline"
        >
          <ArrowLeft size={14} />
          All stations
        </Link>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={LayoutGrid}
            iconBg="color-mix(in srgb, var(--series-7) 12%, transparent)"
            iconColor="var(--series-7)"
            label="Docks"
            value={station.dockCount}
            href={`/live-monitoring?station=${station.stationId}`}
            breakdown={[
              { label: "Healthy", value: station.healthyDocks, tone: "good" },
              { label: "At risk", value: station.atRiskDocks, tone: "warning" },
              { label: "Critical", value: station.criticalDocks, tone: "critical" },
            ]}
          />
          <StatCard
            icon={Plug}
            iconBg="color-mix(in srgb, var(--series-1) 12%, transparent)"
            iconColor="var(--series-1)"
            label="Chargers"
            value={station.chargersOnline + station.chargersOffline}
            href={`/chargers?station=${station.stationId}`}
            breakdown={[
              { label: "Online", value: station.chargersOnline, tone: "good" },
              { label: "Offline", value: station.chargersOffline, tone: "critical" },
              { label: "Faulty", value: faulty, tone: "warning" },
            ]}
          />
          <StatCard
            icon={BatteryCharging}
            iconBg="color-mix(in srgb, var(--status-critical) 12%, transparent)"
            iconColor="var(--status-critical)"
            label="High Risk Docks"
            value={station.highRiskDocks}
            href={`/live-monitoring?station=${station.stationId}`}
          />
          <Panel>
            <div className="text-[12px] text-text-muted">Station Status</div>
            <div className="mt-1">
              <StatusDot status={station.online ? "ONLINE" : "OFFLINE"} />
            </div>
            <div className="mt-4 text-[12px] text-text-muted">Average Dock Health</div>
            <div className="mt-1">
              <HealthBar score={station.avgHealthScore} />
            </div>
          </Panel>
        </div>

        {/* From GET /stations/{id} — same AI-scoring shape a battery's page
            shows. Degrades quietly (this whole block just doesn't render) if
            that call fails; the dock/charger overview above still works. */}
        {scoring && (
          <>
            <Panel>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">
                <div>
                  <div className="text-[12px] text-text-muted">Condition</div>
                  <div
                    className="mt-1 text-[15px] font-semibold"
                    style={{ color: healthColor(scoring.healthScore) }}
                  >
                    {label(scoring.healthClassification)}
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-text-muted">Health Score</div>
                  <div
                    className="mt-1 text-[15px] font-semibold tabular-nums"
                    style={{ color: healthColor(scoring.healthScore) }}
                  >
                    {scoring.healthScore}
                    <span className="text-[12px] font-normal text-text-muted">/100</span>
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-text-muted">Anomaly</div>
                  <div className="mt-1 text-[15px] font-semibold tabular-nums text-text-primary">
                    {scoring.anomalyScore}
                    <span className="ml-1 text-[12px] font-normal text-text-muted">
                      {label(scoring.anomalySeverity)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-text-muted">Predictive Risk</div>
                  <div className="mt-1">
                    <RiskPill percent={scoring.riskScore} category={scoring.riskCategoryRaw} showCategory />
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-text-muted">Priority</div>
                  <div className="mt-1 text-[15px] font-semibold tabular-nums text-text-primary">
                    {scoring.priority}
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-text-muted">Prediction Window</div>
                  <div className="mt-1 text-[13px] font-medium text-text-primary">{scoring.predictionWindow}</div>
                </div>
              </div>
            </Panel>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Panel title="Health Dimensions">
                {scoring.dimensions.length === 0 ? (
                  <p className="text-[13px] text-text-muted">No dimension scores reported.</p>
                ) : (
                  <ul className="space-y-3">
                    {scoring.dimensions.map((dimension) => (
                      <li key={dimension.key} className="flex items-center gap-3">
                        <span className="w-32 flex-none text-[13px] text-text-secondary">{dimension.label}</span>
                        <div className="flex-1">
                          <HealthBar score={dimension.score} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Detected Signals">
                {scoring.detectedSignals.length === 0 ? (
                  <p className="text-[13px] text-text-muted">
                    No anomaly signals detected against this station&apos;s baseline.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {scoring.detectedSignals.map((signal) => (
                      <li key={signal} className="flex items-start gap-2 text-[13px] text-text-secondary">
                        <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[var(--status-warning)]" />
                        {signal}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="AI Insight" action={<Sparkles size={16} className="text-[var(--series-1)]" />}>
                <p className="text-[13px] font-medium leading-relaxed text-text-primary">{scoring.likelyIssue}</p>
                <p className="mt-3 text-[12.5px] leading-relaxed text-text-secondary">{scoring.riskNote}</p>
                <dl className="mt-4 space-y-1.5 border-t border-[var(--border-hairline)] pt-3 text-[12px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-muted">Business impact</dt>
                    <dd className="font-medium text-text-secondary">{scoring.businessImpact}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-muted">SLA</dt>
                    <dd className="text-right font-medium text-text-secondary">{scoring.sla}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-muted">Scored at</dt>
                    <dd className="font-medium text-text-secondary">{scoredLabel}</dd>
                  </div>
                </dl>
              </Panel>
            </div>

            <Panel title="Recommended Field Action">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] text-text-secondary">
                    <span className="font-semibold text-text-primary">{scoring.priority}</span> · {scoring.sla} ·{" "}
                    {scoring.likelyIssue}
                  </p>
                  {scoring.suggestedChecks.length > 0 ? (
                    <ol className="mt-3 ml-4 list-decimal space-y-1 text-[13px] text-text-secondary">
                      {scoring.suggestedChecks.map((check) => (
                        <li key={check}>{check}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-[13px] text-text-muted">No checks suggested.</p>
                  )}
                </div>
                <CreateFieldActionButton batteryId={station.stationId} sla={scoring.sla} priority={scoring.priority} />
              </div>
            </Panel>
          </>
        )}

      </div>
    </PageShell>
  );
}
