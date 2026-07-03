"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff, Search } from "lucide-react";
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

export function ListingPhotos({
  photos,
  title,
  listingId,
  isHostMode = false,
}: {
  photos: string[];
  title: string;
  listingId: string;
  isHostMode?: boolean;
}) {
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  if (photos.length === 0) {
    return (
      <EmptyState
        className="min-h-[120px] rounded-lg border border-dashed border-input py-4"
        icon={<ImageOff />}
        description="No photos yet."
        action={
          isHostMode ? <AddListingPhotosButton listingId={listingId} /> : undefined
        }
      />
    );
  }

  return (
    <>
      <Carousel
        opts={{ align: "start", dragFree: true }}
        aria-label={`${title} photos`}
        className="w-full"
      >
        <div className="flex w-full min-h-[120px] items-center gap-2">
          <CarouselPrevious className="static shrink-0" />

          <div className="min-w-0 flex-1">
            <CarouselContent className="-ml-2">
              {photos.map((photo, i) => (
                <CarouselItem key={`${photo}-${i}`} className="basis-auto pl-2">
                  <button
                    type="button"
                    onClick={() => setActivePhoto(photo)}
                    className="group relative h-[120px] w-40 shrink-0 overflow-hidden rounded-lg ring-1 ring-foreground/10"
                  >
                    <Image
                      src={photo}
                      alt={`${title} photo ${i + 1}`}
                      fill
                      unoptimized
                      sizes="160px"
                      className="object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors group-hover:bg-black/30 group-hover:opacity-100">
                      <Search className="size-4 text-white" />
                    </span>
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
          </div>

          <CarouselNext className="static shrink-0" />
        </div>
      </Carousel>

      <Dialog
        open={activePhoto !== null}
        onOpenChange={(open) => !open && setActivePhoto(null)}
      >
        <DialogContent size="lg" className="p-1">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {activePhoto && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <Image
                src={activePhoto}
                alt={title}
                fill
                unoptimized
                sizes="(min-width: 640px) 512px, 100vw"
                className="object-cover"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
