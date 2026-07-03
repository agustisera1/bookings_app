"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Eye, MapPin } from "lucide-react";
import Link from "next/link";
import { GetListingsQuery } from "@/lib/apollo/__generated__/operations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";
import { DeleteListingButton } from "@/components/listings/delete-listing-button";
import { EditListingButton } from "@/components/listings/edit-listing-button";

type ListingRow = NonNullable<GetListingsQuery["listings"]>[number];

const columns: ColumnDef<ListingRow>[] = [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="uppercase tracking-widest text-[10px]"
      >
        {row.original.type}
      </Badge>
    ),
  },
  {
    id: "location",
    header: "Location",
    cell: ({ row }) => {
      const { city, country } = row.original.location ?? {};
      if (!city && !country)
        return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span>{[city, country].filter(Boolean).join(", ")}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <p
        className="max-w-64 truncate text-muted-foreground"
        title={row.original.description}
      >
        {row.original.description}
      </p>
    ),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => formatPrice(row.original.price),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const listing = row.original;
      return (
        <div className="flex justify-end gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  nativeButton={false}
                  render={<Link href={`/listings/${listing._id}`} />}
                >
                  <Eye />
                </Button>
              }
            />
            <TooltipContent variant="dark">View</TooltipContent>
          </Tooltip>
          <EditListingButton
            listingId={listing._id}
            defaultValues={{
              title: listing.title,
              description: listing.description,
              price: listing.price,
              location: {
                address: listing.location?.address ?? "",
                city: listing.location?.city ?? "",
                country: listing.location?.country ?? "",
              },
            }}
          />
          <DeleteListingButton
            listingId={listing._id}
            listingTitle={listing.title}
          />
        </div>
      );
    },
  },
];

export function ListingsTable({
  listings,
}: {
  listings: NonNullable<GetListingsQuery["listings"]>;
}) {
  const table = useReactTable({
    data: listings,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
