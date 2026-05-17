import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ErrorState, LoadingState } from "@/components/shared/StateViews";
import { useAuth } from "@/features/auth/auth-context";
import { canExportBusinessData, canExportReports, hasModuleAccess, hasRole, requireAuth } from "@/lib/auth/access";
import type { BusinessRole, ModuleKey } from "@/types/business";

type GuardProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: GuardProps) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) return <LoadingState title="Checking session" />;

  if (!requireAuth(auth)) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function PublicOnlyRoute({ children }: GuardProps) {
  const auth = useAuth();

  if (auth.loading) return <LoadingState title="Checking session" />;

  if (auth.user && auth.profile?.role === "customer") {
    return <Navigate to="/portal" replace />;
  }

  if (auth.user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export function RequireRole({ roles, children }: GuardProps & { roles: BusinessRole | BusinessRole[] }) {
  const auth = useAuth();

  if (auth.loading) return <LoadingState title="Checking role" />;

  if (!hasRole(auth, roles)) {
    return <AccessDenied description="Your current role cannot access this page." />;
  }

  return children;
}

export function RequireModule({ moduleKey, children }: GuardProps & { moduleKey: ModuleKey }) {
  const auth = useAuth();

  if (auth.loading) return <LoadingState title="Checking module access" />;

  if (!hasModuleAccess(auth, moduleKey)) {
    return <AccessDenied description="This module is disabled for this business." />;
  }

  return children;
}

export function RequireOwner({ children }: GuardProps) {
  const auth = useAuth();

  if (auth.loading) return <LoadingState title="Checking owner access" />;

  if (!canExportBusinessData(auth)) {
    return <AccessDenied description="Only the Owner can access full business backup and export." />;
  }

  return children;
}

export function RequireReportExport({ children }: GuardProps) {
  const auth = useAuth();

  if (auth.loading) return <LoadingState title="Checking export permission" />;

  if (!canExportReports(auth)) {
    return <AccessDenied description="Report export requires Owner access or Manager export permission." />;
  }

  return children;
}

function AccessDenied({ description }: { description: string }) {
  return (
    <div className="grid gap-4">
      <ErrorState title="Access denied" description={description} />
    </div>
  );
}
