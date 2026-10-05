import { cn, formatPrice } from "@/lib/shared/utils";

export function PriceLabel({
  price,
  className,
}: {
  price: number;
  className?: string;
}) {
  return (
    <span data-slot="price-label" className={cn("text-sm", className)}>
      <span className="font-semibold text-foreground tabular-nums">
        {formatPrice(price)}
      </span>{" "}
      <span className="text-muted-foreground">/ night</span>
    </span>
  );
}
