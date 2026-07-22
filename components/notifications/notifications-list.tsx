"use client";

import { BellOff } from "lucide-react";
import type { ServiceResult } from "@/lib/types";
import { EmptyState } from "@/components/common/empty-state";
import { NotificationGroup } from "./notification-group";
import { useNotifications } from "./use-notifications";
import type { Notification } from "./notifications-model";

export function NotificationsList({
  notificationsPromise,
}: {
  notificationsPromise: Promise<ServiceResult<Notification[]>>;
}) {
  const view = useNotifications(notificationsPromise);

  if (!view.ok) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load your notifications, please try reloading the page.
      </p>
    );
  }

  if (view.unread.length === 0 && view.older.length === 0) {
    return (
      <EmptyState
        className="py-16"
        icon={<BellOff />}
        title="You're all caught up"
        description="New activity on your bookings and listings will show up here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <NotificationGroup
        title="New"
        notifications={view.unread}
        read={false}
        onMarkAsRead={view.onMarkAsRead}
      />
      <NotificationGroup
        title="Older notifications"
        notifications={view.older}
        read
        onMarkAsRead={view.onMarkAsRead}
      />
    </div>
  );
}
