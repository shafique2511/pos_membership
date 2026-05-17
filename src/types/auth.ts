import type { User } from "@supabase/supabase-js";
import type { BusinessRole, BusinessTypeKey, ModuleKey } from "@/types/business";

export type UserProfile = {
  id: string;
  user_id: string;
  business_id: string | null;
  branch_id: string | null;
  role: BusinessRole;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  permissions: Record<string, unknown>;
};

export type BusinessRecord = {
  id: string;
  business_type_id: string | null;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  status: string;
  owner_id: string | null;
  business_types?: {
    type_key: BusinessTypeKey;
    name: string;
  } | null;
};

export type EnabledModuleRecord = {
  module_key: ModuleKey;
  is_enabled: boolean;
  settings: Record<string, unknown>;
  modules?: {
    module_name: string;
    description: string | null;
    is_core: boolean;
  } | null;
};

export type RolePermission = {
  role: BusinessRole;
  module_key: ModuleKey | string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_export: boolean;
  permissions: Record<string, unknown>;
};

export type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  business: BusinessRecord | null;
  enabledModules: EnabledModuleRecord[];
  permissions: RolePermission[];
  loading: boolean;
};
