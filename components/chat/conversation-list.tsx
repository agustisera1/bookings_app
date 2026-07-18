"use client";

import { useParams } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { ConversationItem } from "./conversation-item";
import type { Conversation } from "@/lib/types/chat";

/**
 * The messages rail. Client-side only for the active-row highlight, which it
 * reads off the route rather than holding as state — the URL is what selects a
 * conversation, so nothing here needs to be lifted or synced.
 */
export function ConversationList({
  conversations,
}: {
  conversations: Conversation[];
}) {
  const params = useParams<{ bookingId?: string }>();

  if (conversations.length === 0) {
    return (
      <EmptyState
        className="py-16"
        icon={<MessagesSquare />}
        title="No conversations yet"
        description="Every booking opens a thread with the other party. Once you book a stay — or receive a request — it shows up here."
      />
    );
  }

  return (
    <nav aria-label="Conversations" className="flex flex-col gap-1 p-2">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          active={params?.bookingId === conversation.id}
        />
      ))}
    </nav>
  );
}
