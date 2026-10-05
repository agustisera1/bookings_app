"use client";

import { useParams } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { ConversationItem } from "./conversation-item";
import type { ConversationRow as Conversation } from "./types";

// Client only for the active row, read off the route: the URL selects the conversation.
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
        description="Every booking opens a thread with the other party. Once you book a stay or receive a request, it shows up here."
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
