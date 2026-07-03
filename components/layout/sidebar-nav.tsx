import Link from "next/link";
import { Book, SearchIcon } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function SidebarNav({ isHost }: { isHost: boolean }) {
  const navItems = [
    isHost
      ? { title: "My listings", href: "/listings/mine", icon: Book }
      : { title: "My bookings", href: "/bookings", icon: Book },
    { title: "Explore", href: "/listings", icon: SearchIcon },
  ];

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem className="px-2" key={item.href}>
          <SidebarMenuButton
            render={<Link className="w-full" href={item.href} />}
          >
            <item.icon />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
