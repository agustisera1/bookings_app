import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/services/auth";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserFooter } from "./sidebar-user-footer";
import Link from "next/link";
import { Tent } from "lucide-react";
import { getNotificationsCount } from "@/lib/services/notifications";

export async function AppSidebar() {
  const user = await getCurrentUser();
  const notifications = await getNotificationsCount();

  return (
    <Sidebar>
      <SidebarHeader className="p-3">
        <Link
          href="/listings"
          className="flex items-center gap-2.5 rounded-md px-1 py-1 transition-opacity hover:opacity-80"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success text-success-foreground shadow-sm">
            <Tent className="size-4.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Bookings App
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav
          notifications={notifications.ok ? notifications.data : 0}
          isHost={!!user?.is_host}
        />
      </SidebarContent>
      {user && <SidebarUserFooter name={user.name} email={user.email} />}
    </Sidebar>
  );
}
