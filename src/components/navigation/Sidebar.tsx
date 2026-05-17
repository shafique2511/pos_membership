import { NavLink } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { dashboardNavItems } from "@/components/navigation/nav-items";
import { useBusiness } from "@/features/business/business-context";
import { businessTypeLabels } from "@/features/business/business-types";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const { businessName, businessType, isModuleVisible, role } = useBusiness();
  const visibleItems = dashboardNavItems.filter((item) => {
    if (item.ownerOnly && role !== "owner") return false;
    if (item.allowedRoles && !item.allowedRoles.includes(role)) return false;
    return !item.moduleKey || isModuleVisible(item.moduleKey);
  });

  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r bg-card lg:sticky lg:top-0 lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b p-5">
          <p className="text-lg font-semibold">{businessName}</p>
          <Badge className="mt-2" variant="outline">
            {businessTypeLabels[businessType]}
          </Badge>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/dashboard" || item.href === "/settings"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
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
    </aside>
  );
}
