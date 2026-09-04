import { FlaskConical } from "lucide-react";

/**
 * Flags an entire page (or section) as fabricated preview data rather than
 * something the live platform actually reports — used for /vehicles, which
 * has no real telemetry source yet. Keep this visible on every screen that
 * shows fabricated numbers; the moment a real endpoint backs it, delete the
 * banner along with the fabrication.
 */
export function DemoDataBanner({ message }: { message?: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-[var(--status-warning)] bg-[color-mix(in_srgb,var(--status-warning)_10%,transparent)] px-3.5 py-2.5 text-[12.5px] text-text-secondary">
      <FlaskConical size={15} className="mt-0.5 flex-none text-[var(--status-warning)]" />
      <span>
        <span className="font-semibold text-text-primary">Demo data — not from the live platform.</span>{" "}
        {message ??
          "This platform has no vehicle-telemetry service yet. Every number on this page is fabricated for UI preview only."}
      </span>
    </div>
  );
}
