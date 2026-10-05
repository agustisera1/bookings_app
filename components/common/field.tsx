import {
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/shared/utils";

export function Field({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p data-slot="field-error" className="text-xs text-destructive">
      {children}
    </p>
  );
}

// With `error`, the control is cloned with `aria-invalid`, which lights up the `ui/` error styles.
export function FormField({
  label,
  htmlFor,
  description,
  error,
  className,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
  description?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const control =
    error && isValidElement(children)
      ? cloneElement(
          children as ReactElement<{ "aria-invalid"?: boolean }>,
          { "aria-invalid": true },
        )
      : children;

  return (
    <Field data-slot="form-field" className={className}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {control}
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )
      )}
    </Field>
  );
}
