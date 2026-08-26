// Chat sharing.
//
// There is no backend store for conversations (the dashboard only reads the
// platform's own scoring data), so a "share link" cannot be a short opaque id
// looked up in a database — there is nowhere to put it. Instead the whole
// conversation is encoded straight into the URL's hash fragment, which:
//   - never leaves the browser (fragments are not sent to any server, so
//     nothing about the chat passes through Vercel's logs or the platform),
//   - needs no login or expiry — the recipient's browser decodes it locally,
//   - works from any device, since the link is fully self-contained.
// The trade-off is link length: a long conversation makes a long URL. That is
// an acceptable trade for a POC with no database, and is called out to the
// user rather than left implicit.

import type { ChatMessage } from "./types";

export interface SharedConversation {
  title: string;
  sharedAt: number;
  messages: ChatMessage[];
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeSharedConversation(conversation: SharedConversation): string {
  return toBase64Url(JSON.stringify(conversation));
}

export function decodeSharedConversation(encoded: string): SharedConversation | null {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(encoded));
    if (
      parsed &&
      typeof parsed === "object" &&
      "messages" in parsed &&
      Array.isArray((parsed as SharedConversation).messages)
    ) {
      return parsed as SharedConversation;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(conversation: SharedConversation): string {
  const encoded = encodeSharedConversation(conversation);
  return `${window.location.origin}/shared-chat#${encoded}`;
}
