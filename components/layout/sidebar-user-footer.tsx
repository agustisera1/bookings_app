"use client";

import { logoutUser } from "@/lib/auth/actions";
import { initialsFrom } from "@/lib/shared/utils";
import { SidebarFooter } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InitialsAvatar } from "@/components/common/initials-avatar";
import { ChevronsUpDownIcon, LogOutIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = { name: string; email: string };

export function SidebarUserFooter({ name, email }: Props) {
  const router = useRouter();
  const initials = initialsFrom(name);

  async function handleLogout() {
    const { ok } = await logoutUser();
    if (ok) router.push("/auth/sign-in");
  }

  return (
    <SidebarFooter className="border-t border-sidebar-border">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-hidden hover:bg-sidebar-accent data-popup-open:bg-sidebar-accent">
          <InitialsAvatar initials={initials} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {email}
            </p>
          </div>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-sidebar-foreground/60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" sideOffset={8} className="p-1">
          <div className="flex items-center gap-2.5 px-1.5 py-1.5">
            <InitialsAvatar initials={initials} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            render={<Link href="/profile" />}
          >
            <UserIcon />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            variant="destructive"
            onClick={handleLogout}
          >
            <LogOutIcon />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarFooter>
  );
}
