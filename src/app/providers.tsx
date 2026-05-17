import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { BusinessProvider } from "@/features/business/business-context";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ToastProvider>
      <BusinessProvider>{children}</BusinessProvider>
    </ToastProvider>
  );
}
