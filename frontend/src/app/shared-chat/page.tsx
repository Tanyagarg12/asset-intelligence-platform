import { PageShell } from "@/components/layout/PageShell";
import { SharedChatLoader } from "@/components/copilot/SharedChatLoader";

export default function SharedChatPage() {
  return (
    <PageShell title="Shared Conversation" subtitle="Read-only copy of an AI Operations Copilot chat">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <SharedChatLoader />
      </div>
    </PageShell>
  );
}
