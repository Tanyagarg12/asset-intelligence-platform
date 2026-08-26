"use client";

import Link from "next/link";
import { AlertTriangle, TriangleAlert } from "lucide-react";
import { DataTable, type Column, type FilterOption } from "@/components/ui/DataTable";
import type { AlertTone } from "@/lib/api/normalise";
import type { AlertRow } from "@/lib/api/resources";

const TONE_STYLE: Record<AlertTone, { color: string; bg: string }> = {
  critical: { color: "var(--status-critical)", bg: "var(--status-critical-bg)" },
  serious: { color: "var(--status-serious)", bg: "var(--status-serious-bg)" },
  warning: { color: "var(--status-warning)", bg: "var(--status-warning-bg)" },
  neutral: { color: "var(--text-muted)", bg: "var(--surface-2)" },
};

const TONE_RANK: Record<AlertTone, number> = { critical: 4, serious: 3, warning: 2, neutral: 1 };

function severityLabel(severity: string): string {
  const s = severity.replace(/[_-]+/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function timeLabel(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;
  return parsed.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function AlertsTable({ alerts }: { alerts: AlertRow[] }) {
  const severityOptions: FilterOption[] = [...new Set(alerts.map((a) => a.severity))].map((severity) => ({
    value: severity,
    label: severityLabel(severity),
    count: alerts.filter((a) => a.severity === severity).length,
  }));

  const columns: Column<AlertRow>[] = [
    {
      key: "severity",
      header: "Severity",
      sortValue: (a) => TONE_RANK[a.tone],
      render: (a) => {
        const style = TONE_STYLE[a.tone];
        const Icon = a.tone === "critical" ? TriangleAlert : AlertTriangle;
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold"
            style={{ backgroundColor: style.bg, color: style.color }}
          >
            <Icon size={12} />
            {severityLabel(a.severity)}
          </span>
        );
      },
    },
    {
      key: "title",
      header: "Alert",
      sortValue: (a) => a.title,
      render: (a) => <span className="font-medium text-text-primary">{a.title}</span>,
    },
    {
      key: "asset",
      header: "Asset",
      sortValue: (a) => a.entityLabel,
      render: (a) =>
        a.href ? (
          <Link href={a.href} className="text-[var(--series-1)] hover:underline">
            {a.entityLabel}
          </Link>
        ) : (
          a.entityLabel
        ),
    },
    { key: "station", header: "Station", sortValue: (a) => a.stationId, render: (a) => a.stationId },
    {
      key: "raised",
      header: "Raised",
      align: "right",
      sortValue: (a) => new Date(a.timestamp).getTime() || 0,
      render: (a) => <span className="tabular-nums">{timeLabel(a.timestamp)}</span>,
    },
  ];

  return (
    <DataTable
      rows={alerts}
      columns={columns}
      rowKey={(a) => a.key}
      searchFields={(a) => [a.title, a.entityLabel, a.stationId, a.severity]}
      searchPlaceholder="Search alert, asset or station…"
      filters={{
        options: severityOptions,
        predicate: (a, value) => a.severity === value,
      }}
      initialSort={{ key: "raised", direction: "desc" }}
      pageSize={20}
      emptyMessage="No alerts match this filter."
    />
  );
}
