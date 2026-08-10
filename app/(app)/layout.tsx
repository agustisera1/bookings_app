import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NotificationsProvider } from "@/components/notifications/provider";
import { getNotificationsCount } from "@/lib/services/notifications";
import { getUnreadMessagesCount } from "@/lib/services/chat";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Seed the live counters with the server's current unread state. The provider
  // owns them from here on, bumping them as SSE frames arrive. In parallel: the
  // two are independent, and the shell waits on the slower one either way.
  const [count, messages] = await Promise.all([
    getNotificationsCount(),
    getUnreadMessagesCount(),
  ]);

  return (
    <NotificationsProvider
      initialCount={count.ok ? count.data : 0}
      initialMessages={messages.ok ? messages.data : 0}
    >
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="h-screen overflow-y-auto">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </NotificationsProvider>
  );
}
