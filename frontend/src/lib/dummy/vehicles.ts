// PLACEHOLDER DATA — the live platform has no vehicle/fleet-telematics API
// yet (it only scores batteries, docks/assets, chargers and stations). Every
// value in this file is fabricated for UI preview only and must never be
// presented as real. Both /vehicles pages carry a visible "Demo data" notice
// for exactly this reason.
//
// Once a real vehicle-telemetry service exists, delete this file and wire
// /vehicles the same way every other entity in this app is wired: an
// endpoint in api/endpoints.ts, a fetch in api/client.ts, a normaliser in
// api/normalise.ts, and a loader in api/resources.ts that degrades honestly
// instead of falling back to fiction.

export interface DummyVehicleDimension {
  key: string;
  label: string;
  score: number;
}

export interface DummyVehicleTelemetryPoint {
  date: string;
  batteryTemp: number;
  avgSpeed: number;
  distanceKm: number;
  efficiency: number;
  alertCount: number;
}

export interface DummyVehicleRow {
  vehicleId: string;
  model: string;
  registration: string;
  stationId: string;
  batteryId: string;
  driver: string;
  odometerKm: number;
  online: boolean;
  healthScore: number;
  healthClassification: string;
  anomalyScore: number;
  anomalySeverity: string;
  riskScore: number;
  riskCategoryRaw: string;
  priority: string;
  likelyIssue: string;
}

export interface DummyVehicleDetail extends DummyVehicleRow {
  predictionWindow: string;
  scoredAt: string;
  dimensions: DummyVehicleDimension[];
  detectedSignals: string[];
  sla: string;
  businessImpact: string;
  suggestedChecks: string[];
  riskNote: string;
  telemetry: DummyVehicleTelemetryPoint[];
}

/** Deterministic per-vehicle PRNG so the same vehicle shows the same numbers
 * on the list page, the detail page, and every reload — a fabricated number
 * that changed on every request would be even more obviously wrong than one
 * that's merely fabricated. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

type Classification = "HEALTHY" | "WATCH" | "AT_RISK" | "CRITICAL";

const MODELS = ["SUN E-3W CargoLite", "SUN E-2W Swift", "SUN E-3W Passenger", "SUN E-4W Van"];
const DRIVERS = ["R. Kumar", "A. Sharma", "S. Reddy", "P. Singh", "M. Iyer", "N. Das", "V. Nair", "K. Joshi"];
const STATIONS = ["QIS001", "QIS002", "QIS003", "QIS005", "QIS008", "QIS011", "QIS014", "QIS018"];
const ISSUES: Record<Classification, string> = {
  HEALTHY: "No significant risk identified",
  WATCH: "Minor drivetrain vibration trending upward",
  AT_RISK: "Battery discharge rate degrading faster than fleet baseline",
  CRITICAL: "Motor temperature repeatedly exceeding safe threshold",
};
const SIGNALS: Record<Classification, string[]> = {
  HEALTHY: [],
  WATCH: ["Slight increase in average cabin/motor temperature over 7 days"],
  AT_RISK: [
    "Distance-per-charge down 12% versus this vehicle's 30-day baseline",
    "Two unscheduled stops logged in the last 5 days",
  ],
  CRITICAL: [
    "Motor temperature breached critical threshold 3 times in 48 hours",
    "Braking response latency above safe limit on last inspection",
    "Battery swap interval shortened by 40% versus baseline",
  ],
};

const VEHICLE_COUNT = 14;

function classificationFor(rand: () => number): Classification {
  const r = rand();
  if (r < 0.55) return "HEALTHY";
  if (r < 0.78) return "WATCH";
  if (r < 0.93) return "AT_RISK";
  return "CRITICAL";
}

function buildRow(index: number): DummyVehicleRow {
  const vehicleId = `VEH-${String(index + 1).padStart(3, "0")}`;
  const rand = seededRandom(vehicleId);
  const classification = classificationFor(rand);
  const healthScore =
    classification === "HEALTHY"
      ? Math.round(78 + rand() * 20)
      : classification === "WATCH"
        ? Math.round(58 + rand() * 18)
        : classification === "AT_RISK"
          ? Math.round(35 + rand() * 20)
          : Math.round(10 + rand() * 22);
  const riskScore = Math.max(2, Math.min(98, Math.round(100 - healthScore + (rand() * 10 - 5))));
  const riskCategoryRaw = riskScore >= 81 ? "CRITICAL" : riskScore >= 61 ? "HIGH" : riskScore >= 31 ? "MODERATE" : "LOW";
  const priority = riskCategoryRaw === "CRITICAL" ? "P1" : riskCategoryRaw === "HIGH" ? "P2" : riskCategoryRaw === "MODERATE" ? "P3" : "P4";

  return {
    vehicleId,
    model: MODELS[index % MODELS.length],
    registration: `KA-${String(1 + (index % 60)).padStart(2, "0")}-${String.fromCharCode(65 + (index % 26))}${String.fromCharCode(65 + ((index * 3) % 26))}-${1000 + index * 37}`,
    stationId: STATIONS[index % STATIONS.length],
    batteryId: `BAT${String(9000 + index * 17).padStart(5, "0")}`,
    driver: DRIVERS[index % DRIVERS.length],
    odometerKm: Math.round(4200 + rand() * 38000),
    online: rand() > 0.12,
    healthScore,
    healthClassification: classification,
    anomalyScore: Math.round(rand() * (classification === "CRITICAL" ? 40 : 20) + (classification === "CRITICAL" ? 60 : classification === "AT_RISK" ? 35 : 0)),
    anomalySeverity: classification === "CRITICAL" ? "CRITICAL" : classification === "AT_RISK" ? "MODERATE" : "LOW",
    riskScore,
    riskCategoryRaw,
    priority,
    likelyIssue: ISSUES[classification],
  };
}

let cachedRows: DummyVehicleRow[] | null = null;

/** Demo-only vehicle register — see file header. Stable across calls within
 * a process (the PRNG is seeded per vehicle, not per call). */
export function getDummyVehicles(): DummyVehicleRow[] {
  if (!cachedRows) {
    cachedRows = Array.from({ length: VEHICLE_COUNT }, (_, i) => buildRow(i));
  }
  return cachedRows;
}

export function getDummyVehicleDetail(vehicleId: string): DummyVehicleDetail | null {
  const row = getDummyVehicles().find((v) => v.vehicleId.toLowerCase() === vehicleId.toLowerCase());
  if (!row) return null;

  const rand = seededRandom(`${row.vehicleId}-detail`);
  const classification = row.healthClassification as Classification;

  const dimensions: DummyVehicleDimension[] = [
    { key: "battery_health", label: "Battery Health", score: Math.round(row.healthScore + (rand() * 10 - 5)) },
    { key: "motor_condition", label: "Motor Condition", score: Math.round(row.healthScore + (rand() * 14 - 7)) },
    { key: "braking_system", label: "Braking System", score: Math.round(row.healthScore + (rand() * 10 - 5)) },
    { key: "tyre_condition", label: "Tyre Condition", score: Math.round(row.healthScore + (rand() * 16 - 8)) },
    { key: "electrical_wiring", label: "Electrical & Wiring", score: Math.round(row.healthScore + (rand() * 10 - 5)) },
  ].map((d) => ({ ...d, score: Math.max(2, Math.min(100, d.score)) }));

  const telemetry: DummyVehicleTelemetryPoint[] = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const drift = classification === "CRITICAL" ? i * 0.6 : classification === "AT_RISK" ? i * 0.3 : i * 0.05;
    return {
      date: date.toISOString().slice(0, 10),
      batteryTemp: Math.round((30 + rand() * 6 + drift) * 10) / 10,
      avgSpeed: Math.round((24 + rand() * 10 - drift * 0.5) * 10) / 10,
      distanceKm: Math.round(40 + rand() * 60 - drift),
      efficiency: Math.round((88 - drift + rand() * 5) * 10) / 10,
      alertCount: classification === "CRITICAL" ? Math.round(rand() * 3) + (i > 9 ? 1 : 0) : Math.round(rand() * (classification === "AT_RISK" ? 1.5 : 0.4)),
    };
  });

  const scoredAt = new Date();
  scoredAt.setHours(0, 0, 0, 0);

  return {
    ...row,
    predictionWindow:
      classification === "CRITICAL" ? "24-48 hours" : classification === "AT_RISK" ? "72 hours" : "No immediate risk - continue monitoring",
    scoredAt: scoredAt.toISOString(),
    dimensions,
    detectedSignals: SIGNALS[classification],
    sla: row.priority === "P1" ? "4 hours" : row.priority === "P2" ? "24 hours" : row.priority === "P3" ? "72 hours" : "Routine",
    businessImpact:
      classification === "CRITICAL"
        ? "Vehicle should be pulled from service until inspected"
        : classification === "AT_RISK"
          ? "Reduced range may affect route completion"
          : "None expected",
    suggestedChecks:
      classification === "HEALTHY"
        ? []
        : [
            "Inspect battery pack connections and thermal pads",
            "Check motor and controller temperature under load",
            "Verify brake pad wear and hydraulic pressure",
          ],
    riskNote:
      "Demo data — this vehicle's score is fabricated for UI preview, not derived from any live telemetry.",
    telemetry,
  };
}
