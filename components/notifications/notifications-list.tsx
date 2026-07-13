"use client";

import { use } from "react";
import {
  Bell,
  BellOff,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  CreditCard,
  LogIn,
  MessageSquare,
  Star,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ServiceResult } from "@/lib/types";
import { NotificationDocument } from "@/lib/types/notification";
import { EmptyState } from "@/components/common/empty-state";

type Notification = NotificationDocument;

/**
 * Picks a leading icon + accent tint from the notification title. Purely
 * cosmetic: notifications have no `type` field, so we key off keywords to give
 * each row a recognizable glyph instead of a generic bell.
 */
function notificationVisual(title: string): { icon: LucideIcon; accent: string } {
  const t = title.toLowerCase();
  if (t.includes("confirm"))
    return { icon: CalendarCheck, accent: "text-emerald-500 bg-emerald-500/10" };
  if (t.includes("cancel"))
    return { icon: CalendarX, accent: "text-red-500 bg-red-500/10" };
  if (t.includes("solicitud") || t.includes("request"))
    return { icon: CalendarPlus, accent: "text-blue-500 bg-blue-500/10" };
  if (t.includes("pago") || t.includes("pay"))
    return { icon: CreditCard, accent: "text-violet-500 bg-violet-500/10" };
  if (t.includes("reseña") || t.includes("review"))
    return { icon: Star, accent: "text-amber-500 bg-amber-500/10" };
  if (t.includes("check-in") || t.includes("check in"))
    return { icon: LogIn, accent: "text-cyan-500 bg-cyan-500/10" };
  if (t.includes("mensaje") || t.includes("message"))
    return { icon: MessageSquare, accent: "text-sky-500 bg-sky-500/10" };
  return { icon: Bell, accent: "text-primary bg-primary/10" };
}

function NotificationRow({ notification }: { notification: Notification }) {
  const { icon: Icon, accent } = notificationVisual(notification.title);
  const unread = !notification.is_read;

  return (
    <li
      className={cn(
        "group relative flex items-start gap-4 rounded-xl border p-4 transition-colors",
        "hover:bg-muted/50",
        unread ? "border-border bg-primary/[0.03]" : "border-border",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full [&_svg]:size-5",
          accent,
        )}
      >
        <Icon />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug text-pretty">
          {notification.title}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
          {notification.body}
        </p>
      </div>

      {unread && (
        <span
          aria-label="Unread"
          className="mt-1.5 size-2.5 shrink-0 rounded-full bg-red-500"
        />
      )}
    </li>
  );
}

export function NotificationsList({
  notificationsPromise,
}: {
  notificationsPromise: Promise<ServiceResult<Notification[]>>;
}) {
  const response = use(notificationsPromise);

  if (!response.ok) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load your notifications, please try reloading the page.
      </p>
    );
  }

  const notifications = response.data;

  if (notifications.length === 0) {
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
    <ul className="flex flex-col gap-3">
      {notifications.map((notification) => (
        <NotificationRow key={notification._id} notification={notification} />
      ))}
    </ul>
  );
}
