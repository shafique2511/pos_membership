import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ErrorState } from "@/components/shared/StateViews";
import { useBusiness } from "@/features/business/business-context";

type RequireOwnerProps = {
  children: ReactNode;
};

export function RequireOwner({ children }: RequireOwnerProps) {
  const { role } = useBusiness();

  if (role !== "owner") {
    return (
      <div className="grid gap-4">
        <ErrorState title="Owner access required" description="Only the Owner can perform full business backup and data export actions." />
        <Navigate to="/dashboard" replace />
      </div>
    );
  }

  return children;
}
