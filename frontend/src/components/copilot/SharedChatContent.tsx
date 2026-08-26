"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bot, MessageSquareShare } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { AnswerCard } from "@/components/copilot/AnswerCard";
import { decodeSharedConversation, type SharedConversation } from "@/lib/copilot/share";

function sharedDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function readFromHash(): SharedConversation | null {
  const hash = window.location.hash.slice(1);
  return hash ? decodeSharedConversation(hash) : null;
}

/**
 * The actual conversation only exists in the URL's hash fragment, which never
 * reaches the server (see lib/copilot/share.ts) — so this component is loaded
 * client-only (`ssr: false` at the import site) rather than server-rendered.
 * That sidesteps both a hydration mismatch and a "setState in an effect" —
 * there is no server render of this component to reconcile against; its one
 * and only render already happens in the browser.
 */
export function SharedChatContent() {
  const [conversation] = useState<SharedConversation | null>(readFromHash);

  if (conversation === null) {
    return (
      <Panel>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <AlertTriangle size={22} className="text-[var(--status-warning)]" />
          <p className="text-[13px] font-medium text-text-primary">This share link is invalid.</p>
          <p className="max-w-sm text-[12.5px] text-text-muted">
            The link may be incomplete, or the conversation it points to could not be read from it.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <>
      <Panel>
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--series-1)] text-white">
            <MessageSquareShare size={17} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold text-text-primary">{conversation.title}</div>
            <div className="text-[11.5px] text-text-muted">
              Shared {sharedDateLabel(conversation.sharedAt)} · read-only
            </div>
          </div>
        </div>
      </Panel>

      <Panel bodyClassName="space-y-3">
        {conversation.messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--series-1)] px-3.5 py-2 text-[12.5px] leading-relaxed text-white">
                {message.text}
              </p>
            </div>
          ) : (
            <div
              key={message.id}
              className="rounded-2xl rounded-bl-sm border border-[var(--border-hairline)] bg-[var(--surface-2)]/60 px-3.5 py-3"
            >
              {message.answer ? <AnswerCard answer={message.answer} /> : message.text}
            </div>
          ),
        )}
      </Panel>

      <p className="flex items-center justify-center gap-1.5 text-[12px] text-text-muted">
        <Bot size={14} />
        Ask your own questions with the{" "}
        <Link href="/" className="font-medium text-[var(--series-1)] hover:underline">
          AI Operations Copilot
        </Link>
        .
      </p>
    </>
  );
}
