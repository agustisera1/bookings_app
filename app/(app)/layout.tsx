import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NotificationsProvider } from "@/components/notifications/provider";
import { query } from "@/lib/apollo/client";
import { GetSidebarCountsDocument } from "@/lib/apollo/__generated__/operations";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Seeds the live counters; the provider owns them afterwards as SSE frames arrive.
  const { data } = await query({ query: GetSidebarCountsDocument, errorPolicy: "all" });

  return (
    <NotificationsProvider
      initialCount={data?.notificationsCount ?? 0}
      initialMessages={data?.unreadMessagesCount ?? 0}
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
