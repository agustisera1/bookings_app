import { MapPin } from "lucide-react";
import Link from "next/link";
import { GetListingsQuery } from "@/lib/apollo/__generated__/operations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

type ListingRow = NonNullable<GetListingsQuery["listings"]>[number];

export function ListingsGrid({ listings }: { listings: ListingRow[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {listings.map((listing) => {
        const { city, country } = listing.location ?? {};
        return (
          <Link
            key={listing._id}
            href={`/listings/${listing._id}`}
            className="block"
          >
            <Card className="flex h-full flex-col transition-colors hover:bg-muted/50">
              <CardHeader className="pb-2">
                <Badge
                  variant="outline"
                  className="uppercase tracking-widest text-[10px] w-fit"
                >
                  {listing.type}
                </Badge>
                <CardTitle className="text-base">{listing.title}</CardTitle>
                {(city || country) && (
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <MapPin className="size-3.5 shrink-0" />
                    <span>{[city, country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-2 flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {listing.description}
                </p>
                <span className="text-sm font-semibold mt-auto">
                  {formatPrice(listing.price)}{" "}
                  <span className="font-normal text-muted-foreground">
                    / night
                  </span>
                </span>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
