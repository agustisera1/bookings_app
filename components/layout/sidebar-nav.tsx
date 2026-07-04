"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, LayoutGrid } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function SidebarNav({ isHost }: { isHost: boolean }) {
  const pathname = usePathname();

  const navItems = [
    isHost
      ? { title: "My listings", href: "/listings/mine", icon: LayoutGrid }
      : { title: "My bookings", href: "/bookings", icon: CalendarDays },
    { title: "Explore", href: "/listings", icon: Compass },
  ];

  function isActive(href: string) {
    // "Explore" (/listings) owns every listings route except the host's own
    // listings section, which belongs to "My listings" (/listings/mine).
    if (href === "/listings") {
      return (
        pathname === "/listings" ||
        (pathname.startsWith("/listings/") &&
          !pathname.startsWith("/listings/mine"))
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={isActive(item.href)}
              className="gap-2.5 hover:bg-success/10 hover:text-foreground dark:hover:bg-success/20 data-active:bg-success/15 dark:data-active:bg-success/25"
              render={<Link href={item.href} />}
            >
              <item.icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
