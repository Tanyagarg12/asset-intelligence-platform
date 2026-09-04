// Loaders for the battery / station / charger screens.
//
// Unlike the dashboard — which keeps a synthetic fallback so a demo always has
// something on screen — these screens are live-only. Falling back here would
// mean showing a different fleet with a different ID scheme (BAT-09001 vs
// BAT001), which is more confusing than an honest "service unavailable".

import {
  ApiUnavailableError,
  apiBaseUrl,
  fetchAssetTelemetry,
  fetchBatteries,
  fetchBattery,
  fetchBatterySummary,
  fetchAssets,
  fetchChargers,
  fetchCommandCenter,
  fetchDemoDatasets,
  fetchDemoScenarios,
  fetchOperationsAlerts,
  fetchOperationsRisk,
  fetchPredictiveWarnings,
  fetchStationDetail,
  fetchStations,
  fetchStationScores,
  fetchStationsSummary,
} from "./client";
import type { ApiBatteryCounts } from "./types";
import {
  aggregateStationTelemetry,
  mergeChargerDockRisk,
  mergeStationScore,
  normaliseAlert,
  normaliseAsset,
  normaliseAssetTelemetry,
  normaliseBattery,
  normaliseBatteryDetail,
  normaliseCharger,
  normalisePredictiveWarning,
  normaliseStation,
  normaliseStationDetail,
  type AssetRow,
  type AssetTelemetryPointView,
  type BatteryDetailView,
  type BatteryRow,
  type AlertTone,
  type ChargerRow,
  type DashboardAlert,
  type PredictiveWarningRow,
  type StationDetailView,
  type StationRow,
} from "./normalise";

export interface Loaded<T> {
  data: T | null;
  error: string | null;
}

const NOT_CONFIGURED =
  "The dashboard is not connected to the monitoring platform — set the service address in frontend/.env.local and restart.";

function describe(error: unknown): string {
  if (error instanceof ApiUnavailableError) return error.message;
  return error instanceof Error ? error.message : String(error);
}

async function load<T>(fn: () => Promise<T>): Promise<Loaded<T>> {
  if (!apiBaseUrl()) return { data: null, error: NOT_CONFIGURED };
  try {
    return { data: await fn(), error: null };
  } catch (error) {
    return { data: null, error: describe(error) };
  }
}

export interface BatteriesPageData {
  rows: BatteryRow[];
  summary: ApiBatteryCounts | null;
}

export function getBatteriesPage(): Promise<Loaded<BatteriesPageData>> {
  return load(async () => {
    // The summary is a nicety for the filter chips — a failure there should not
    // take the whole table down with it.
    const [rows, summary] = await Promise.all([
      fetchBatteries(),
      fetchBatterySummary().catch(() => null),
    ]);
    return { rows: rows.map(normaliseBattery), summary };
  });
}

export function getBatteryDetail(batteryId: string): Promise<Loaded<BatteryDetailView>> {
  return load(async () => normaliseBatteryDetail(await fetchBattery(batteryId)));
}

export interface StationsPageData {
  rows: StationRow[];
  summary: { total: number; online: number; offline: number } | null;
}

export function getStationsPage(): Promise<Loaded<StationsPageData>> {
  return load(async () => {
    // /stations/scores is a second, independent call (Condition/Anomaly/Risk
    // for every station in one shot) — merged in, but its own failure
    // shouldn't blank the dock/charger overview from /stations.
    const [apiRows, summary, scores] = await Promise.all([
      fetchStations(),
      fetchStationsSummary().catch(() => null),
      fetchStationScores().catch(() => []),
    ]);
    const scoreByStation = new Map(scores.map((s) => [s.station_id.toLowerCase(), s]));
    const rows = apiRows
      .map(normaliseStation)
      .map((row) => mergeStationScore(row, scoreByStation.get(row.stationId.toLowerCase())));
    return { rows, summary };
  });
}

export interface StationDetailData {
  station: StationRow;
  /** From GET /stations/{id} — the same AI-scoring detail a battery's page
   * shows (dimensions, signals, recommended checks). Null only if that call
   * itself fails; the rest of the page still renders from `station`. */
  scoring: StationDetailView | null;
  /** Station-level daily trend — this platform has no station telemetry
   * endpoint, so it's the mean of every dock at this station's own telemetry
   * (see `aggregateStationTelemetry`). Empty if the dock register or every
   * dock's telemetry call fails. */
  telemetry: AssetTelemetryPointView[];
}

/** This platform's dock register (GET /assets) ids docks as
 * "QIS-{station digits}-{dock digits}" — the same convention
 * `deriveDockAssetId` builds one of; here every dock belonging to a station
 * is found by that prefix instead, since the point is "all of them", not one. */
function dockAssetIdsForStation(stationId: string, assets: { asset_id: string }[]): string[] {
  const stationDigits = stationId.match(/(\d+)/)?.[1]?.padStart(3, "0");
  if (!stationDigits) return [];
  const prefix = `QIS-${stationDigits}-`;
  return assets.filter((a) => a.asset_id.startsWith(prefix)).map((a) => a.asset_id);
}

/**
 * A station's own facts (dock/charger counts, status) come from GET
 * /stations; its AI scoring from the dedicated GET /stations/{id}; its trend
 * from averaging every one of its docks' own telemetry. Deliberately does not
 * pull the charger or battery registers — those have their own list pages,
 * scoped to this station via `?station=`, rather than being duplicated here.
 */
export function getStationDetail(stationId: string): Promise<Loaded<StationDetailData>> {
  return load(async () => {
    const [stations, scoring, assets] = await Promise.all([
      fetchStations(),
      fetchStationDetail(stationId)
        .then(normaliseStationDetail)
        .catch(() => null),
      fetchAssets().catch(() => []),
    ]);
    const match = stations.find((s) => s.station_id.toLowerCase() === stationId.toLowerCase());
    if (!match) throw new ApiUnavailableError(`Station ${stationId} was not found`, 404);

    const dockAssetIds = dockAssetIdsForStation(stationId, assets);
    const perDockTelemetry = await Promise.all(
      dockAssetIds.map((assetId) => fetchAssetTelemetry(assetId, 14).catch(() => [])),
    );

    return {
      station: normaliseStation(match),
      scoring,
      telemetry: aggregateStationTelemetry(perDockTelemetry.map(normaliseAssetTelemetry)),
    };
  });
}

export function getChargersPage(): Promise<Loaded<ChargerRow[]>> {
  return load(async () => {
    // There is no per-charger scoring endpoint — GET /assets (the dock
    // register) is cross-referenced per charger via `deriveDockAssetId`, a
    // second independent call so its failure doesn't blank the charger list.
    const [chargers, assets] = await Promise.all([fetchChargers(), fetchAssets().catch(() => [])]);
    const assetById = new Map(assets.map((a) => [a.asset_id, a]));
    return chargers.map((c) => {
      const row = normaliseCharger(c);
      const dockAssetId = deriveDockAssetId(row.stationId, row.dockId);
      return dockAssetId ? mergeChargerDockRisk(row, assetById.get(dockAssetId)) : row;
    });
  });
}

/** There is no per-charger scoring endpoint — a charger's own health/risk
 * comes from the dock it sits on, via GET /assets. The two subsystems name
 * docks differently ("D01" on the charger vs "QIS-001-01" on the asset), so
 * this reconstructs the asset-style id from the charger's own station+dock
 * numbers to look it up. */
export interface DockRiskView {
  assetId: string;
  healthScore: number;
  healthClassification: string;
  anomalyScore: number;
  anomalySeverity: string;
  riskScore: number;
  riskCategory: string;
  priority: string;
  likelyIssue: string;
  predictionWindow: string;
  /** From GET /operations/risk, a second cross-reference — null if that call
   * fails; the rest of dockRisk still renders without it. No `sla` exists for
   * a dock/charger anywhere in this platform's API. */
  businessImpact: string | null;
  scoredAt: string | null;
}

function deriveDockAssetId(stationId: string, dockId: string): string | null {
  const stationDigits = stationId.match(/(\d+)/)?.[1];
  const dockDigits = dockId.match(/(\d+)/)?.[1];
  if (!stationDigits || !dockDigits) return null;
  return `QIS-${stationDigits.padStart(3, "0")}-${dockDigits.padStart(2, "0")}`;
}

export interface ChargerDetailData {
  charger: ChargerRow;
  station: StationRow | null;
  /** The dock's own AI scoring, cross-referenced via `deriveDockAssetId` —
   * null if the derived id has no match (naming assumption didn't hold). */
  dockRisk: DockRiskView | null;
  /** Recent daily telemetry for that same dock, when the cross-reference
   * above resolved. */
  telemetry: AssetTelemetryPointView[];
}

/**
 * There is no GET /chargers/{id} either, so — same approach as station
 * detail — this is assembled from the charger list plus the station list.
 *
 * `charger_id` is NOT unique across the fleet — the service reuses a small
 * pool (CHG01..CHG15, one per dock position) at every station, so "CHG12"
 * alone matches ~26 different chargers. `stationId` disambiguates; every
 * internal link passes it. Without it, the first match is used and the
 * result is unreliable — callers should always supply it when known.
 */
export function getChargerDetail(chargerId: string, stationId?: string): Promise<Loaded<ChargerDetailData>> {
  return load(async () => {
    const [chargers, stations] = await Promise.all([fetchChargers(), fetchStations().catch(() => [])]);
    const match = chargers.find(
      (c) =>
        c.charger_id.toLowerCase() === chargerId.toLowerCase() &&
        (!stationId || c.station_id.toLowerCase() === stationId.toLowerCase()),
    );
    if (!match) {
      throw new ApiUnavailableError(
        stationId ? `Charger ${chargerId} was not found at station ${stationId}` : `Charger ${chargerId} was not found`,
        404,
      );
    }

    const charger = normaliseCharger(match);
    const stationMatch = stations.find((s) => s.station_id.toLowerCase() === charger.stationId.toLowerCase());

    const dockAssetId = deriveDockAssetId(charger.stationId, charger.dockId);
    let dockRisk: DockRiskView | null = null;
    let telemetry: AssetTelemetryPointView[] = [];
    if (dockAssetId) {
      const [assets, riskItems, telemetryPoints] = await Promise.all([
        fetchAssets().catch(() => []),
        fetchOperationsRisk().catch(() => []),
        fetchAssetTelemetry(dockAssetId, 14).catch(() => []),
      ]);
      const asset = assets.find((a) => a.asset_id === dockAssetId);
      const riskItem = riskItems.find((r) => r.asset_id === dockAssetId);
      if (asset) {
        dockRisk = {
          assetId: asset.asset_id,
          healthScore: asset.health_score,
          healthClassification: asset.health_classification,
          anomalyScore: asset.anomaly_score,
          anomalySeverity: asset.anomaly_severity,
          riskScore: asset.risk_score,
          riskCategory: asset.risk_category,
          priority: asset.priority,
          likelyIssue: asset.likely_issue,
          predictionWindow: asset.prediction_window,
          businessImpact: riskItem?.business_impact ?? null,
          scoredAt: riskItem?.scored_at ?? null,
        };
      }
      telemetry = normaliseAssetTelemetry(telemetryPoints);
    }

    return {
      charger,
      station: stationMatch ? normaliseStation(stationMatch) : null,
      dockRisk,
      telemetry,
    };
  });
}

export interface HeaderAlert {
  key: string;
  title: string;
  entityLabel: string;
  stationId: string;
  severity: string;
  tone: AlertTone;
  timestamp: string;
  href: string | null;
}

export interface HeaderContext {
  locations: { stationId: string; label: string; online: boolean }[];
  /** Count of unacknowledged high-severity alerts, for the bell badge. */
  alertCount: number;
  /** The most recent alerts, shown in the bell dropdown. */
  alerts: HeaderAlert[];
  /** Timestamp of the freshest data the platform returned. */
  dataAsOf: string | null;
}

/**
 * Everything the page header needs, from the live service. Each piece degrades
 * on its own — a station-list failure should not blank the alert badge.
 */
export async function getHeaderContext(): Promise<HeaderContext> {
  if (!apiBaseUrl()) return { locations: [], alertCount: 0, alerts: [], dataAsOf: null };

  const [stations, commandCenter] = await Promise.all([
    fetchStations().catch(() => []),
    fetchCommandCenter().catch(() => null),
  ]);

  const alerts = commandCenter?.top_critical_alerts ?? [];
  const timestamps = alerts
    .map((a) => a.timestamp)
    .filter(Boolean)
    .sort();

  return {
    locations: stations.map((s) => ({
      stationId: s.station_id,
      label: s.name ?? s.location ?? s.station_id,
      online: s.online,
    })),
    alertCount: alerts.filter((a) => /CRITICAL|HIGH/i.test(a.severity)).length,
    alerts: alerts.slice(0, 6).map(normaliseAlert),
    dataAsOf: timestamps.length > 0 ? timestamps[timestamps.length - 1] : null,
  };
}

/** GET /assets — the dock register, fully scored (health/anomaly/risk). */
export function getAssetsPage(): Promise<Loaded<AssetRow[]>> {
  return load(async () => (await fetchAssets()).map(normaliseAsset));
}

/**
 * GET /operations/predictive-warnings, unfiltered — spans every asset type
 * (BATTERY/STATION/DOCK/CHARGER), ~4,000 rows on this fleet. This is the
 * platform's real predictive-risk register, backing the AI Predictions page.
 */
export function getPredictiveWarningsPage(): Promise<Loaded<PredictiveWarningRow[]>> {
  return load(async () => (await fetchPredictiveWarnings()).map(normalisePredictiveWarning));
}

export type AlertRow = DashboardAlert;

/** GET /operations/alerts — the real alert feed backing the Alerts page. */
export function getOperationsAlertsPage(limit = 200): Promise<Loaded<AlertRow[]>> {
  return load(async () => (await fetchOperationsAlerts(limit)).map(normaliseAlert));
}

/**
 * GET /assets/{id}/telemetry — daily dock-level aggregates. This is the only
 * telemetry-history endpoint the platform exposes; there is no per-battery or
 * per-charger equivalent, so callers resolve to a dock asset id first.
 */
export function getAssetTelemetryPoints(assetId: string, days = 14): Promise<Loaded<AssetTelemetryPointView[]>> {
  return load(async () => normaliseAssetTelemetry(await fetchAssetTelemetry(assetId, days)));
}

export interface DemoContext {
  datasets: { code: string; label: string }[];
  scenarios: { code: string; label: string }[];
  assets: { assetId: string; label: string }[];
}

/** Options for the Demo Controls panel. Each list degrades on its own so one
 * failing lookup does not take the whole panel down. */
export async function getDemoContext(): Promise<Loaded<DemoContext>> {
  return load(async () => {
    const [datasets, scenarios, assets] = await Promise.all([
      fetchDemoDatasets().catch(() => []),
      fetchDemoScenarios().catch(() => []),
      fetchAssets().catch(() => []),
    ]);

    return {
      datasets: datasets.map((d) => ({
        code: d.name,
        label: d.name.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      })),
      scenarios: scenarios.map((s) => ({ code: s.code, label: s.label })),
      assets: assets.map((a) => ({
        assetId: a.asset_id,
        label: `${a.asset_id} — ${a.health_classification.toLowerCase().replace(/_/g, " ")}, risk ${Math.round(a.risk_score)}%`,
      })),
    };
  });
}
