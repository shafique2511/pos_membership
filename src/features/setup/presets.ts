import type { BusinessTypeKey, ModuleKey } from "@/types/business";

export type BusinessPresetConfig = {
  recommended: ModuleKey[];
  optional: ModuleKey[];
};

export const setupPresets: Partial<Record<BusinessTypeKey, BusinessPresetConfig>> = {
  barber_shop: {
    recommended: ["core", "bookings", "memberships", "loyalty", "pos", "staff", "payments", "reports", "customer_portal", "settings", "data_backup"],
    optional: ["inventory", "staff_commission", "marketing", "branches", "notifications"],
  },
  coffee_shop: {
    recommended: ["core", "pos", "loyalty", "memberships", "inventory", "payments", "reports", "customer_portal", "settings", "data_backup"],
    optional: ["bookings", "staff", "staff_commission", "marketing", "branches", "notifications"],
  },
  clinic: {
    recommended: ["core", "bookings", "staff", "payments", "notifications", "reports", "customer_portal", "settings", "data_backup"],
    optional: ["memberships", "loyalty", "pos", "inventory", "marketing", "branches"],
  },
  custom_business: {
    recommended: ["core", "settings", "data_backup"],
    optional: ["bookings", "memberships", "loyalty", "pos", "inventory", "staff", "staff_commission", "payments", "notifications", "reports", "marketing", "branches", "customer_portal"],
  },
};

export function hasSetupPreset(businessType: BusinessTypeKey) {
  return Boolean(setupPresets[businessType]);
}
