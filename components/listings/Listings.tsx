import { GetListingsQuery } from "@/lib/apollo/__generated__/operations";

const TYPE_GRADIENTS: Record<string, string> = {
  accommodation: "from-violet-500 to-indigo-600",
  experience: "from-orange-400 to-pink-500",
  equipment: "from-teal-400 to-cyan-600",
};

export async function Listings({
  listings,
}: {
  listings: GetListingsQuery["listings"];
}) {
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {listings?.map((listing) => {
        const gradient =
          TYPE_GRADIENTS[listing.type!] ?? "from-gray-400 to-gray-600";

        return (
          <li
            key={listing._id}
            className="group rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer"
          >
            <div
              className={`h-40 bg-gradient-to-br ${gradient} flex items-end p-3`}
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-white/80 bg-black/20 rounded-full px-3 py-1 backdrop-blur-sm">
                {listing.type}
              </span>
            </div>

            <div className="p-4 flex flex-col gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                {listing.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-auto">
                <span className="font-bold text-gray-900 dark:text-white text-base">
                  ${listing.price}
                </span>{" "}
                / night
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
