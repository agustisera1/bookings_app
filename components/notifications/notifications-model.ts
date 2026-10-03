import {
  Bell,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  CreditCard,
  LogIn,
  MessageSquare,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { NotificationDocument } from "@/lib/types/notification";


export type Notification = NotificationDocument;

// Notifications have no `type` field, so the icon and tint are keyed off title keywords.
export function notificationVisual(title: string): {
  icon: LucideIcon;
  accent: string;
} {
  const t = title.toLowerCase();

  const success = "text-success bg-success/10";
  const destructive = "text-destructive bg-destructive/10";
  const info = "text-primary bg-primary/10";

  if (t.includes("confirm")) return { icon: CalendarCheck, accent: success };
  if (t.includes("check-in") || t.includes("check in"))
    return { icon: LogIn, accent: success };
  if (t.includes("cancel")) return { icon: CalendarX, accent: destructive };
  if (t.includes("solicitud") || t.includes("request"))
    return { icon: CalendarPlus, accent: info };
  if (t.includes("pago") || t.includes("pay"))
    return { icon: CreditCard, accent: info };
  if (t.includes("reseña") || t.includes("review"))
    return { icon: Star, accent: info };
  if (t.includes("mensaje") || t.includes("message"))
    return { icon: MessageSquare, accent: info };
  return { icon: Bell, accent: info };
}

// The worker publishes `{ kind: "message" }` for an unread nudge (`UnreadNudge`, worker `src/redis/client.ts`).
// Anything unparseable counts as a notification: worst case, a badge off by one until reload.
export function isUnreadNudge(data: string): boolean {
  try {
    return JSON.parse(data)?.kind === "message";
  } catch {
    return false;
  }
}

// Overlays the optimistic read-set on top of the server flag, so a just-read
// notification moves from "new" to "older" without waiting for a refetch.
export function partitionByRead(
  notifications: Notification[],
  readIds: Set<string>,
): { unread: Notification[]; older: Notification[] } {
  const isRead = (n: Notification) => n.is_read || readIds.has(n._id);
  return {
    unread: notifications.filter((n) => !isRead(n)),
    older: notifications.filter(isRead),
  };
}
