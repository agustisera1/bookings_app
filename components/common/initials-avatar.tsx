import { cn } from "@/lib/shared/utils";

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-xl",
} as const;

export function InitialsAvatar({
  initials,
  size = "sm",
  className,
}: {
  initials: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
        SIZES[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
