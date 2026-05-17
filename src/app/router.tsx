import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { BusinessDashboardLayout } from "@/layouts/BusinessDashboardLayout";
import { CustomerPortalLayout } from "@/layouts/CustomerPortalLayout";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ModulePage } from "@/pages/dashboard/ModulePage";
import { SetupWizardPage } from "@/pages/dashboard/SetupWizardPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { DataBackupPage } from "@/pages/settings/DataBackupPage";
import { CustomerPortalPage } from "@/pages/portal/CustomerPortalPage";
import { RequireOwner } from "@/components/auth/RequireOwner";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
    ],
  },
  {
    path: "/dashboard",
    element: <BusinessDashboardLayout />,
    children: [
      { index: true, element: <ModulePage moduleKey="dashboard" title="Dashboard" /> },
      { path: "setup", element: <SetupWizardPage /> },
      { path: "customers", element: <ModulePage moduleKey="customers" title="Customers" /> },
      { path: "bookings", element: <ModulePage moduleKey="bookings" title="Bookings" /> },
      { path: "memberships", element: <ModulePage moduleKey="memberships" title="Memberships" /> },
      { path: "loyalty", element: <ModulePage moduleKey="loyalty" title="Loyalty & Rewards" /> },
      { path: "pos", element: <ModulePage moduleKey="pos" title="POS" /> },
      { path: "inventory", element: <ModulePage moduleKey="inventory" title="Inventory" /> },
      { path: "staff", element: <ModulePage moduleKey="staff" title="Staff" /> },
      { path: "staff-commission", element: <ModulePage moduleKey="staff_commission" title="Staff Commission" /> },
      { path: "payments", element: <ModulePage moduleKey="payments" title="Payments" /> },
      { path: "reports", element: <ModulePage moduleKey="reports" title="Reports" /> },
      { path: "marketing", element: <ModulePage moduleKey="marketing" title="Marketing" /> },
      { path: "notifications", element: <ModulePage moduleKey="notifications" title="Notifications" /> },
      { path: "branches", element: <ModulePage moduleKey="branches" title="Branches" /> },
    ],
  },
  {
    path: "/settings",
    element: <BusinessDashboardLayout />,
    children: [
      { index: true, element: <SettingsPage /> },
      {
        path: "data-backup",
        element: (
          <RequireOwner>
            <DataBackupPage />
          </RequireOwner>
        ),
      },
    ],
  },
  {
    path: "/portal",
    element: <CustomerPortalLayout />,
    children: [{ index: true, element: <CustomerPortalPage /> }],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
