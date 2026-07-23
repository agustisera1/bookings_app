import {
  Bell,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  LogIn,
} from "lucide-react";
import { describe, expect, it } from "vitest";
import type { NotificationDocument } from "@/lib/types/notification";
import { notificationVisual, partitionByRead } from "./notifications-model";

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

function notification(overrides: Partial<NotificationDocument>): NotificationDocument {
  return {
    _id: "n",
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

describe("partitionByRead", () => {
  it("overlays the optimistic read-set on top of the server flag", () => {
    const notifications = [
      notification({ _id: "n1", is_read: false }),
      notification({ _id: "n2", is_read: true }),
      notification({ _id: "n3", is_read: false }),
    ];

    const { unread, older } = partitionByRead(notifications, new Set(["n3"]));

    expect(unread.map((n) => n._id)).toEqual(["n1"]);
    expect(older.map((n) => n._id)).toEqual(["n2", "n3"]);
  });
});
