"use client";

import dynamic from "next/dynamic";
import { Panel } from "@/components/ui/Panel";

// `dynamic(..., { ssr: false })` must be called from a Client Component in
// this Next.js version — this file exists only to hold that call, so the
// route's page.tsx can stay a plain Server Component.
const SharedChatContent = dynamic(
  () => import("./SharedChatContent").then((m) => m.SharedChatContent),
  {
    ssr: false,
    loading: () => (
      <Panel>
        <p className="py-10 text-center text-[13px] text-text-muted">Reading the shared chat…</p>
      </Panel>
    ),
  },
);

export function SharedChatLoader() {
  return <SharedChatContent />;
}
