import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/services/auth";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserFooter } from "./sidebar-user-footer";

export async function AppSidebar() {
  const user = await getCurrentUser();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3 text-sm font-semibold tracking-tight">
        Bookings App
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav isHost={!!user?.is_host} />
      </SidebarContent>
      {user && <SidebarUserFooter name={user.name} email={user.email} />}
    </Sidebar>
  );
}
