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
  // Seeds the live counters; the provider owns them afterwards as SSE frames arrive.
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
        <SidebarInset className="h-dvh overflow-y-auto">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </NotificationsProvider>
  );
}
