"use client";

import { useEffect } from "react";
import { markMessagesAsSeen } from "@/lib/services/chat";
import { useClearUnreadMessages } from "@/components/notifications/provider";

// Mounted in the layout so switching threads doesn't re-fire it: one visit, one reset.
export function MarkMessagesSeen() {
  const clearUnreadMessages = useClearUnreadMessages();

  useEffect(() => {
    clearUnreadMessages();
    void markMessagesAsSeen();
  }, [clearUnreadMessages]);

  return null;
}
