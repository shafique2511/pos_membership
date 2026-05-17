import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { BusinessProvider } from "@/features/business/business-context";
import { AuthProvider } from "@/features/auth/auth-context";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ToastProvider>
      <AuthProvider>
        <BusinessProvider>{children}</BusinessProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
