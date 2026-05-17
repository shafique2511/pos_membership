import { useState } from "react";
import { Outlet } from "react-router-dom";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Topbar } from "@/components/navigation/Topbar";

export function BusinessDashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <MobileNavigation open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </div>
  );
}
