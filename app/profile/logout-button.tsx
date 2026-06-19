"use client";

import { logoutUser } from "@/lib/services/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  async function handleLogout() {
    const { ok } = await logoutUser();
    if (ok) redirect("/auth/sign-in");
    else alert("Please try again");
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout}>
      Logout
    </Button>
  );
}
