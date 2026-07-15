import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NotificationsProvider } from "@/components/notifications/provider";
import { getNotificationsCount } from "@/lib/services/notifications";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Seed the live counter with the server's current unread count. The provider
  // owns it from here on, bumping it as SSE events arrive.
  const count = await getNotificationsCount();

  return (
    <NotificationsProvider initialCount={count.ok ? count.data : 0}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="h-screen overflow-y-auto">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </NotificationsProvider>
  );
}
