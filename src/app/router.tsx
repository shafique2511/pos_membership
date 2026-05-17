import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { BusinessDashboardLayout } from "@/layouts/BusinessDashboardLayout";
import { CustomerPortalLayout } from "@/layouts/CustomerPortalLayout";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ModulePage } from "@/pages/dashboard/ModulePage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { BookingsPage } from "@/pages/dashboard/BookingsPage";
import { MembershipsPage } from "@/pages/dashboard/MembershipsPage";
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
import { CustomerBookingsPage } from "@/pages/portal/CustomerBookingsPage";
import { CustomerMembershipPage } from "@/pages/portal/CustomerMembershipPage";
import { CustomerRewardsPage } from "@/pages/portal/CustomerRewardsPage";
import { PublicBookingPage } from "@/pages/public/PublicBookingPage";
import { LoyaltyPage } from "@/pages/dashboard/LoyaltyPage";
import { PosPage } from "@/pages/dashboard/PosPage";
import { InventoryPage } from "@/pages/dashboard/InventoryPage";
import { BranchesPage } from "@/pages/dashboard/BranchesPage";

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
      { path: "bookings", element: <RequireModule moduleKey="bookings"><BookingsPage /></RequireModule> },
      { path: "memberships", element: <RequireModule moduleKey="memberships"><MembershipsPage /></RequireModule> },
      { path: "loyalty", element: <RequireModule moduleKey="loyalty"><LoyaltyPage /></RequireModule> },
      { path: "pos", element: <RequireModule moduleKey="pos"><PosPage /></RequireModule> },
      { path: "inventory", element: <RequireModule moduleKey="inventory"><InventoryPage /></RequireModule> },
      { path: "staff", element: <RequireModule moduleKey="staff"><ModulePage moduleKey="staff" title="Staff" /></RequireModule> },
      { path: "staff-commission", element: <RequireModule moduleKey="staff_commission"><ModulePage moduleKey="staff_commission" title="Staff Commission" /></RequireModule> },
      { path: "payments", element: <RequireModule moduleKey="payments"><ModulePage moduleKey="payments" title="Payments" /></RequireModule> },
      { path: "reports", element: <RequireModule moduleKey="reports"><ModulePage moduleKey="reports" title="Reports" /></RequireModule> },
      { path: "marketing", element: <RequireModule moduleKey="marketing"><ModulePage moduleKey="marketing" title="Marketing" /></RequireModule> },
      { path: "notifications", element: <RequireModule moduleKey="notifications"><ModulePage moduleKey="notifications" title="Notifications" /></RequireModule> },
      { path: "branches", element: <RequireModule moduleKey="branches"><BranchesPage /></RequireModule> },
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
      {
        path: "bookings",
        element: (
          <ProtectedRoute>
            <RequireRole roles="customer">
              <CustomerBookingsPage />
            </RequireRole>
          </ProtectedRoute>
        ),
      },
      {
        path: "membership",
        element: (
          <ProtectedRoute>
            <RequireRole roles="customer">
              <CustomerMembershipPage />
            </RequireRole>
          </ProtectedRoute>
        ),
      },
      {
        path: "rewards",
        element: (
          <ProtectedRoute>
            <RequireRole roles="customer">
              <CustomerRewardsPage />
            </RequireRole>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/public/:businessSlug/book",
    element: <PublicBookingPage />,
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
