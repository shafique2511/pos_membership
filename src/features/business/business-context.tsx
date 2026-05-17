import { createContext, useContext, useMemo, type ReactNode } from "react";
import { businessTypeVocabulary } from "@/features/business/business-types";
import { defaultModules } from "@/features/business/modules";
import type { BusinessContextValue, BusinessTypeKey, ModuleKey } from "@/types/business";

const BusinessContext = createContext<BusinessContextValue | null>(null);

type BusinessProviderProps = {
  children: ReactNode;
};

export function BusinessProvider({ children }: BusinessProviderProps) {
  const businessType: BusinessTypeKey = "coffee_shop";
  const modules = defaultModules;

  const value = useMemo<BusinessContextValue>(() => {
    const enabledModuleKeys = modules.filter((module) => module.enabled).map((module) => module.key);

    return {
      businessName: "Luxantara Members",
      businessType,
      role: "owner",
      modules,
      enabledModuleKeys,
      getBusinessLabel(label: string) {
        return businessTypeVocabulary[businessType][label] ?? label;
      },
      isModuleEnabled(moduleKey: ModuleKey) {
        return enabledModuleKeys.includes(moduleKey);
      },
    };
  }, [businessType, modules]);

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const value = useContext(BusinessContext);

  if (!value) {
    throw new Error("useBusiness must be used within BusinessProvider");
  }

  return value;
}
