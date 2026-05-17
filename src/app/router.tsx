import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { BusinessDashboardLayout } from "@/layouts/BusinessDashboardLayout";
import { CustomerPortalLayout } from "@/layouts/CustomerPortalLayout";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ModulePage } from "@/pages/dashboard/ModulePage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { SetupWizardPage } from "@/pages/dashboard/SetupWizardPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { DataBackupPage } from "@/pages/settings/DataBackupPage";
import { ModuleSettingsPage } from "@/pages/settings/ModuleSettingsPage";
import { CustomerPortalPage } from "@/pages/portal/CustomerPortalPage";
import { ProtectedRoute, PublicOnlyRoute, RequireModule, RequireOwner, RequireRole } from "@/components/auth/RouteGuards";
import { StaffInvitePage } from "@/pages/settings/StaffInvitePage";
import { ProfilePage } from "@/pages/settings/ProfilePage";
import { CustomerLoginPage } from "@/pages/portal/CustomerLoginPage";
import { CustomerRegisterPage } from "@/pages/portal/CustomerRegisterPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/auth",
    element: (
      <PublicOnlyRoute>
        <AuthLayout />
      </PublicOnlyRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
    ],
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <RequireRole roles={["owner", "manager", "staff"]}>
          <BusinessDashboardLayout />
        </RequireRole>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "setup", element: <RequireRole roles="owner"><SetupWizardPage /></RequireRole> },
      { path: "customers", element: <ModulePage moduleKey="customers" title="Customers" /> },
      { path: "bookings", element: <RequireModule moduleKey="bookings"><ModulePage moduleKey="bookings" title="Bookings" /></RequireModule> },
      { path: "memberships", element: <RequireModule moduleKey="memberships"><ModulePage moduleKey="memberships" title="Memberships" /></RequireModule> },
      { path: "loyalty", element: <RequireModule moduleKey="loyalty"><ModulePage moduleKey="loyalty" title="Loyalty & Rewards" /></RequireModule> },
      { path: "pos", element: <RequireModule moduleKey="pos"><ModulePage moduleKey="pos" title="POS" /></RequireModule> },
      { path: "inventory", element: <RequireModule moduleKey="inventory"><ModulePage moduleKey="inventory" title="Inventory" /></RequireModule> },
      { path: "staff", element: <RequireModule moduleKey="staff"><ModulePage moduleKey="staff" title="Staff" /></RequireModule> },
      { path: "staff-commission", element: <RequireModule moduleKey="staff_commission"><ModulePage moduleKey="staff_commission" title="Staff Commission" /></RequireModule> },
      { path: "payments", element: <RequireModule moduleKey="payments"><ModulePage moduleKey="payments" title="Payments" /></RequireModule> },
      { path: "reports", element: <RequireModule moduleKey="reports"><ModulePage moduleKey="reports" title="Reports" /></RequireModule> },
      { path: "marketing", element: <RequireModule moduleKey="marketing"><ModulePage moduleKey="marketing" title="Marketing" /></RequireModule> },
      { path: "notifications", element: <RequireModule moduleKey="notifications"><ModulePage moduleKey="notifications" title="Notifications" /></RequireModule> },
      { path: "branches", element: <RequireModule moduleKey="branches"><ModulePage moduleKey="branches" title="Branches" /></RequireModule> },
    ],
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <RequireRole roles={["owner", "manager", "staff"]}>
          <BusinessDashboardLayout />
        </RequireRole>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <SettingsPage /> },
      { path: "modules", element: <RequireOwner><ModuleSettingsPage /></RequireOwner> },
      { path: "profile", element: <ProfilePage /> },
      { path: "staff-invite", element: <RequireRole roles={["owner", "manager"]}><StaffInvitePage /></RequireRole> },
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
    children: [
      { path: "login", element: <CustomerLoginPage /> },
      { path: "register", element: <CustomerRegisterPage /> },
      {
        index: true,
        element: (
          <ProtectedRoute>
            <RequireRole roles="customer">
              <CustomerPortalPage />
            </RequireRole>
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <RequireRole roles="customer">
              <ProfilePage />
            </RequireRole>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
