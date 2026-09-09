// Wire types for the AI Asset Intelligence Platform API.
//
// These mirror GET /dashboard/command-center exactly as the service returns it
// — snake_case and all — so the boundary is obvious. Everything downstream
// works from the normalised view model in `normalise.ts` instead.

export interface ApiStationCounts {
  total: number;
  online: number;
  offline: number;
}

export interface ApiChargerCounts {
  total: number;
  online: number;
  offline: number;
  /** Not mutually exclusive with online/offline — online + offline already
   * equals total, so a faulty charger is also counted in one of those. */
  faulty: number;
}

export interface ApiBatteryCounts {
  overall_health_score: number;
  overall_health_classification: string;
  total: number;
  healthy: number;
  watch: number;
  at_risk: number;
  critical: number;
  offline: number;
  high_risk_count: number;
  predicted_failure_count: number;
  /** Requested addition — absent until the service exposes it. */
  maintenance_due_count?: number | null;
}

export interface ApiAlert {
  timestamp: string;
  category: string;
  severity: string;
  entity_type: string;
  entity_id: string;
  station_id: string;
  description: string;
}

export interface ApiAtRiskBattery {
  battery_id: string;
  health_score: number;
  health_classification: string;
  anomaly_score: number;
  anomaly_severity: string;
  risk_score: number;
  risk_category: string;
  priority: string;
  likely_issue: string;
  prediction_window: string;
  /** Requested additions — absent until the service exposes them. */
  station_id?: string | null;
  failure_in_hours?: number | null;
}

export interface ApiFailureReason {
  reason: string;
  count: number;
  percent: number;
}

/** GET /batteries/health/trend?days=7 */
export interface ApiHealthTrendPoint {
  date: string;
  total: number;
  healthy_count: number;
  healthy_percent: number;
  warning_count: number;
  warning_percent: number;
  critical_count: number;
  critical_percent: number;
}

/** One bucket in GET /operations/health-distribution. */
export interface ApiDistributionBucket {
  count: number;
  percent: number;
}

export interface ApiDistributionGroup {
  total: number;
  healthy: ApiDistributionBucket;
  warning: ApiDistributionBucket;
  critical: ApiDistributionBucket;
  offline: ApiDistributionBucket;
}

/** GET /operations/health-distribution — all monitored assets, plus a split
 * by asset type (battery / charger / station). */
export interface ApiHealthDistribution extends ApiDistributionGroup {
  by_asset_type?: Record<string, ApiDistributionGroup>;
}

/** A risk figure from GET /operations/risk-summary. `note` explains how the
 * number was derived when it is an approximation. */
export interface ApiRiskFigure {
  count: number;
  percent: number;
  note?: string | null;
}

export interface ApiRiskSummary {
  total: number;
  window: string;
  high_risk_assets: ApiRiskFigure;
  maintenance_due: ApiRiskFigure;
  predicted_failures: ApiRiskFigure;
  by_asset_type?: Record<string, Record<string, ApiRiskFigure>>;
}

export interface ApiCommandCenter {
  stations: ApiStationCounts;
  chargers: ApiChargerCounts;
  batteries: ApiBatteryCounts;
  top_critical_alerts: ApiAlert[];
  top_at_risk_batteries: ApiAtRiskBattery[];
  top_failure_reasons: ApiFailureReason[];
  health_trend?: ApiHealthTrendPoint[] | null;
}

// ---------------------------------------------------------------------------
// GET /batteries · GET /batteries/risk/top · GET /batteries/{id}
// ---------------------------------------------------------------------------

/** A row from GET /batteries — same shape as the dashboard's at-risk entries. */
export type ApiBattery = ApiAtRiskBattery;

/** GET /batteries/{id} — the list row plus the detail-only fields. */
export interface ApiBatteryDetail extends ApiBattery {
  dimension_scores: Record<string, number>;
  detected_signals: string[];
  sla: string;
  business_impact: string;
  suggested_checks: string[];
  risk_note: string;
  scored_at: string;
}

/** GET /batteries/summary — identical to the command-center battery block. */
export type ApiBatterySummary = ApiBatteryCounts;

// ---------------------------------------------------------------------------
// GET /stations · GET /stations/summary · GET /chargers
// ---------------------------------------------------------------------------

export interface ApiStation {
  station_id: string;
  dock_count: number;
  chargers_online: number;
  chargers_offline: number;
  online: boolean;
  avg_health_score: number;
  healthy_docks: number;
  at_risk_docks: number;
  critical_docks: number;
  high_risk_docks: number;
  /** Requested additions — absent until the service exposes them. */
  latitude?: number | null;
  longitude?: number | null;
  name?: string | null;
  location?: string | null;
}

/** GET /stations/summary */
export type ApiStationSummary = ApiStationCounts;

/** One row of GET /stations/scores — the AI-scored summary for every
 * station in one call (health/anomaly/risk/priority/likely issue), separate
 * from the dock/charger overview GET /stations returns. */
export interface ApiStationScore {
  station_id: string;
  location: string;
  health_score: number;
  health_classification: string;
  anomaly_score: number;
  anomaly_severity: string;
  risk_score: number;
  risk_category: string;
  priority: string;
  likely_issue: string;
  prediction_window: string;
  scored_at: string;
}

/** GET /stations/{id} — the same AI-scoring shape as a battery's detail:
 * dimension scores, detected signals, and a recommended field action. */
export interface ApiStationDetail {
  station_id: string;
  location: string;
  health_score: number;
  health_classification: string;
  anomaly_score: number;
  anomaly_severity: string;
  risk_score: number;
  risk_category: string;
  priority: string;
  likely_issue: string;
  prediction_window: string;
  scored_at: string;
  dimension_scores: Record<string, number>;
  detected_signals: string[];
  sla: string;
  business_impact: string;
  suggested_checks: string[];
  risk_note: string;
}

export interface ApiCharger {
  charger_id: string;
  dock_id: string;
  station_id: string;
  online: boolean;
  faulty: boolean;
  /** Null for chargers that have never reported — offline units send null here. */
  last_seen: string | null;
}

// ---------------------------------------------------------------------------
// Vehicles (2W EV) — served from a separate deployment (VEHICLE_API_BASE_URL)
// that scores the fleet's electric two-wheelers; GET /vehicles · /vehicles/
// summary · /vehicles/risk/top · /vehicles/{asset_id} · /vehicles/{asset_id}/
// telemetry · /vehicles/{asset_id}/linkage.
// ---------------------------------------------------------------------------

/** One row of GET /vehicles or GET /vehicles/risk/top. */
export interface ApiVehicleSummary {
  asset_id: string;
  asset_type: string | null;
  asset_sub_type: string | null;
  manufacturer: string | null;
  model: string | null;
  registration_number: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  home_station_id: string | null;
  status: string | null;
  operational_status: string | null;
  last_seen: string | null;
  health_score: number | null;
  health_classification: string | null;
  anomaly_score: number | null;
  anomaly_severity: string | null;
  risk_score: number | null;
  risk_category: string | null;
  priority: string | null;
  likely_issue: string | null;
  likely_issue_code: string | null;
  scenario_id: string | null;
  confidence: number | null;
  confidence_band: string | null;
  prediction_window: string | null;
  scored_at: string | null;
}

/** The vehicle's most recent single telemetry reading, embedded in
 * GET /vehicles/{asset_id}. */
export interface ApiVehicleTelemetrySnapshot {
  timestamp: string | null;
  vehicle_status: string | null;
  battery_soc: number | null;
  battery_voltage: number | null;
  battery_current: number | null;
  battery_temperature: number | null;
  motor_temperature: number | null;
  motor_current: number | null;
  motor_rpm: number | null;
  vehicle_speed: number | null;
  vehicle_odometer: number | null;
  charging_status: string | null;
  energy_consumption: number | null;
  range_estimate: number | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  connectivity_status: string | null;
  error_code: string | null;
}

/** GET /vehicles/{asset_id} — the 2W EV "Asset 360". */
export interface ApiVehicleDetail extends ApiVehicleSummary {
  dimension_scores: Record<string, number> | null;
  detected_signals: string[];
  sla: string | null;
  business_impact: string | null;
  recommended_action: string | null;
  suggested_checks: string[];
  risk_note: string | null;
  latest_telemetry: ApiVehicleTelemetrySnapshot | null;
  telemetry_profile: string[];
}

/** GET /vehicles/summary */
export interface ApiVehicleFleetSummary {
  total: number;
  healthy: number;
  watch: number;
  at_risk: number;
  critical: number;
  offline: number;
  high_risk_count: number;
  predicted_failure_count: number;
  average_health_score: number | null;
  as_of: string | null;
}

/** One day of GET /vehicles/{asset_id}/telemetry — daily aggregates. */
export interface ApiVehicleTelemetryPoint {
  date: string | null;
  battery_temperature_mean: number | null;
  battery_temperature_max: number | null;
  battery_soc_mean: number | null;
  motor_temperature_mean: number | null;
  motor_current_mean: number | null;
  energy_consumption_total: number | null;
  energy_per_km: number | null;
  range_full_estimate: number | null;
  distance_km: number | null;
  vehicle_speed_mean: number | null;
  connectivity_uptime: number | null;
  reading_count: number | null;
  error_count: number | null;
}

/** GET /vehicles/{asset_id}/linkage — where the vehicle is based and how
 * that station is itself scoring. `home_station` matches the shape of a
 * GET /stations/scores row (confirmed against a live response), though the
 * API declares it as a loose object. */
export interface ApiVehicleLinkage {
  asset_id: string;
  home_station_id: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  home_station: ApiStationScore | null;
}

// ---------------------------------------------------------------------------
// Demo controls (POC-09 / spec section 14 — "Demo Data Control")
// ---------------------------------------------------------------------------

export interface ApiDemoScenario {
  code: string;
  label: string;
}

export interface ApiDemoDataset {
  name: string;
  path: string;
}

/** An asset row from GET /assets — the docks that scenarios can target. */
export interface ApiAsset {
  asset_id: string;
  station_id: string;
  location: string;
  asset_type: string;
  operational_status: string;
  health_score: number;
  health_classification: string;
  anomaly_score: number;
  anomaly_severity: string;
  risk_score: number;
  risk_category: string;
  priority: string;
  likely_issue: string;
  prediction_window: string;
}

// ---------------------------------------------------------------------------
// GET /operations/predictive-warnings · GET /operations/alerts ·
// GET /operations/risk · GET /assets/{id}/telemetry
// ---------------------------------------------------------------------------

/** One row of GET /operations/risk — docks and chargers again (asset_id
 * looks like "QIS-018-03"), but unlike /operations/predictive-warnings this
 * one carries `business_impact` and `scored_at`. No `sla` field exists here
 * — that is genuinely not something the platform scores for a dock/charger. */
export interface ApiOperationsRiskItem {
  asset_id: string;
  location: string;
  risk_score: number;
  risk_category: string;
  likely_issue: string;
  business_impact: string;
  priority: string;
  scored_at: string;
}

/** One row of GET /operations/predictive-warnings — spans every asset type
 * (BATTERY, STATION, DOCK, CHARGER), so this is the real "predictive risk
 * register" the AI Predictions screen wants. */
export interface ApiPredictiveWarning {
  asset_type: string;
  asset_id: string;
  location: string | null;
  risk_score: number;
  risk_category: string;
  priority: string;
  likely_issue: string;
  prediction_window: string;
  scored_at: string;
}

/** One row of GET /assets/{id}/telemetry — daily aggregates for a dock, the
 * only telemetry-history endpoint this platform exposes (no per-battery or
 * per-charger telemetry endpoint exists). */
export interface ApiAssetTelemetryPoint {
  date: string;
  charger_temperature_mean: number;
  charging_duration_mean: number;
  output_current_mean: number;
  efficiency_mean: number;
  offline_rate: number;
  swap_success_rate: number;
  alert_count: number;
}

export interface ApiDemoResetResult {
  reset_at_utc: string;
  dataset: string;
  asset_count: number;
  battery_count: number;
  health_summary?: Record<string, number>;
  risk_summary?: Record<string, number>;
  battery_health_summary?: Record<string, number>;
  battery_risk_summary?: Record<string, number>;
}

/** POST /demo/inject returns the asset's freshly rescored state. */
export interface ApiDemoInjectResult {
  asset_id: string;
  scenario: string;
  scenario_label: string;
  severity: string;
  duration_days: number;
  metrics_perturbed: string[];
  health_score: number;
  health_classification: string;
  anomaly_score: number;
  anomaly_severity: string;
  risk_score: number;
  risk_category: string;
  likely_issue: string;
  priority: string;
}
