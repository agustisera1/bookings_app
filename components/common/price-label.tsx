import { cn, formatPrice } from "@/lib/utils";

/**
 * Canonical "price per night" label. Always formats through `formatPrice` so
 * currency rendering stays consistent across cards and detail views.
 */
export function PriceLabel({
  price,
  className,
}: {
  price: number;
  className?: string;
}) {
  return (
    <span data-slot="price-label" className={cn("text-sm", className)}>
      <span className="font-semibold text-foreground">
        {formatPrice(price)}
      </span>{" "}
      <span className="text-muted-foreground">/ night</span>
    </span>
  );
}
