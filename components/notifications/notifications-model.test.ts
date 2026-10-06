import {
  Bell,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  LogIn,
} from "lucide-react";
import { describe, expect, it } from "vitest";
import {
  isUnreadNudge,
  notificationVisual,
  partitionByRead,
  type Notification,
} from "./notifications-model";

describe("notificationVisual", () => {
  it("keys the icon and accent off keywords in the title", () => {
    expect(notificationVisual("Booking confirmed")).toEqual({
      icon: CalendarCheck,
      accent: "text-success bg-success/10",
    });
    expect(notificationVisual("Reserva cancelada")).toEqual({
      icon: CalendarX,
      accent: "text-destructive bg-destructive/10",
    });
    expect(notificationVisual("Check-in reminder").icon).toBe(LogIn);
    expect(notificationVisual("Nueva solicitud").icon).toBe(CalendarPlus);
  });

  it("falls back to a generic bell with the info accent", () => {
    expect(notificationVisual("Something else")).toEqual({
      icon: Bell,
      accent: "text-primary bg-primary/10",
    });
  });
});

function notification(overrides: Partial<Notification>): Notification {
  return {
    id: "n",
    listing_id: "l",
    host_id: "h",
    guest_id: "g",
    booking_id: "b",
    target_id: "g",
    body: "body",
    title: "title",
    is_read: false,
    created_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("isUnreadNudge", () => {
  it("recognises the worker's bodiless message frame", () => {
    expect(isUnreadNudge(JSON.stringify({ kind: "message" }))).toBe(true);
  });

  it("treats a notification document as a notification", () => {
    // The real shape published for bookings: a whole document, no `kind`.
    const frame = JSON.stringify({ title: "Booking confirmed", is_read: false });
    expect(isUnreadNudge(frame)).toBe(false);
  });

  // A frame that can't be parsed still means something happened, so it counts
  // as a notification rather than being dropped.
  it("falls back to a notification on anything unparseable", () => {
    expect(isUnreadNudge("not json")).toBe(false);
    expect(isUnreadNudge("")).toBe(false);
    expect(isUnreadNudge("null")).toBe(false);
  });
});

describe("partitionByRead", () => {
  it("overlays the optimistic read-set on top of the server flag", () => {
    const notifications = [
      notification({ id: "n1", is_read: false }),
      notification({ id: "n2", is_read: true }),
      notification({ id: "n3", is_read: false }),
    ];

    const { unread, older } = partitionByRead(notifications, new Set(["n3"]));

    expect(unread.map((n) => n.id)).toEqual(["n1"]);
    expect(older.map((n) => n.id)).toEqual(["n2", "n3"]);
  });
});
