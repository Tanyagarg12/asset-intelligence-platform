// POC-08 copilot router.
//
// Decides which tool answers a question, runs it, and returns the structured
// result. Nothing here computes risk — that is the service's job (spec 12.1).
// If no intent matches, it says so rather than guessing (guardrail 12.3).
//
// Runs server-side only: the tools call the API with the server-side base URL.

import { apiBaseUrl } from "@/lib/api/client";
import type { BatteryDetailView } from "@/lib/api/normalise";
import {
  loadBatteryDetail,
  loadSnapshot,
  toolAmbiguousCharger,
  toolAttentionToday,
  toolCompare,
  toolDeteriorating,
  toolEngineerChecks,
  toolExplainBattery,
  toolExplainCharger,
  toolExplainStation,
  toolOperationalSummary,
  toolRecentChanges,
  toolTopStations,
  toolTrendSearch,
  type FleetSnapshot,
} from "./apiTools";
import type { CopilotAnswer, Intent, ToolResult } from "./types";

interface Entities {
  batteryIds: string[];
  stationIds: string[];
  dockIds: string[];
  chargerIds: string[];
  legacyNotes: string[];
  count: number | null;
}

/**
 * Identifier shapes in this fleet: BAT001, QIS001, QIS-001-01, CHG001 — but
 * how many digits each type is zero-padded to is a dataset detail, not
 * something to hardcode: this platform has shipped 3-digit batteries
 * (BAT001) and 5-digit batteries (BAT02153) from different demo datasets,
 * and 3-digit vs 2-digit chargers likewise. So the digit run is captured
 * exactly as typed, with no reformatting — `normalizeId` (below) is what
 * makes a typed id match the platform's real one regardless of padding.
 */
function extractEntities(question: string): Entities {
  const e: Entities = {
    batteryIds: [],
    stationIds: [],
    dockIds: [],
    chargerIds: [],
    legacyNotes: [],
    count: null,
  };

  for (const m of question.matchAll(/\bBAT[-\s]?(\d{1,6})\b/gi)) {
    e.batteryIds.push(`BAT${m[1]}`);
  }
  // Dock ids look like QIS-001-01; check them before the plain station form.
  for (const m of question.matchAll(/\bQIS[-\s]?(\d{3})[-\s](\d{1,2})\b/gi)) {
    e.dockIds.push(`QIS-${m[1]}-${m[2].padStart(2, "0")}`);
  }
  for (const m of question.matchAll(/\bQIS[-\s]?(\d{1,6})\b(?![-\s]\d)/gi)) {
    const raw = m[1];
    // The requirements document's worked example (QIS-128) is not in this fleet.
    if (raw.length <= 3 && Number(raw) > 60) {
      e.legacyNotes.push(
        `QIS-${raw} is the example from the requirements document and is not an identifier in this fleet — stations are QIS001, docks QIS-001-01, batteries BAT001.`,
      );
    } else {
      e.stationIds.push(`QIS${raw}`);
    }
  }
  for (const m of question.matchAll(/\bCHG[-\s]?(\d{1,6})\b/gi)) {
    e.chargerIds.push(`CHG${m[1]}`);
  }

  const count = question.match(/\btop\s*(\d{1,3})\b/i);
  if (count) e.count = Math.min(50, Math.max(1, Number(count[1])));

  e.batteryIds = [...new Set(e.batteryIds)];
  e.stationIds = [...new Set(e.stationIds)];
  return e;
}

/** Makes "BAT02153", "bat2153" and "BAT-2153" compare equal, so a typed id
 * matches the platform's real one regardless of how many digits it is
 * zero-padded to. The real, exactly-padded id (from the live snapshot) is
 * always what gets used for API calls and links — this is only for matching. */
function normalizeId(id: string): string {
  const m = id.match(/^([A-Za-z]+)-?0*(\d+)$/);
  return m ? `${m[1].toUpperCase()}${m[2]}` : id.toUpperCase();
}

const TREND_PATTERNS: [RegExp, string][] = [
  [/charg(?:ing|e)?\s*(?:time|duration)|longer to charge|slow(?:er)? charg/i, "charging"],
  [/temperat|thermal|hot|heat|overheat/i, "temperature"],
  [/current|electrical/i, "current"],
  [/cell (?:imbalance|voltage|balance)|imbalanc/i, "cell"],
  [/capacit|efficien|state of health|\bsoh\b|degradation/i, "capacity"],
  [/connectivity|communicat|telemetry|offline|dropout/i, "connectivity"],
  [/swap|\bbms\b|throughput/i, "swap"],
];

function detectTrend(question: string): string | null {
  for (const [pattern, key] of TREND_PATTERNS) {
    if (pattern.test(question)) return key;
  }
  return null;
}

function capabilities(): ToolResult {
  return {
    tool: "capabilities",
    headline: "I answer questions about this fleet from its live monitoring data.",
    bullets: [
      "Which assets need attention today, or which are deteriorating",
      'Why a pack is at risk — e.g. "Why is BAT001 at risk?"',
      "What the field engineer should check on a given pack",
      "The top critical stations, or a station's status",
      "Which assets show a signal — charging time, temperature, current, cell imbalance, capacity",
      "Today's operational summary, or a comparison of two packs",
    ],
    evidence: [
      { label: "Scope", value: "this platform's monitoring data only — no external sources" },
      { label: "Identifiers", value: "batteries BAT001, stations QIS001, docks QIS-001-01, chargers CHG001" },
    ],
    caveat:
      "Every number I quote comes from the platform's own health, anomaly and risk scoring. If the data does not support an answer, I say so rather than estimating.",
    links: [],
  };
}

/** Legacy notes are prepended once by `wrap`, so they are not added here too. */
function unknown(unresolved: string[]): ToolResult {
  const base = capabilities();
  const bullets = [...base.bullets];
  if (unresolved.length > 0) {
    bullets.unshift(`I could not find ${unresolved.join(", ")} in this fleet, so I have not guessed at it.`);
  }
  return {
    ...base,
    headline: "I could not map that to something I can answer from the platform data.",
    bullets,
  };
}

/** The chat panel is operator-facing, so failures are described in plain terms
 * — the underlying reason is logged for developers, not shown here. */
function serviceUnavailable(reason: string): ToolResult {
  console.warn("[copilot] platform unreachable:", reason);
  return {
    tool: "unavailable",
    headline: "I cannot reach the monitoring platform right now, so I have no data to answer from.",
    bullets: [
      "This is a connection problem, not a finding about the fleet.",
      "Try again in a moment — if it persists, the platform service needs attention.",
    ],
    evidence: [],
    links: [],
    caveat: "I will not answer from stale or synthetic data while the service is unreachable.",
  };
}

/** Route a question to a tool and return the structured answer. */
export async function answerQuestion(question: string): Promise<CopilotAnswer> {
  const q = question.trim();
  const entities = extractEntities(q);

  const wrap = (intent: Intent, result: ToolResult): CopilotAnswer => ({
    ...result,
    bullets: entities.legacyNotes.length ? [...entities.legacyNotes, ...result.bullets] : result.bullets,
    intent,
  });

  if (!q) return wrap("capabilities", capabilities());
  if (/^(help|what can you do|capabilit|hi|hello|hey)\b/i.test(q)) {
    return wrap("capabilities", capabilities());
  }

  if (!apiBaseUrl()) {
    return wrap("unavailable", serviceUnavailable("The monitoring service address is not configured."));
  }

  let snap: FleetSnapshot;
  try {
    snap = await loadSnapshot();
  } catch (error) {
    return wrap("unavailable", serviceUnavailable(error instanceof Error ? error.message : String(error)));
  }

  // Resolve any named batteries against the live fleet first — the platform's
  // GET /batteries/{id} needs the real, exactly-padded id (a normalized guess
  // like "BAT2153" 404s against the real "BAT02153"), so the typed id is
  // matched against the snapshot's real ids before it is ever sent as a call.
  const details: BatteryDetailView[] = [];
  const unresolved: string[] = [];
  for (const typedId of entities.batteryIds.slice(0, 2)) {
    const real = snap.batteries.find((b) => normalizeId(b.batteryId) === normalizeId(typedId));
    if (!real) {
      unresolved.push(typedId);
      continue;
    }
    const detail = await loadBatteryDetail(real.batteryId);
    if (detail) details.push(detail);
    else unresolved.push(typedId);
  }
  const primary = details[0] ?? null;

  // Compare needs two assets, so it is tested before the single-asset intents.
  if (/\b(compare|versus|vs\.?|difference between)\b/i.test(q) && details.length >= 2) {
    return wrap("compare_assets", toolCompare(details[0], details[1]));
  }

  if (/\bchang(?:ed|e|ing)\b/i.test(q) || /\bover the last\b/i.test(q) || /\blast \d+ days?\b/i.test(q)) {
    return wrap("recent_changes", toolRecentChanges(primary));
  }

  if (/\b(?:check\w*|inspect\w*|diagnos\w*|field engineer|technician|do about|fix)\b/i.test(q)) {
    return wrap("engineer_checks", toolEngineerChecks(primary, snap));
  }

  if (/\bwhy\b/i.test(q) && primary) {
    return wrap("explain_risk", toolExplainBattery(primary));
  }

  // A single named charger or station, asked about directly — show that one
  // asset's own detail (same facts as its page) rather than a fleet-wide list.
  if (entities.chargerIds.length === 1 && !/\btop\b/i.test(q)) {
    const chargerId = entities.chargerIds[0];
    // charger_id repeats at every station (CHG01..CHG15 reused fleet-wide),
    // so a station named in the same question disambiguates which one.
    const candidates = snap.chargers.filter((c) => normalizeId(c.chargerId) === normalizeId(chargerId));
    const namedStationId = entities.stationIds[0];
    const charger = namedStationId
      ? candidates.find((c) => normalizeId(c.stationId) === normalizeId(namedStationId))
      : candidates.length === 1
        ? candidates[0]
        : undefined;

    if (charger) {
      const station = snap.stations.find((s) => normalizeId(s.stationId) === normalizeId(charger.stationId));
      return wrap("asset_lookup", toolExplainCharger(charger, station));
    }
    if (candidates.length > 1) {
      return wrap("asset_lookup", toolAmbiguousCharger(chargerId, candidates));
    }
    unresolved.push(chargerId);
  }

  if (entities.stationIds.length === 1 && !/\b(top|worst|most critical|highest)\b/i.test(q)) {
    const stationId = entities.stationIds[0];
    const station = snap.stations.find((s) => normalizeId(s.stationId) === normalizeId(stationId));
    if (station) return wrap("asset_lookup", toolExplainStation(station));
    unresolved.push(stationId);
  }

  if (/\b(?:top|worst|most critical|highest)\b/i.test(q) && /\bstation/i.test(q)) {
    return wrap("top_critical_stations", toolTopStations(snap, entities.count ?? 5));
  }

  if (/\b(?:summar\w*|overview|how are we|fleet status|status of the fleet)\b/i.test(q)) {
    return wrap("operational_summary", toolOperationalSummary(snap));
  }

  if (/\b(?:deteriorat\w*|degrad\w*|getting worse|worsening|trending down|abnormal)\b/i.test(q)) {
    return wrap("deteriorating", toolDeteriorating(snap, entities.count ?? 8));
  }

  if (/\b(?:attention|today|urgent|priorit\w*|need(?:s|ing)?\s+(?:action|attention)|act on)\b/i.test(q)) {
    return wrap("attention_today", toolAttentionToday(snap, entities.count ?? 6));
  }

  const trend = detectTrend(q);
  if (trend && /\b(which|show|list|any|assets|batteries|packs|increasing|rising|growing|declin)\b/i.test(q)) {
    return wrap("trend_search", toolTrendSearch(snap, trend, entities.count ?? 8));
  }

  if (primary) return wrap("explain_risk", toolExplainBattery(primary));
  // More than one station named (e.g. a comparison-style question the compare
  // branch didn't catch) — rank just the mentioned ones rather than the whole
  // fleet. A single named-but-not-found station already went to `unresolved`
  // above and falls through to `unknown` below instead of dumping everything.
  if (entities.stationIds.length > 1) {
    const named = snap.stations.filter((s) =>
      entities.stationIds.some((id) => normalizeId(id) === normalizeId(s.stationId)),
    );
    if (named.length > 0) {
      return wrap("top_critical_stations", toolTopStations({ ...snap, stations: named }, named.length));
    }
  }
  if (trend) return wrap("trend_search", toolTrendSearch(snap, trend, entities.count ?? 8));

  return wrap("unknown", unknown(unresolved));
}
