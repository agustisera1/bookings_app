import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Explore listings" };

export default function RootPage() {
  redirect("/listings");
}
