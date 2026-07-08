import type { Role } from "@/generated/prisma/enums";
import {
  LayoutDashboard,
  Users,
  MapPinned,
  ClipboardList,
  IdCard,
  BarChart3,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

const ALL_NAV_ITEMS: (NavItem & { roles: Role[] })[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["IGP", "AIG", "CP", "DPO", "SPO"],
  },
  {
    title: "Personnel",
    href: "/personnel",
    icon: Users,
    roles: ["IGP", "AIG", "CP", "DPO"],
  },
  {
    title: "Polling Units",
    href: "/polling-units",
    icon: MapPinned,
    roles: ["IGP", "AIG", "CP", "DPO"],
  },
  {
    title: "Allocation",
    href: "/allocation",
    icon: ClipboardList,
    roles: ["IGP", "AIG", "CP", "DPO"],
  },
  {
    title: "Duty Cards",
    href: "/duty-cards",
    icon: IdCard,
    roles: ["IGP", "AIG", "CP", "DPO", "SPO"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["IGP", "AIG", "CP", "DPO"],
  },
  {
    title: "Admin",
    href: "/admin",
    icon: ShieldCheck,
    roles: ["IGP"],
  },
];

export function getNavItemsForRole(role: Role): NavItem[] {
  return ALL_NAV_ITEMS.filter((item) => item.roles.includes(role)).map(
    ({ title, href, icon }) => ({ title, href, icon })
  );
}
