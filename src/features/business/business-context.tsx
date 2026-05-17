import { createContext, useContext, useMemo, type ReactNode } from "react";
import { businessTypeVocabulary } from "@/features/business/business-types";
import { defaultModules } from "@/features/business/modules";
import { useAuth } from "@/features/auth/auth-context";
import type { BusinessContextValue, BusinessTypeKey, ModuleKey } from "@/types/business";

const BusinessContext = createContext<BusinessContextValue | null>(null);

type BusinessProviderProps = {
  children: ReactNode;
};

export function BusinessProvider({ children }: BusinessProviderProps) {
  const { business, enabledModules, profile, loading } = useAuth();
  const businessType: BusinessTypeKey = business?.business_types?.type_key ?? "coffee_shop";

  const value = useMemo<BusinessContextValue>(() => {
    const dbModuleKeys = new Set(enabledModules.map((module) => module.module_key));
    const modules = defaultModules.map((module) => ({
      ...module,
      enabled: module.core || dbModuleKeys.has(module.key) || (!business && module.enabled),
    }));
    const enabledModuleKeys = modules.filter((module) => module.enabled).map((module) => module.key);

    return {
      businessName: business?.name ?? "Luxantara Members",
      businessType,
      role: profile?.role ?? (business ? "owner" : "owner"),
      modules,
      enabledModuleKeys,
      loading,
      getBusinessLabel(label: string) {
        return businessTypeVocabulary[businessType][label] ?? label;
      },
      isModuleEnabled(moduleKey: ModuleKey) {
        return enabledModuleKeys.includes(moduleKey);
      },
    };
  }, [business, businessType, enabledModules, loading, profile]);

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const value = useContext(BusinessContext);

  if (!value) {
    throw new Error("useBusiness must be used within BusinessProvider");
  }

  return value;
}
