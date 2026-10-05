"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { EmptyState } from "@/components/common/empty-state";
import { AddListingPhotosButton } from "@/components/listings/add-listing-photos-button";
import { DeleteListingPhotoButton } from "@/components/listings/delete-listing-photo-button";
import { cn } from "@/lib/shared/utils";

const GRID_TILES = 5;

type ListingPhotosProps = {
  photos: string[];
  title: string;
  listingId: string;
  isHostMode?: boolean;
};

export function ListingPhotos({
  photos,
  title,
  listingId,
  isHostMode = false,
}: ListingPhotosProps) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <EmptyState
        className="rounded-xl border border-dashed border-input py-10"
        icon={<ImageOff />}
        title="No photos yet"
        description={
          isHostMode ? "Add photos so guests can see the place." : undefined
        }
        action={
          isHostMode ? (
            <AddListingPhotosButton listingId={listingId} />
          ) : undefined
        }
      />
    );
  }

  const tiles = photos.slice(0, GRID_TILES);
  const hidden = photos.length - tiles.length;

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "grid gap-2 sm:h-96",
          tiles.length > 1 && "sm:grid-cols-4 sm:grid-rows-2",
        )}
      >
        {tiles.map((photo, i) => {
          const isLead = i === 0;
          const showMore = hidden > 0 && i === tiles.length - 1;
          return (
            <div
              key={`${photo}-${i}`}
              className={cn(
                "group relative overflow-hidden rounded-xl bg-muted",
                isLead
                  ? "aspect-video sm:col-span-2 sm:row-span-2 sm:aspect-auto"
                  : "hidden sm:block",
              )}
            >
              <button
                type="button"
                onClick={() => setOpenAt(i)}
                aria-label={`Open photo ${i + 1} of ${photos.length}`}
                className="block size-full"
              >
                <Image
                  src={photo}
                  alt={`${title} photo ${i + 1}`}
                  fill
                  priority={isLead}
                  sizes={isLead ? "(min-width: 640px) 50vw, 100vw" : "25vw"}
                  className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
                />
                {showMore && (
                  <span className="absolute inset-0 flex items-center justify-center bg-overlay/50 text-lg font-semibold text-overlay-foreground">
                    +{hidden}
                  </span>
                )}
              </button>
              {isHostMode && (
                <DeleteListingPhotoButton
                  listingId={listingId}
                  photoUrl={photo}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => setOpenAt(0)}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Show all {photos.length} photos
          </button>
        )}
        {isHostMode && (
          <span className="ml-auto">
            <AddListingPhotosButton listingId={listingId} photos={photos} />
          </span>
        )}
      </div>

      <Dialog
        open={openAt !== null}
        onOpenChange={(open) => !open && setOpenAt(null)}
      >
        <DialogContent size="lg" className="p-2 data-[size=lg]:sm:max-w-4xl">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {openAt !== null && (
            <Carousel
              opts={{ startIndex: openAt }}
              aria-label={`${title} photos`}
            >
              <CarouselContent>
                {photos.map((photo, i) => (
                  <CarouselItem key={`${photo}-${i}`}>
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={photo}
                        alt={`${title} photo ${i + 1}`}
                        fill
                        sizes="(min-width: 640px) 896px, 100vw"
                        className="object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {photos.length > 1 && (
                <>
                  <CarouselPrevious className="left-3" />
                  <CarouselNext className="right-3" />
                </>
              )}
            </Carousel>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
