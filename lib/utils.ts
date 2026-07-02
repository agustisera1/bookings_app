import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number | null | undefined, currency = "USD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export const bookingStatusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  confirmed: "default",
  paid: "default",
  pending: "secondary",
  cancelled: "destructive",
  completed: "outline",
};
