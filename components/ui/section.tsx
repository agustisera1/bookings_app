import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Section({
  title,
  subtitle,
  card = false,
  cardSize = "default",
  className,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  card?: boolean;
  cardSize?: "default" | "sm";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-heading font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {card ? (
        <Card size={cardSize}>
          <CardContent>{children}</CardContent>
        </Card>
      ) : (
        children
      )}
    </div>
  );
}
