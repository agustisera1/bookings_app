"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, Compass, LayoutGrid } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export function SidebarNav({
  isHost,
  notifications,
}: {
  isHost: boolean;
  notifications: number;
}) {
  const pathname = usePathname();
  const navItems = [
    isHost
      ? { title: "My listings", href: "/listings/mine", icon: LayoutGrid }
      : { title: "My bookings", href: "/bookings", icon: CalendarDays },
    { title: "Explore", href: "/listings", icon: Compass },
    {
      title: "Notifications",
      href: "/notifications",
      icon: Bell,
      notifications,
    },
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
          <SidebarMenuItem key={item.href} className="relative">
            {item.notifications ? (
              <Badge
                variant="accent"
                className="pointer-events-none absolute right-2 top-1/2 z-10 -translate-y-1/2"
              >
                {item.notifications}
              </Badge>
            ) : null}
            <SidebarMenuButton
              isActive={isActive(item.href)}
              render={<Link href={item.href} />}
              className="data-active:hover:bg-success/10 data-active:hover:text-success dark:data-active:hover:bg-success/20"
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
