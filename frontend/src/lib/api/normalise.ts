// Normalises the API payload into the view model the dashboard renders.
//
// The four fields still to be added on the service side are modelled as
// nullable here, so the UI can hide those panels instead of showing zeros:
//   - batteries.maintenance_due_count  -> maintenanceDue
//   - health_trend                     -> healthTrend
//   - top_at_risk_batteries[].station_id      -> row.stationId
//   - top_at_risk_batteries[].failure_in_hours-> row.failureInHours

import type {
  ApiAlert,
  ApiAsset,
  ApiAssetTelemetryPoint,
  ApiBattery,
  ApiHealthDistribution,
  ApiBatteryDetail,
  ApiCharger,
  ApiCommandCenter,
  ApiHealthTrendPoint,
  ApiPredictiveWarning,
  ApiStation,
  ApiStationDetail,
  ApiStationScore,
} from "./types";

export type DataSource = "api" | "demo";

export type HealthState = "healthy" | "warning" | "critical" | "offline";
export type RiskCategory = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type AlertTone = "critical" | "serious" | "warning" | "neutral";

export interface Bucket {
  state: HealthState;
  label: string;
  count: number;
  pct: number;
}

export interface DashboardAlert {
  key: string;
  title: string;
  entityLabel: string;
  /** The affected asset's own page, or its station's when the alert only
   * carries an opaque reference number rather than a real asset id. */
  href: string | null;
  stationId: string;
  timestamp: string;
  severity: string;
  tone: AlertTone;
}

export interface AtRiskRow {
  batteryId: string;
  stationId: string | null;
  healthScore: number;
  healthClassification: string;
  riskScore: number;
  riskCategory: RiskCategory;
  priority: string;
  likelyIssue: string;
  predictionWindow: string;
  failureInHours: number | null;
}

export interface TrendPoint {
  label: string;
  /** Percentages, matching the chart's "% of batteries" axis. */
  healthy: number;
  warning: number;
  critical: number;
}

export interface DashboardData {
  source: DataSource;
  stations: { total: number; online: number; offline: number };
  chargers: { total: number; online: number; offline: number; faulty: number };
  batteries: {
    total: number;
    overallHealth: number;
    classification: string;
    highRisk: number;
    predictedFailures: number;
    /** null until the service exposes it — the tile is hidden when null. */
    maintenanceDue: number | null;
  };
  healthBuckets: Bucket[];
  /** Total the donut is drawn from — all monitored assets, not just batteries. */
  distributionTotal: number;
  riskNotes: { maintenanceDue: string | null };
  alerts: DashboardAlert[];
  atRisk: AtRiskRow[];
  failureReasons: { reason: string; count: number; pct: number }[];
  /** null until the service exposes it — the chart is hidden when null. */
  healthTrend: TrendPoint[] | null;
}

const STATE_LABEL: Record<HealthState, string> = {
  healthy: "Healthy",
  warning: "Warning",
  critical: "Critical",
  offline: "Offline",
};

/** Severity strings are free-form in the schema, so match generously and fall
 * back to neutral rather than mis-colouring an unknown value. */
export function alertTone(severity: string): AlertTone {
  const s = severity.toUpperCase();
  if (s.includes("CRITICAL") || s.includes("FATAL")) return "critical";
  if (s.includes("HIGH") || s.includes("SEVERE") || s.includes("ERROR")) return "serious";
  if (s.includes("WARN") || s.includes("MEDIUM") || s.includes("MODERATE")) return "warning";
  return "neutral";
}

export function riskCategory(value: string): RiskCategory {
  const v = value.toUpperCase();
  if (v.includes("CRITICAL")) return "CRITICAL";
  if (v.includes("HIGH")) return "HIGH";
  if (v.includes("MODERATE") || v.includes("MEDIUM")) return "MODERATE";
  return "LOW";
}

/** Turns a category/description pair into an alert headline. */
function alertTitle(category: string, description: string): string {
  const readable = category
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return description?.trim() ? description : readable;
}

/** `entity_id` on this platform is not reliably the affected asset's own id —
 * roughly a quarter of alerts carry a real one (BAT.../QIS.../CHG...), the
 * rest carry an opaque internal reference like "ALERT0062" that only looks
 * like an id. This tells the two apart so the UI never presents a made-up
 * reference number as if it were a battery, station or charger's real id. */
function realAssetId(entityId: string): boolean {
  return /^(BAT|QIS|CHG)/i.test(entityId);
}

function entityLabel(alert: ApiAlert): string {
  const type = alert.entity_type ? alert.entity_type.charAt(0).toUpperCase() + alert.entity_type.slice(1) : "Entity";
  if (realAssetId(alert.entity_id)) return `${type} ${alert.entity_id}`;
  // Not a real per-asset id — station_id is always real, so say that instead
  // of presenting the opaque reference as if it named the asset.
  return `${type} at ${alert.station_id}`;
}

/** Best-effort link from an alert's entity to its detail page. Falls back to
 * the alert's `station_id` (always a real station) rather than a dead link
 * when `entity_id` is only an opaque reference number, not a real asset id. */
function entityHref(alert: ApiAlert): string | null {
  const id = alert.entity_id;
  if (/^BAT/i.test(id)) return `/batteries/${id}`;
  if (/^QIS/i.test(id)) {
    const digits = id.match(/\d+/)?.[0];
    if (digits) return `/stations/QIS${digits.padStart(3, "0")}`;
  }
  // CHARGER entity_ids need a station to disambiguate (see the charger
  // detail page), which this shape doesn't carry — and any opaque
  // "ALERT####" reference isn't navigable at all — so land on the station.
  if (alert.station_id) return `/stations/${alert.station_id}`;
  return null;
}

/** Shared by the command-center's `top_critical_alerts` and the dedicated
 * GET /operations/alerts feed — both return the same `ApiAlert` shape. */
export function normaliseAlert(alert: ApiAlert, idx: number): DashboardAlert {
  return {
    key: `${alert.entity_id}-${alert.timestamp}-${idx}`,
    title: alertTitle(alert.category, alert.description),
    entityLabel: entityLabel(alert),
    stationId: alert.station_id,
    timestamp: alert.timestamp,
    severity: alert.severity,
    tone: alertTone(alert.severity),
    href: entityHref(alert),
  };
}

function trendLabel(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function normaliseTrend(points: ApiHealthTrendPoint[] | null | undefined): TrendPoint[] | null {
  if (!points || points.length === 0) return null;
  return points.map((point) => ({
    label: trendLabel(point.date),
    healthy: point.healthy_percent,
    warning: point.warning_percent,
    critical: point.critical_percent,
  }));
}

export function normaliseCommandCenter(payload: ApiCommandCenter, source: DataSource): DashboardData {
  const b = payload.batteries;
  const total = b.total;

  return {
    source,
    stations: payload.stations,
    chargers: payload.chargers,
    batteries: {
      total,
      overallHealth: b.overall_health_score,
      classification: b.overall_health_classification,
      highRisk: b.high_risk_count,
      predictedFailures: b.predicted_failure_count,
      maintenanceDue: b.maintenance_due_count ?? null,
    },
    alerts: (payload.top_critical_alerts ?? []).map(normaliseAlert),
    atRisk: (payload.top_at_risk_batteries ?? []).map((row) => ({
      batteryId: row.battery_id,
      stationId: row.station_id ?? null,
      healthScore: row.health_score,
      healthClassification: row.health_classification,
      riskScore: row.risk_score,
      riskCategory: riskCategory(row.risk_category),
      priority: row.priority,
      likelyIssue: row.likely_issue,
      predictionWindow: row.prediction_window,
      failureInHours: row.failure_in_hours ?? null,
    })),
    failureReasons: (payload.top_failure_reasons ?? []).map((r) => ({
      reason: r.reason,
      count: r.count,
      pct: r.percent,
    })),
    healthBuckets: [],
    distributionTotal: total,
    riskNotes: { maintenanceDue: null },
    healthTrend: normaliseTrend(payload.health_trend),
  };
}

// ---------------------------------------------------------------------------
// Battery / station / charger view models
// ---------------------------------------------------------------------------

export interface BatteryRow {
  batteryId: string;
  healthScore: number;
  healthClassification: string;
  anomalyScore: number;
  anomalySeverity: string;
  riskScore: number;
  riskCategory: RiskCategory;
  riskCategoryRaw: string;
  priority: string;
  likelyIssue: string;
  predictionWindow: string;
  stationId: string | null;
}

export interface BatteryDetailView extends BatteryRow {
  /** Ordered for display; the service returns an open-ended map of dimensions. */
  dimensions: { key: string; label: string; score: number }[];
  detectedSignals: string[];
  sla: string;
  businessImpact: string;
  suggestedChecks: string[];
  riskNote: string;
  scoredAt: string;
}

export interface StationRow {
  stationId: string;
  name: string;
  online: boolean;
  dockCount: number;
  chargersOnline: number;
  chargersOffline: number;
  avgHealthScore: number;
  healthyDocks: number;
  atRiskDocks: number;
  criticalDocks: number;
  highRiskDocks: number;
  latitude: number | null;
  longitude: number | null;
  /** From the separate GET /stations/scores call — null until that call is
   * merged in (see `mergeStationScore`), so the register still renders
   * without these columns if that fetch fails on its own. */
  healthClassification: string | null;
  anomalyScore: number | null;
  anomalySeverity: string | null;
  riskScore: number | null;
  riskCategoryRaw: string | null;
  priority: string | null;
  likelyIssue: string | null;
}

/** Merges a GET /stations/scores row into a station's overview row — kept
 * separate from `normaliseStation` since the two come from different calls
 * that can succeed or fail independently. */
export function mergeStationScore(row: StationRow, score: ApiStationScore | undefined): StationRow {
  if (!score) return row;
  return {
    ...row,
    healthClassification: score.health_classification,
    anomalyScore: score.anomaly_score,
    anomalySeverity: score.anomaly_severity,
    riskScore: score.risk_score,
    riskCategoryRaw: score.risk_category,
    priority: score.priority,
    likelyIssue: score.likely_issue,
  };
}

export interface ChargerRow {
  chargerId: string;
  dockId: string;
  stationId: string;
  online: boolean;
  faulty: boolean;
  /** Null when the charger has never reported. */
  lastSeen: string | null;
  /** There is no per-charger scoring endpoint — these come from the dock
   * this charger sits on (see `deriveDockAssetId` in resources.ts), merged
   * in separately, so null when that cross-reference doesn't resolve. */
  healthScore: number | null;
  healthClassification: string | null;
  anomalyScore: number | null;
  anomalySeverity: string | null;
  riskScore: number | null;
  riskCategoryRaw: string | null;
  priority: string | null;
  likelyIssue: string | null;
}

/** Turns an API dimension key such as `charging_electrical` into a label. */
function dimensionLabel(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normaliseBattery(row: ApiBattery): BatteryRow {
  return {
    batteryId: row.battery_id,
    healthScore: row.health_score,
    healthClassification: row.health_classification,
    anomalyScore: row.anomaly_score,
    anomalySeverity: row.anomaly_severity,
    riskScore: row.risk_score,
    riskCategory: riskCategory(row.risk_category),
    riskCategoryRaw: row.risk_category,
    priority: row.priority,
    likelyIssue: row.likely_issue,
    predictionWindow: row.prediction_window,
    stationId: row.station_id ?? null,
  };
}

export function normaliseBatteryDetail(detail: ApiBatteryDetail): BatteryDetailView {
  return {
    ...normaliseBattery(detail),
    dimensions: Object.entries(detail.dimension_scores ?? {}).map(([key, score]) => ({
      key,
      label: dimensionLabel(key),
      score,
    })),
    detectedSignals: detail.detected_signals ?? [],
    sla: detail.sla,
    businessImpact: detail.business_impact,
    suggestedChecks: detail.suggested_checks ?? [],
    riskNote: detail.risk_note,
    scoredAt: detail.scored_at,
  };
}

export function normaliseStation(row: ApiStation): StationRow {
  return {
    stationId: row.station_id,
    name: row.name ?? row.location ?? row.station_id,
    online: row.online,
    dockCount: row.dock_count,
    chargersOnline: row.chargers_online,
    chargersOffline: row.chargers_offline,
    avgHealthScore: row.avg_health_score,
    healthyDocks: row.healthy_docks,
    atRiskDocks: row.at_risk_docks,
    criticalDocks: row.critical_docks,
    highRiskDocks: row.high_risk_docks,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    healthClassification: null,
    anomalyScore: null,
    anomalySeverity: null,
    riskScore: null,
    riskCategoryRaw: null,
    priority: null,
    likelyIssue: null,
  };
}

export function normaliseCharger(row: ApiCharger): ChargerRow {
  return {
    chargerId: row.charger_id,
    dockId: row.dock_id,
    stationId: row.station_id,
    online: row.online,
    faulty: row.faulty,
    lastSeen: row.last_seen ?? null,
    healthScore: null,
    healthClassification: null,
    anomalyScore: null,
    anomalySeverity: null,
    riskScore: null,
    riskCategoryRaw: null,
    priority: null,
    likelyIssue: null,
  };
}

/** Merges the dock's own AI scoring into a charger row — there is no
 * per-charger scoring endpoint, so this is the closest real substitute (see
 * `deriveDockAssetId` in resources.ts for how the dock is found). */
export function mergeChargerDockRisk(row: ChargerRow, asset: ApiAsset | undefined): ChargerRow {
  if (!asset) return row;
  return {
    ...row,
    healthScore: asset.health_score,
    healthClassification: asset.health_classification,
    anomalyScore: asset.anomaly_score,
    anomalySeverity: asset.anomaly_severity,
    riskScore: asset.risk_score,
    riskCategoryRaw: asset.risk_category,
    priority: asset.priority,
    likelyIssue: asset.likely_issue,
  };
}

/** GET /stations/{id} — same AI-scoring shape as a battery's detail. */
export interface StationDetailView {
  stationId: string;
  location: string;
  healthScore: number;
  healthClassification: string;
  anomalyScore: number;
  anomalySeverity: string;
  riskScore: number;
  riskCategory: RiskCategory;
  riskCategoryRaw: string;
  priority: string;
  likelyIssue: string;
  predictionWindow: string;
  scoredAt: string;
  dimensions: { key: string; label: string; score: number }[];
  detectedSignals: string[];
  sla: string;
  businessImpact: string;
  suggestedChecks: string[];
  riskNote: string;
}

export function normaliseStationDetail(detail: ApiStationDetail): StationDetailView {
  return {
    stationId: detail.station_id,
    location: detail.location,
    healthScore: detail.health_score,
    healthClassification: detail.health_classification,
    anomalyScore: detail.anomaly_score,
    anomalySeverity: detail.anomaly_severity,
    riskScore: detail.risk_score,
    riskCategory: riskCategory(detail.risk_category),
    riskCategoryRaw: detail.risk_category,
    priority: detail.priority,
    likelyIssue: detail.likely_issue,
    predictionWindow: detail.prediction_window,
    scoredAt: detail.scored_at,
    dimensions: Object.entries(detail.dimension_scores ?? {}).map(([key, score]) => ({
      key,
      label: dimensionLabel(key),
      score,
    })),
    detectedSignals: detail.detected_signals ?? [],
    sla: detail.sla,
    businessImpact: detail.business_impact,
    suggestedChecks: detail.suggested_checks ?? [],
    riskNote: detail.risk_note,
  };
}

/** GET /operations/predictive-warnings — spans every asset type, so this is
 * the real predictive-risk register (AI Predictions screen). */
export interface PredictiveWarningRow {
  assetType: string;
  assetId: string;
  location: string | null;
  riskScore: number;
  riskCategory: RiskCategory;
  riskCategoryRaw: string;
  priority: string;
  likelyIssue: string;
  predictionWindow: string;
  scoredAt: string;
  /** Link to the asset's own page, when this type has one. Docks don't have
   * a dedicated page, so they link to their parent station instead. */
  href: string | null;
}

function predictiveWarningHref(assetType: string, assetId: string): string | null {
  const type = assetType.toUpperCase();
  if (type === "BATTERY") return `/batteries/${assetId}`;
  if (type === "STATION") return `/stations/${assetId}`;
  // DOCK and CHARGER ids here look like "QIS-018-03" — no per-dock page
  // exists, so link to the parent station (the id's first two segments).
  const stationMatch = assetId.match(/^([A-Za-z]+-?\d+)-\d+$/);
  if (stationMatch) return `/stations/${stationMatch[1].replace("-", "")}`;
  return null;
}

export function normalisePredictiveWarning(row: ApiPredictiveWarning): PredictiveWarningRow {
  return {
    assetType: row.asset_type,
    assetId: row.asset_id,
    location: row.location,
    riskScore: row.risk_score,
    riskCategory: riskCategory(row.risk_category),
    riskCategoryRaw: row.risk_category,
    priority: row.priority,
    likelyIssue: row.likely_issue,
    predictionWindow: row.prediction_window,
    scoredAt: row.scored_at,
    href: predictiveWarningHref(row.asset_type, row.asset_id),
  };
}

/** GET /assets — the dock register (QIS_DOCK assets), fully scored like a
 * battery: health, anomaly and predictive risk. */
export interface AssetRow {
  assetId: string;
  stationId: string;
  location: string;
  assetType: string;
  operationalStatus: string;
  healthScore: number;
  healthClassification: string;
  anomalyScore: number;
  anomalySeverity: string;
  riskScore: number;
  riskCategory: RiskCategory;
  riskCategoryRaw: string;
  priority: string;
  likelyIssue: string;
  predictionWindow: string;
}

export function normaliseAsset(row: ApiAsset): AssetRow {
  return {
    assetId: row.asset_id,
    stationId: row.station_id,
    location: row.location,
    assetType: row.asset_type,
    operationalStatus: row.operational_status,
    healthScore: row.health_score,
    healthClassification: row.health_classification,
    anomalyScore: row.anomaly_score,
    anomalySeverity: row.anomaly_severity,
    riskScore: row.risk_score,
    riskCategory: riskCategory(row.risk_category),
    riskCategoryRaw: row.risk_category,
    priority: row.priority,
    likelyIssue: row.likely_issue,
    predictionWindow: row.prediction_window,
  };
}

/** GET /assets/{id}/telemetry — daily dock-level aggregates. */
export interface AssetTelemetryPointView {
  date: string;
  temperature: number;
  chargingDuration: number;
  current: number;
  efficiency: number;
  offlineRate: number;
  swapSuccessRate: number;
  alertCount: number;
}

export function normaliseAssetTelemetry(points: ApiAssetTelemetryPoint[]): AssetTelemetryPointView[] {
  return points.map((p) => ({
    date: p.date,
    temperature: p.charger_temperature_mean,
    chargingDuration: p.charging_duration_mean,
    current: p.output_current_mean,
    efficiency: p.efficiency_mean,
    offlineRate: p.offline_rate,
    swapSuccessRate: p.swap_success_rate,
    alertCount: p.alert_count,
  }));
}

/** Buckets for the Asset Health Distribution donut, from
 * GET /operations/health-distribution. */
export function normaliseDistribution(dist: ApiHealthDistribution): Bucket[] {
  return (
    [
      ["healthy", dist.healthy],
      ["warning", dist.warning],
      ["critical", dist.critical],
      ["offline", dist.offline],
    ] as [HealthState, { count: number; percent: number }][]
  ).map(([state, bucket]) => ({
    state,
    label: STATE_LABEL[state],
    count: bucket?.count ?? 0,
    pct: bucket?.percent ?? 0,
  }));
}
