import { GetListingsQuery } from "@/lib/apollo/__generated__/operations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PriceLabel } from "@/components/common/price-label";
import { listingTypeGradient } from "@/lib/utils";
import { MapPin } from "lucide-react";
import Link from "next/link";

export async function Listings({
  listings,
}: {
  listings: GetListingsQuery["listings"];
}) {
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {listings?.map((listing) => {
        const gradient = listingTypeGradient(listing.type);

        return (
          <li key={listing._id}>
            <Link href={`/listings/${listing._id}`}>
            <Card className="group overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer p-0">
              <div
                className={`h-40 bg-gradient-to-br ${gradient} flex items-end p-3`}
              >
                <Badge className="bg-black/20 text-white/90 backdrop-blur-sm hover:bg-black/30 uppercase tracking-widest text-[10px]">
                  {listing.type}
                </Badge>
              </div>
              <CardContent className="p-4 flex flex-col gap-2">
                <h3 className="font-semibold text-xl leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {listing.title}
                </h3>
                {(listing.location?.city || listing.location?.country) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span>
                      {[listing.location?.city, listing.location?.country]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {listing.description}
                </p>
                <PriceLabel price={listing.price} className="mt-auto" />
              </CardContent>
            </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
