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

// Filter model for the notifications panel: the icon/accent mapping and the
// read/unread split. Pure (no React, no I/O) so it stays cohesive and testable,
// decoupled from the list's rendering and optimistic state.

export type Notification = NotificationDocument;

/**
 * Picks a leading icon + accent tint from the notification title. Purely
 * cosmetic: notifications have no `type` field, so we key off keywords to give
 * each row a recognizable glyph instead of a generic bell.
 *
 * The palette is intentionally limited to three semantic accents: `success`
 * (good news), `destructive` (bad news) and `primary` (everything else / info).
 */
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
