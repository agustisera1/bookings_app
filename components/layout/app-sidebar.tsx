import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/services/auth";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserFooter } from "./sidebar-user-footer";
import Image from "next/image";
import Link from "next/link";
import logo from "@/public/logo.png";

export async function AppSidebar() {
  const user = await getCurrentUser();

  return (
    <Sidebar>
      <SidebarHeader className="items-center p-4 px-8">
        <Link
          href="/listings"
          className="group block w-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Image
            src={logo}
            alt="Greenaway"
            priority
            className="h-auto w-full transition-transform duration-300 ease-out motion-safe:group-hover:-rotate-1 motion-safe:group-hover:scale-[1.03]"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav isHost={!!user?.is_host} />
      </SidebarContent>
      {user && <SidebarUserFooter name={user.name} email={user.email} />}
    </Sidebar>
  );
}
