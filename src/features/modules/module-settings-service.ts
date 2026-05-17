import { supabase } from "@/lib/supabase/client";
import { defaultModules } from "@/features/business/modules";
import type { BusinessModule, ModuleKey } from "@/types/business";

export type ModuleSettingState = BusinessModule & {
  sidebarVisible: boolean;
  settings: Record<string, unknown>;
};

export type DisableSafetyResult = {
  safe: boolean;
  requiresConfirmation: boolean;
  message: string;
};

export async function getModuleSettingState(businessId: string): Promise<ModuleSettingState[]> {
  const { data, error } = await supabase
    .from("business_modules")
    .select("module_key, is_enabled, settings")
    .eq("business_id", businessId);

  if (error) throw error;

  const businessModuleMap = new Map(
    (data ?? []).map((item) => [
      item.module_key as ModuleKey,
      {
        enabled: Boolean(item.is_enabled),
        settings: (item.settings ?? {}) as Record<string, unknown>,
      },
    ])
  );

  return defaultModules.map((module) => {
    const stored = businessModuleMap.get(module.key);
    const settings = stored?.settings ?? {};

    return {
      ...module,
      enabled: module.core ? true : stored?.enabled ?? module.enabled,
      settings,
      sidebarVisible: settings.sidebar_visible !== false,
    };
  });
}

export async function checkDisableSafety(businessId: string, moduleKey: ModuleKey): Promise<DisableSafetyResult> {
  if (moduleKey === "core" || moduleKey === "settings") {
    return { safe: false, requiresConfirmation: false, message: "This core module cannot be disabled." };
  }

  if (moduleKey === "data_backup") {
    return {
      safe: false,
      requiresConfirmation: false,
      message: "Data Backup access cannot be removed from the Owner. You may hide it from sidebar settings later.",
    };
  }

  if (moduleKey === "bookings") {
    const today = new Date().toISOString().slice(0, 10);
    const { count, error } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("booking_date", today)
      .in("status", ["pending", "confirmed", "checked_in", "rescheduled"]);

    if (error) throw error;

    if ((count ?? 0) > 0) {
      return {
        safe: true,
        requiresConfirmation: true,
        message: `There are ${count} active future bookings. Disabling Booking hides booking screens but keeps old data exportable.`,
      };
    }
  }

  if (moduleKey === "branches") {
    const { count, error } = await supabase
      .from("branches")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .is("deleted_at", null);

    if (error) throw error;

    if ((count ?? 0) > 1) {
      return {
        safe: true,
        requiresConfirmation: true,
        message: `There are ${count} branches. Disabling Multi-Branch hides branch screens but branch_id isolation remains in the database.`,
      };
    }
  }

  if (["pos", "inventory", "memberships", "loyalty"].includes(moduleKey)) {
    return {
      safe: true,
      requiresConfirmation: true,
      message: "This module can be disabled after confirmation. Existing data remains protected and exportable by the Owner.",
    };
  }

  return {
    safe: true,
    requiresConfirmation: false,
    message: "This module can be disabled safely.",
  };
}

export async function setBusinessModuleEnabled(params: {
  businessId: string;
  moduleKey: ModuleKey;
  enabled: boolean;
  userId: string;
}) {
  const now = new Date().toISOString();

  const { error } = await supabase.from("business_modules").upsert(
    {
      business_id: params.businessId,
      module_key: params.moduleKey,
      is_enabled: params.enabled,
      enabled_by: params.enabled ? params.userId : null,
      disabled_by: params.enabled ? null : params.userId,
      enabled_at: params.enabled ? now : null,
      disabled_at: params.enabled ? null : now,
      updated_by: params.userId,
      created_by: params.userId,
    },
    { onConflict: "business_id,module_key" }
  );

  if (error) throw error;

  await writeModuleAudit({
    businessId: params.businessId,
    userId: params.userId,
    moduleKey: params.moduleKey,
    action: params.enabled ? "module_enabled" : "module_disabled",
    values: { is_enabled: params.enabled },
  });
}

export async function saveModuleSettings(params: {
  businessId: string;
  moduleKey: ModuleKey;
  userId: string;
  settings: Record<string, unknown>;
  moduleEnabled: boolean;
}) {
  const { error: businessModuleError } = await supabase
    .from("business_modules")
    .upsert(
      {
        business_id: params.businessId,
        module_key: params.moduleKey,
        settings: params.settings,
        updated_by: params.userId,
        created_by: params.userId,
      },
      { onConflict: "business_id,module_key" }
    );

  if (businessModuleError) throw businessModuleError;

  if (params.moduleEnabled) {
    const { error: moduleSettingsError } = await supabase
      .from("module_settings")
      .upsert(
        {
          business_id: params.businessId,
          module_key: params.moduleKey,
          settings: params.settings,
          updated_by: params.userId,
          created_by: params.userId,
        },
        { onConflict: "business_id,branch_id,module_key" }
      );

    if (moduleSettingsError) throw moduleSettingsError;
  }

  await writeModuleAudit({
    businessId: params.businessId,
    userId: params.userId,
    moduleKey: params.moduleKey,
    action: "module_settings_updated",
    values: params.settings,
  });
}

async function writeModuleAudit(params: {
  businessId: string;
  userId: string;
  moduleKey: ModuleKey;
  action: string;
  values: Record<string, unknown>;
}) {
  const { error } = await supabase.from("audit_logs").insert({
    business_id: params.businessId,
    actor_user_id: params.userId,
    actor_role: "owner",
    action: params.action,
    entity_table: "business_modules",
    metadata: { module_key: params.moduleKey },
    new_values: params.values,
  });

  if (error) throw error;
}
