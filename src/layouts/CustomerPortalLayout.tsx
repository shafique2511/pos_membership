import { NavLink, Outlet } from "react-router-dom";
import { portalNavItems } from "@/components/navigation/nav-items";
import { useBusiness } from "@/features/business/business-context";
import { cn } from "@/lib/utils/cn";

export function CustomerPortalLayout() {
  const { isModuleEnabled } = useBusiness();
  const visibleItems = portalNavItems.filter((item) => !item.moduleKey || isModuleEnabled(item.moduleKey));

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-card px-4 py-4">
        <p className="text-lg font-semibold">Luxantara Members</p>
        <p className="text-sm text-muted-foreground">Customer portal</p>
      </header>
      <main className="px-4 py-5">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t bg-card">
        {visibleItems.slice(0, 4).map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.label}
              to={item.href}
              className={({ isActive }) =>
                cn("flex flex-col items-center gap-1 px-2 py-3 text-xs text-muted-foreground", isActive && "text-primary")
              }
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
