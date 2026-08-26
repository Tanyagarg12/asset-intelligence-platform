"use client";

import Link from "next/link";
import { DataTable, type Column, type FilterOption } from "@/components/ui/DataTable";
import { HealthBar } from "@/components/ui/HealthBar";
import { RiskPill } from "@/components/ui/RiskPill";
import type { AssetRow } from "@/lib/api/normalise";

const RISK_ORDER = ["CRITICAL", "HIGH", "MODERATE", "LOW"];

export function AssetsRiskTable({ rows }: { rows: AssetRow[] }) {
  const riskOptions: FilterOption[] = RISK_ORDER.map((category) => ({
    value: category,
    label: category.charAt(0) + category.slice(1).toLowerCase(),
    count: rows.filter((r) => r.riskCategory === category).length,
  })).filter((opt) => opt.count > 0);

  const columns: Column<AssetRow>[] = [
    {
      key: "assetId",
      header: "Dock",
      sortValue: (r) => r.assetId,
      render: (r) => <span className="font-medium text-text-primary">{r.assetId}</span>,
    },
    {
      key: "station",
      header: "Station",
      sortValue: (r) => r.stationId,
      render: (r) => (
        <Link href={`/stations/${r.stationId}`} className="text-[var(--series-1)] hover:underline">
          {r.stationId}
        </Link>
      ),
    },
    { key: "location", header: "Location", sortValue: (r) => r.location, render: (r) => r.location },
    {
      key: "health",
      header: "Health",
      sortValue: (r) => r.healthScore,
      render: (r) => <HealthBar score={r.healthScore} />,
    },
    {
      key: "anomaly",
      header: "Anomaly",
      align: "right",
      sortValue: (r) => r.anomalyScore,
      render: (r) => <span className="tabular-nums">{Math.round(r.anomalyScore)}</span>,
    },
    {
      key: "risk",
      header: "Predictive Risk",
      sortValue: (r) => r.riskScore,
      render: (r) => <RiskPill percent={r.riskScore} category={r.riskCategoryRaw} showCategory />,
    },
    { key: "issue", header: "Likely Issue", sortValue: (r) => r.likelyIssue, render: (r) => r.likelyIssue },
    {
      key: "priority",
      header: "Priority",
      sortValue: (r) => r.priority,
      render: (r) => <span className="font-semibold text-text-primary">{r.priority}</span>,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.assetId}
      searchFields={(r) => [r.assetId, r.stationId, r.location, r.likelyIssue]}
      searchPlaceholder="Search dock, station or location…"
      filters={{
        options: riskOptions,
        predicate: (r, value) => r.riskCategory === value,
      }}
      initialSort={{ key: "risk", direction: "desc" }}
      pageSize={15}
      emptyMessage="No docks match this filter."
    />
  );
}
