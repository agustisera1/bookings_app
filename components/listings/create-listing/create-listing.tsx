"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createListing } from "@/lib/services/listings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WideDialogContent } from "@/components/common/wide-dialog-content";
import { BasicsStep } from "./basics-step";
import { LocationStep } from "./location-step";
import { DetailsStep } from "./details-step";
import { StepIndicator } from "./step-indicator";
import {
  createListingSchema,
  DEFAULT_VALUES,
  STEPS,
  type CreateListingFormValues,
  type StepFieldsProps,
  type StepId,
} from "./create-listing-model";

// Keyed by `StepId` rather than indexed: a step added to `STEPS` widens the
// union, and the missing key here is a type error instead of an empty pane.
const STEP_BODIES: Record<StepId, (props: StepFieldsProps) => ReactNode> = {
  basics: BasicsStep,
  location: LocationStep,
  details: DetailsStep,
};

export default function CreateListing({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const router = useRouter();

  const {
    control,
    register,
    handleSubmit,
    trigger,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateListingFormValues>({
    resolver: zodResolver(createListingSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const isLastStep = step === STEPS.length - 1;
  const StepBody = STEP_BODIES[STEPS[step].id];
  const fieldProps = { register, control, errors, disabled: isSubmitting };

  function handleOpenChange(nextOpen: boolean) {
    // Discard whatever a previous, cancelled attempt left half-typed.
    if (nextOpen) {
      reset(DEFAULT_VALUES);
      setStep(0);
    }
    setOpen(nextOpen);
  }

  async function goNext() {
    if (await trigger(STEPS[step].fields)) setStep(step + 1);
  }

  async function onSubmit(data: CreateListingFormValues) {
    const result = await createListing({ ...data, type: "accommodation" });
    if (!result.ok) {
      toast.error(result.error);
      throw new Error(result.error); // keeps RHF from marking the form as submitted
    }
    setOpen(false);
    // No route that opens this dialog shows the new listing; the toast is the way to it.
    toast.success("Listing created", {
      action: {
        label: "View",
        onClick: () => router.push(`/listings/${result.data}`),
      },
    });
  }

  // Before the last step, submit advances instead of creating, so Enter in a
  // field matches the button and never sends a half-filled listing.
  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLastStep) void handleSubmit(onSubmit)();
    else void goNext();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className={className}>
            <Plus />
            Add
          </Button>
        }
      />

      <WideDialogContent className="grid-rows-[auto_auto_minmax(0,1fr)]">
        <DialogHeader>
          <DialogTitle>Create a new listing</DialogTitle>
          <DialogDescription>{STEPS[step].description}</DialogDescription>
        </DialogHeader>

        <StepIndicator steps={STEPS} current={step} />

        <form
          onSubmit={handleFormSubmit}
          className="flex min-h-0 flex-col gap-4"
        >
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-1 py-1">
            <StepBody {...fieldProps} />
          </div>

          <DialogFooter className="sm:justify-between">
            {step === 0 ? (
              <DialogClose
                render={<Button variant="outline" type="button" />}
                disabled={isSubmitting}
              >
                Cancel
              </DialogClose>
            ) : (
              <Button
                variant="outline"
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={isSubmitting}
              >
                Back
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isLastStep
                ? isSubmitting
                  ? "Creating…"
                  : "Create listing"
                : "Next"}
            </Button>
          </DialogFooter>
        </form>
      </WideDialogContent>
    </Dialog>
  );
}
