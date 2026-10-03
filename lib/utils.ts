import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BookingStatus } from "./types/booking";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(
  amount: number | null | undefined,
  currency = "USD",
) {
  if (amount == null) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amount,
  );
}

/** Initials for an avatar: `Ada Lovelace` → `AL`. */
export function initialsFrom(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Turns a snake_case slug into a human label: `aire_acondicionado` → `Aire Acondicionado`. */
export function humanize(value: string) {
  return value
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

const TYPE_GRADIENTS: Record<string, string> = {
  accommodation: "from-primary/40 to-card",
  experience: "from-rating/40 to-card",
  equipment: "from-success/40 to-card",
};

/** Tailwind gradient stops for a listing/booking `type` banner. */
export function listingTypeGradient(type: string | null | undefined) {
  return TYPE_GRADIENTS[type ?? ""] ?? "from-muted to-card";
}

export const bookingStatusVariant: Record<
  BookingStatus,
  "primary" | "secondary" | "destructive" | "outline"
> = {
  accepted: "primary",
  pending: "secondary",
  cancelled: "destructive",
  rejected: "destructive",
};
