import {
  BadgeDollarSign,
  BarChart3,
  Bell,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  DatabaseBackup,
  Gift,
  Home,
  IdCard,
  Megaphone,
  Package,
  Settings,
  UserRound,
  Store,
  Users,
  WalletCards,
} from "lucide-react";
import type { ComponentType } from "react";
import type { BusinessRole, ModuleKey } from "@/types/business";

export type NavItem = {
  label: string;
  href: string;
  moduleKey?: ModuleKey;
  ownerOnly?: boolean;
  allowedRoles?: BusinessRole[];
  icon: ComponentType<{ className?: string }>;
};

export const dashboardNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Customers", href: "/dashboard/customers", moduleKey: "core", icon: Users },
  { label: "Bookings", href: "/dashboard/bookings", moduleKey: "bookings", icon: CalendarDays },
  { label: "Memberships", href: "/dashboard/memberships", moduleKey: "memberships", icon: IdCard },
  { label: "Loyalty", href: "/dashboard/loyalty", moduleKey: "loyalty", icon: Gift },
  { label: "POS", href: "/dashboard/pos", moduleKey: "pos", icon: Store },
  { label: "Inventory", href: "/dashboard/inventory", moduleKey: "inventory", icon: Boxes },
  { label: "Staff", href: "/dashboard/staff", moduleKey: "staff", icon: BriefcaseBusiness },
  { label: "Commission", href: "/dashboard/staff-commission", moduleKey: "staff_commission", icon: BadgeDollarSign },
  { label: "Payments", href: "/dashboard/payments", moduleKey: "payments", icon: CircleDollarSign },
  { label: "Reports", href: "/dashboard/reports", moduleKey: "reports", icon: BarChart3 },
  { label: "Marketing", href: "/dashboard/marketing", moduleKey: "marketing", icon: Megaphone },
  { label: "Notifications", href: "/dashboard/notifications", moduleKey: "notifications", icon: Bell },
  { label: "Branches", href: "/dashboard/branches", moduleKey: "branches", icon: Package },
  { label: "Settings", href: "/settings", moduleKey: "settings", icon: Settings },
  { label: "Profile", href: "/settings/profile", moduleKey: "settings", icon: UserRound },
  { label: "Data Backup", href: "/settings/data-backup", moduleKey: "data_backup", ownerOnly: true, icon: DatabaseBackup },
];

export const portalNavItems: NavItem[] = [
  { label: "Portal", href: "/portal", moduleKey: "customer_portal", icon: WalletCards },
  { label: "Bookings", href: "/portal", moduleKey: "bookings", icon: CalendarDays },
  { label: "Membership", href: "/portal", moduleKey: "memberships", icon: IdCard },
  { label: "Rewards", href: "/portal", moduleKey: "loyalty", icon: Gift },
];
