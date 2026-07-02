import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/services/auth";
import { Book, SearchIcon } from "lucide-react";
import Link from "next/link";
import { SidebarUserFooter } from "./sidebar-user-footer";

export async function AppSidebar() {
  const user = await getCurrentUser();

  const navItems = [
    user?.is_host
      ? { title: "My listings", href: "/listings/mine", icon: Book }
      : { title: "My bookings", href: "/bookings", icon: Book },
    { title: "Browse", href: "/listings", icon: SearchIcon },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3 text-sm font-semibold tracking-tight">
        Bookings App
      </SidebarHeader>
      <SidebarContent>
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
      </SidebarContent>
      {user && <SidebarUserFooter name={user.name} email={user.email} />}
    </Sidebar>
  );
}
