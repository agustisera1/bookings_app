"use client";

import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
} from "./create-listing-model";

export function CreateListingButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

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
      throw new Error(result.error); // evita que RHF marque isSubmitSuccessful = true
    }
    setOpen(false);
    toast.success("Listing created!");
  }

  // Mientras no sea el último paso el submit avanza en vez de crear, así Enter
  // en un campo hace lo mismo que el botón y no manda el alta a medio completar.
  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLastStep) void handleSubmit(onSubmit)();
    else void goNext();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button className={className}>Add new listing</Button>}
      />

      <WideDialogContent className="grid-rows-[auto_auto_minmax(0,1fr)] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Create a new listing</DialogTitle>
          <DialogDescription>{STEPS[step].description}</DialogDescription>
        </DialogHeader>

        <StepIndicator steps={STEPS} current={step} />

        <form
          onSubmit={handleFormSubmit}
          className="flex min-h-0 flex-col gap-4"
        >
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-1 py-1">
            {step === 0 && <BasicsStep {...fieldProps} />}
            {step === 1 && <LocationStep {...fieldProps} />}
            {step === 2 && <DetailsStep {...fieldProps} />}
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
