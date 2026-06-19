import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookingForm } from "@/components/bookings/booking-form";
import { ReviewForm } from "@/components/reviews/review-form";
import { MapPin, Star, ChevronLeft } from "lucide-react";
import Link from "next/link";

const TYPE_GRADIENTS: Record<string, string> = {
  accommodation: "from-violet-500 to-indigo-600",
  experience: "from-orange-400 to-pink-500",
  equipment: "from-teal-400 to-cyan-600",
};

type MockListing = {
  _id: string;
  type: "accommodation" | "experience" | "equipment";
  title: string;
  description: string;
  price: number;
  location: { city: string; country: string };
  rating_avg: number;
};

async function getMockListing(id: string): Promise<MockListing> {
  return {
    _id: id,
    type: "accommodation",
    title: "Bright loft in Palermo Soho",
    description:
      "A sun-drenched loft in the heart of Palermo Soho. Walking distance from the best restaurants, bars, and parks in Buenos Aires. The apartment features high ceilings, a fully equipped kitchen, fast Wi-Fi, and a private terrace perfect for morning coffee.",
    price: 95,
    location: { city: "Buenos Aires", country: "Argentina" },
    rating_avg: 4.8,
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getMockListing(id);

  const gradient = TYPE_GRADIENTS[listing.type] ?? "from-gray-400 to-gray-600";

  return (
    <div className="min-h-screen">
      <div
        className={`h-72 bg-gradient-to-br ${gradient} flex flex-col justify-between p-8`}
      >
        <Link
          href="/listings"
          className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors w-fit"
        >
          <ChevronLeft className="size-4" />
          Back to listings
        </Link>

        <div className="flex items-end justify-between">
          <Badge className="bg-black/20 text-white/90 backdrop-blur-sm hover:bg-black/30 uppercase tracking-widest text-[10px] w-fit">
            {listing.type}
          </Badge>
          <div className="flex items-center gap-1.5 text-white">
            <Star className="size-4 fill-yellow-300 text-yellow-300" />
            <span className="text-sm font-semibold">{listing.rating_avg}</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-heading font-semibold leading-tight">
                {listing.title}
              </h1>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <MapPin className="size-3.5" />
                <span>
                  {listing.location.city}, {listing.location.country}
                </span>
              </div>
            </div>

            <Separator />

            <p className="text-muted-foreground leading-relaxed">
              {listing.description}
            </p>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold">${listing.price}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    / night
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BookingForm
                  listingId={listing._id}
                  pricePerNight={listing.price}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator className="my-10" />

        <div className="max-w-lg flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-heading font-semibold">
              Leave a review
            </h2>
            <p className="text-sm text-muted-foreground">
              Share your experience to help other guests.
            </p>
          </div>
          <ReviewForm listingId={listing._id} />
        </div>
      </div>
    </div>
  );
}
