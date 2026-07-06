import {
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Vertical stack for a single form control (label + input + error).
 * Use directly when you need custom composition; prefer `FormField` for the
 * common label/control/error shape.
 */
export function Field({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

/**
 * Standard inline validation message. Renders nothing when there's no error,
 * so callers can pass `errors.x?.message` unconditionally.
 */
export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p data-slot="field-error" className="text-xs text-destructive">
      {children}
    </p>
  );
}

/**
 * The canonical form-row: an optional label bound to a control via `htmlFor`,
 * the control itself (children), and an optional error message underneath.
 *
 * When `error` is set, the control is cloned with `aria-invalid`, which lights
 * up the error styling already baked into the `ui/` inputs (Input, Textarea…)
 * — no per-field wiring needed.
 *
 * ```tsx
 * <FormField label="Title" htmlFor="title" error={errors.title?.message}>
 *   <Input id="title" {...register("title")} />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
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
      <FieldError>{error}</FieldError>
    </Field>
  );
}
