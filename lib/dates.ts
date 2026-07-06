import { cn } from "@/lib/utils";
import { Matcher } from "react-day-picker";
import { Booking } from "./types/booking";

export function parseTs(ts: string | null | undefined): Date | null {
  if (!ts) return null;
  const d = new Date(Number(ts));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Convierte reservas en matchers `disabled` para el Calendar (react-day-picker).
 *
 * Usa `DateRange` (`{ from, to }`), que incluye ambos extremos, en lugar de
 * `DateInterval` (`{ before, after }`), que los excluye. Así se bloquean tanto
 * `start_date` como `end_date` además de los días intermedios.
 *
 * Nota de negocio: el bloqueo es inclusivo en ambas puntas a propósito. Todavía
 * no modelamos horas de check-in/check-out, solo días completos: la noche de
 * `end_date` se considera ocupada. Si en el futuro `end_date` pasa a ser el día
 * de check-out (esa noche libre), habría que hacer el extremo superior
 * exclusivo (`to: end_date - 1 día`).
 */
export function getAvailabilityFromBookings(bookings: Booking[]) {
  const availability: Matcher[] = bookings.map((booking) => {
    const matcher: Matcher = {
      from: parsePgTimestamp(booking.start_date)!,
      to: parsePgTimestamp(booking.end_date)!,
    };

    return matcher;
  });

  return availability;
}

export function parsePgTimestamp(
  ts: string | Date | null | undefined,
): Date | null {
  if (!ts) return null;
  // El driver de pg ya puede devolver un Date para columnas timestamp
  if (ts instanceof Date) return isNaN(ts.getTime()) ? null : ts;
  // "2026-07-29 00:00:00-03" → ISO: "2026-07-29T00:00:00-03:00"
  let iso = ts.trim().replace(" ", "T");
  const tz = iso.match(/([+-]\d{2})(:?\d{2})?$/);
  if (tz && !tz[2]) iso += ":00"; // offset sin minutos → agregarlos
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(date: Date | string | null | undefined) {
  const d = date instanceof Date ? date : parseTs(date as string | null);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function calcNights(
  from: Date | string | null | undefined,
  to: Date | string | null | undefined,
): number {
  const s = from instanceof Date ? from : parseTs(from as string | null);
  const e = to instanceof Date ? to : parseTs(to as string | null);
  if (!s || !e) return 0;
  return Math.round((e.getTime() - s.getTime()) / 86_400_000);
}

export const datePickerTriggerClass = (hasValue: boolean) =>
  cn(
    "h-10 w-full justify-start rounded-lg border border-input bg-transparent px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    !hasValue && "text-muted-foreground",
  );
