import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(
  amount: number | null | undefined,
  currency = "USD",
) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amount,
  );
}

const TYPE_GRADIENTS: Record<string, string> = {
  accommodation: "from-violet-500 to-indigo-600",
  experience: "from-orange-400 to-pink-500",
  equipment: "from-teal-400 to-cyan-600",
};

/** Tailwind gradient stops for a listing/booking `type` banner. */
export function listingTypeGradient(type: string | null | undefined) {
  return TYPE_GRADIENTS[type ?? ""] ?? "from-slate-400 to-slate-600";
}

export const bookingStatusVariant: Record<
  string,
  "primary" | "secondary" | "destructive" | "outline"
> = {
  confirmed: "primary",
  paid: "primary",
  accepted: "primary",
  pending: "secondary",
  cancelled: "destructive",
  rejected: "destructive",
  completed: "outline",
};
