"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getNavItemsForRole } from "@/components/dashboard/nav-items";
import type { Role } from "@/generated/prisma/enums";

const ROLE_LABEL: Record<Role, string> = {
  IGP: "National command",
  AIG: "Zonal command",
  CP: "State command",
  DPO: "LGA / Division",
  SPO: "Field officer",
};

export function AppSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = getNavItemsForRole(role);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-sidebar-primary">
            <span className="font-heading text-[11px] font-semibold text-sidebar-primary">
              NPF
            </span>
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate font-heading text-sm font-semibold uppercase">
              ESDMS
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {ROLE_LABEL[role]}
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
