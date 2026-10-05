import Image from "next/image";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/shared/utils";

export function CoverImage({
  src,
  alt,
  sizes,
  fallbackClassName,
  priority = false,
  zoomOnHover = false,
  className,
  children,
}: {
  src?: string | null;
  alt: string;
  sizes: string;
  fallbackClassName: string;
  priority?: boolean;
  zoomOnHover?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("relative flex items-end overflow-hidden", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "object-cover",
            zoomOnHover &&
              "motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105",
          )}
        />
      ) : (
        <div
          className={cn("absolute inset-0 bg-gradient-to-br", fallbackClassName)}
        />
      )}
      {children}
    </div>
  );
}

export function OverlayBadge({ children }: { children: ReactNode }) {
  return (
    <Badge className="relative bg-overlay/60 text-2xs tracking-widest text-overlay-foreground uppercase backdrop-blur-sm">
      {children}
    </Badge>
  );
}
