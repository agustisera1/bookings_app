import { GroupHeader } from "@/components/common/group-header";
import { NotificationRow } from "./notification-row";
import type { Notification } from "./notifications-model";

export function NotificationGroup({
  title,
  notifications,
  read,
  onMarkAsRead,
}: {
  title: string;
  notifications: Notification[];
  read: boolean;
  onMarkAsRead: (id: string) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <GroupHeader title={title} count={notifications.length} />
      <ul className="flex flex-col gap-3">
        {notifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            read={read}
            onMarkAsRead={() => onMarkAsRead(notification.id)}
          />
        ))}
      </ul>
    </section>
  );
}
