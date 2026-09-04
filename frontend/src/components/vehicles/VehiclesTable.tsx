"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { HealthBar } from "@/components/ui/HealthBar";
import { RiskPill } from "@/components/ui/RiskPill";
import type { DummyVehicleRow } from "@/lib/dummy/vehicles";

// Same column set as Batteries/Stations/Chargers — Condition/Health Score/
// Anomaly/Risk/Priority/Likely Issue. Demo data — see lib/dummy/vehicles.ts.
const CLASSIFICATION_TONE: Record<string, string> = {
  HEALTHY: "var(--status-good)",
  WATCH: "var(--status-warning)",
  AT_RISK: "var(--status-serious)",
  CRITICAL: "var(--status-critical)",
};

function classificationLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const BAND_MEMBERS: Record<string, string[]> = {
  HEALTHY: ["HEALTHY"],
  WARNING: ["WATCH", "AT_RISK"],
  CRITICAL: ["CRITICAL"],
};

function bandOf(classification: string): string | null {
  const value = classification.toUpperCase();
  const entry = Object.entries(BAND_MEMBERS).find(([, members]) => members.includes(value));
  return entry ? entry[0] : null;
}

export function VehiclesTable({ rows }: { rows: DummyVehicleRow[] }) {
  const columns: Column<DummyVehicleRow>[] = [
    {
      key: "vehicleId",
      header: "Vehicle ID",
      headerClassName: "w-[11%]",
      sortValue: (r) => r.vehicleId,
      render: (r) => (
        <Link
          href={`/vehicles/${r.vehicleId}`}
          className="font-medium text-[var(--series-1)] hover:underline"
        >
          {r.vehicleId}
        </Link>
      ),
    },
    {
      key: "classification",
      header: "Condition",
      headerClassName: "w-[11%]",
      sortValue: (r) => r.healthClassification,
      render: (r) => (
        <span
          className="font-medium"
          style={{ color: CLASSIFICATION_TONE[r.healthClassification.toUpperCase()] ?? "var(--text-secondary)" }}
        >
          {classificationLabel(r.healthClassification)}
        </span>
      ),
    },
    {
      key: "health",
      header: "Health Score",
      headerClassName: "w-[15%]",
      sortValue: (r) => r.healthScore,
      render: (r) => <HealthBar score={r.healthScore} />,
    },
    {
      key: "anomaly",
      header: "Anomaly",
      align: "right",
      headerClassName: "w-[9%]",
      sortValue: (r) => r.anomalyScore,
      render: (r) => (
        <span className="tabular-nums" title={r.anomalySeverity}>
          {Math.round(r.anomalyScore)}
        </span>
      ),
    },
    {
      key: "risk",
      header: "Risk",
      headerClassName: "w-[11%]",
      sortValue: (r) => r.riskScore,
      render: (r) => <RiskPill percent={r.riskScore} category={r.riskCategoryRaw} />,
    },
    {
      key: "priority",
      header: "Priority",
      headerClassName: "w-[9%]",
      sortValue: (r) => r.priority,
      render: (r) => <span className="tabular-nums text-text-secondary">{r.priority}</span>,
    },
    {
      key: "issue",
      header: "Likely Issue",
      headerClassName: "w-[34%]",
      sortValue: (r) => r.likelyIssue,
      render: (r) => (
        <span className="block max-w-[280px] truncate" title={r.likelyIssue}>
          {r.likelyIssue}
        </span>
      ),
    },
  ];

  const countOf = (band: string) => rows.filter((r) => bandOf(r.healthClassification) === band).length;

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.vehicleId}
      rowHref={(r) => `/vehicles/${r.vehicleId}`}
      searchFields={(r) => [r.vehicleId, r.registration, r.model, r.likelyIssue, r.riskCategoryRaw, r.priority]}
      searchPlaceholder="Search vehicle, model or issue…"
      filters={{
        options: [
          { value: "HEALTHY", label: "Healthy", count: countOf("HEALTHY") },
          { value: "WARNING", label: "Warning", count: countOf("WARNING") },
          { value: "CRITICAL", label: "Critical", count: countOf("CRITICAL") },
        ],
        predicate: (r, value) => bandOf(r.healthClassification) === value,
      }}
      initialSort={{ key: "risk", direction: "desc" }}
      pageSize={15}
    />
  );
}
