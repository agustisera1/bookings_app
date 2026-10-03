"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Compass,
  LayoutGrid,
  MessageSquare,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  useNotificationsCount,
  useUnreadMessagesCount,
} from "@/components/notifications/provider";

export function SidebarNav({ isHost }: { isHost: boolean }) {
  const pathname = usePathname();
  const notifications = useNotificationsCount();
  const unreadMessages = useUnreadMessagesCount();
  const navItems = [
    isHost
      ? { title: "My listings", href: "/listings/mine", icon: LayoutGrid }
      : { title: "My bookings", href: "/bookings", icon: CalendarDays },
    { title: "Explore", href: "/listings", icon: Compass },
    {
      title: "Messages",
      href: "/messages",
      icon: MessageSquare,
      badge: unreadMessages,
    },
    {
      title: "Notifications",
      href: "/notifications",
      icon: Bell,
      badge: notifications,
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
            {item.badge ? (
              <Badge
                variant="primary"
                className="pointer-events-none absolute right-2 top-1/2 z-10 -translate-y-1/2 tabular-nums"
              >
                {item.badge}
              </Badge>
            ) : null}
            <SidebarMenuButton
              isActive={isActive(item.href)}
              render={<Link href={item.href} />}
              className="data-active:bg-sidebar-accent data-active:text-primary data-active:hover:text-primary dark:data-active:bg-sidebar-accent"
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
