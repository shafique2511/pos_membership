import { supabase } from "@/lib/supabase/client";
import type { AuthState, BusinessRecord, EnabledModuleRecord, RolePermission, UserProfile } from "@/types/auth";
import type { BusinessRole, ModuleKey } from "@/types/business";

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getUserProfile(userId?: string): Promise<UserProfile | null> {
  const targetUserId = userId ?? (await getCurrentUser())?.id;
  if (!targetUserId) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", targetUserId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as UserProfile | null;
}

export async function getBusiness(businessId?: string | null): Promise<BusinessRecord | null> {
  if (!businessId) return null;

  const { data, error } = await supabase
    .from("businesses")
    .select("*, business_types(type_key, name)")
    .eq("id", businessId)
    .maybeSingle();

  if (error) throw error;
  return data as BusinessRecord | null;
}

export async function getEnabledModules(businessId?: string | null): Promise<EnabledModuleRecord[]> {
  if (!businessId) return [];

  const { data, error } = await supabase
    .from("business_modules")
    .select("module_key, is_enabled, settings, modules(module_name, description, is_core)")
    .eq("business_id", businessId)
    .eq("is_enabled", true);

  if (error) throw error;
  return (data ?? []).map((item) => {
    const relatedModule = Array.isArray(item.modules) ? item.modules[0] : item.modules;

    return {
      module_key: item.module_key,
      is_enabled: item.is_enabled,
      settings: item.settings ?? {},
      modules: relatedModule
        ? {
            module_name: relatedModule.module_name,
            description: relatedModule.description,
            is_core: relatedModule.is_core,
          }
        : null,
    };
  }) as EnabledModuleRecord[];
}

export async function getRolePermissions(businessId?: string | null, role?: BusinessRole): Promise<RolePermission[]> {
  if (!businessId || !role) return [];

  const { data, error } = await supabase
    .from("role_permissions")
    .select("*")
    .eq("business_id", businessId)
    .eq("role", role);

  if (error) throw error;
  return (data ?? []) as RolePermission[];
}

export function hasRole(state: AuthState, roles: BusinessRole | BusinessRole[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const metadataRole = state.user?.user_metadata.role as BusinessRole | undefined;
  const currentRole = state.profile?.role ?? metadataRole;
  return Boolean(currentRole && allowedRoles.includes(currentRole));
}

export function hasPermission(state: AuthState, moduleKey: ModuleKey | string, permission: keyof Pick<RolePermission, "can_view" | "can_create" | "can_update" | "can_delete" | "can_export">) {
  if (state.profile?.role === "owner") return true;

  return state.permissions.some((item) => item.module_key === moduleKey && item[permission]);
}

export function hasModuleAccess(state: AuthState, moduleKey: ModuleKey) {
  if (moduleKey === "core" || moduleKey === "settings" || moduleKey === "data_backup") {
    return state.profile?.role === "owner" || moduleKey !== "data_backup";
  }

  return state.enabledModules.some((module) => module.module_key === moduleKey && module.is_enabled);
}

export function canExportBusinessData(state: AuthState) {
  return hasRole(state, "owner") && hasModuleAccess(state, "data_backup");
}

export function canExportReports(state: AuthState) {
  return canExportBusinessData(state) || (hasRole(state, "manager") && hasPermission(state, "reports", "can_export"));
}

export async function canExportBusinessDataFromDb() {
  const { data, error } = await supabase.rpc("can_export_business_data");
  if (error) throw error;
  return Boolean(data);
}

export async function canExportReportsFromDb() {
  const { data, error } = await supabase.rpc("can_export_reports");
  if (error) throw error;
  return Boolean(data);
}

export function requireAuth(state: AuthState) {
  return Boolean(state.user);
}

export function requireRole(state: AuthState, roles: BusinessRole | BusinessRole[]) {
  return requireAuth(state) && hasRole(state, roles);
}

export function requireModule(state: AuthState, moduleKey: ModuleKey) {
  return requireAuth(state) && hasModuleAccess(state, moduleKey);
}

export function requireOwner(state: AuthState) {
  return requireRole(state, "owner");
}
