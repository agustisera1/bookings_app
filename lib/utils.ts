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

/** Turns a snake_case slug into a human label: `aire_acondicionado` → `Aire Acondicionado`. */
export function humanize(value: string) {
  return value
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
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

export const MIME_TYPES = {
  // Images
  "image/png": "png",
  "image/jpeg": "jpeg", // Nota: mapea a 'jpeg' (puedes cambiarlo a 'jpg' si prefieres)
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/webp": "webp",
  "image/x-icon": "ico",

  // Video
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/x-msvideo": "avi",
  "video/mpeg": "mpeg",

  // Documents
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
} as const;

// Tipo utilitario automático de TypeScript basado en tu objeto
export type ValidMimeType = keyof typeof MIME_TYPES;
