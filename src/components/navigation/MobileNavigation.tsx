import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dashboardNavItems } from "@/components/navigation/nav-items";
import { useBusiness } from "@/features/business/business-context";
import { cn } from "@/lib/utils/cn";

type MobileNavigationProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavigation({ open, onClose }: MobileNavigationProps) {
  const { isModuleEnabled, role } = useBusiness();

  if (!open) return null;

  const visibleItems = dashboardNavItems.filter((item) => {
    if (item.ownerOnly && role !== "owner") return false;
    if (item.allowedRoles && !item.allowedRoles.includes(role)) return false;
    return !item.moduleKey || isModuleEnabled(item.moduleKey);
  });

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] border-r bg-card shadow-xl">
        <div className="flex h-16 items-center justify-between border-b px-4">
          <p className="font-semibold">Luxantara Members</p>
          <Button aria-label="Close navigation" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="space-y-1 p-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/dashboard" || item.href === "/settings"}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground",
                    isActive && "bg-secondary text-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
