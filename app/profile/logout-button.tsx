"use client";
import { logoutUser } from "@/lib/services/auth";
import { redirect } from "next/navigation";

export default function LogoutButton() {
  async function handleLogout() {
    const { ok } = await logoutUser();
    if (ok) redirect("/auth/sign-in");
    else alert("Please try again");
  }

  return (
    <button
      onClick={handleLogout}
      className="bg-gray-700 p-2 text-sm rounded-md cursor-pointer"
    >
      Logout
    </button>
  );
}
