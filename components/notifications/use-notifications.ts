"use client";

import { use, useState } from "react";
import { toast } from "sonner";
import type { ServiceResult } from "@/lib/types";
import { markAsRead } from "@/lib/services/notifications";
import { useNotificationsActions } from "@/components/notifications/provider";
import { partitionByRead, type Notification } from "./notifications-model";

type NotificationsView =
  | { ok: false; error: string; onMarkAsRead: (id: string) => void }
  | {
      ok: true;
      unread: Notification[];
      older: Notification[];
      onMarkAsRead: (id: string) => void;
    };

// Unwraps the notifications promise and owns the optimistic read state; the
// split itself is pure (partitionByRead, in notifications-model).
export function useNotifications(
  notificationsPromise: Promise<ServiceResult<Notification[]>>,
): NotificationsView {
  // Ids marked read this session, overlaid on the server data so an optimistic
  // update survives re-renders without stale derived state.
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const { increment, decrement } = useNotificationsActions();
  const response = use(notificationsPromise);

  async function handleMarkAsRead(id: string) {
    setReadIds((prev) => new Set(prev).add(id)); // optimistic
    decrement(); // optimistic: drop the sidebar badge right away
    const result = await markAsRead(id);
    if (!result.ok) {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      increment(); // revert the badge
      toast.error(result.error);
      return;
    }
    toast.success("Notification marked as read");
  }

  if (!response.ok) {
    return { ok: false, error: response.error, onMarkAsRead: handleMarkAsRead };
  }

  const { unread, older } = partitionByRead(response.data, readIds);
  return { ok: true, unread, older, onMarkAsRead: handleMarkAsRead };
}
