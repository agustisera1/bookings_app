import { getCurrentUser } from "@/lib/services/auth";
import { forbidden } from "next/navigation";
import { CreateListingForm } from "@/components/listings/create-listing-form";

export default async function NewListingPage() {
  const user = await getCurrentUser();
  if (!user?.is_host) forbidden();

  return (
    <div className="p-10 flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-1.5 text-center max-w-2xl">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Create a new listing
        </h1>
        <p className="text-sm text-muted-foreground">
          Share the details of your place, experience, or equipment to start
          hosting.
        </p>
      </div>
      <CreateListingForm />
    </div>
  );
}
