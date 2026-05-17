export type BusinessTypeKey =
  | "barber_shop"
  | "coffee_shop"
  | "salon"
  | "spa"
  | "clinic"
  | "event_space"
  | "custom_business";

export type BusinessRole = "owner" | "manager" | "staff" | "customer";

export type ModuleKey =
  | "core"
  | "bookings"
  | "memberships"
  | "loyalty"
  | "pos"
  | "inventory"
  | "staff"
  | "staff_commission"
  | "payments"
  | "notifications"
  | "reports"
  | "marketing"
  | "branches"
  | "customer_portal"
  | "settings"
  | "data_backup";

export type BusinessModule = {
  key: ModuleKey;
  name: string;
  description: string;
  enabled: boolean;
  core?: boolean;
};

export type BusinessContextValue = {
  businessName: string;
  businessType: BusinessTypeKey;
  role: BusinessRole;
  modules: BusinessModule[];
  enabledModuleKeys: ModuleKey[];
  loading: boolean;
  getBusinessLabel: (label: string) => string;
  isModuleEnabled: (moduleKey: ModuleKey) => boolean;
};
