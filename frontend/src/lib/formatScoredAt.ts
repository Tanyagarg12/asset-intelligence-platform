/** Formats a `scored_at` ISO timestamp the same way on every AI Insight
 * panel (battery, station, charger) — falls back to the raw string if it
 * doesn't parse rather than showing "Invalid Date". */
export function formatScoredAt(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
