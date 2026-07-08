import type { ReactNode } from "react";
import { verifySession } from "@/lib/dal";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { UserMenu } from "@/components/dashboard/user-menu";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await verifySession();
  const { user } = session;

  return (
    <SidebarProvider>
      <AppSidebar role={user.role} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
            <p className="text-sm font-medium text-muted-foreground">
              Election Security Duty Management System
            </p>
          </div>
          <UserMenu name={user.name} email={user.email} rank={user.rank} />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
