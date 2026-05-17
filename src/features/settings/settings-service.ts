import { supabase } from "@/lib/supabase/client";
import type { BusinessTypeKey, ModuleKey } from "@/types/business";

export type BusinessTypeOption = {
  id: string;
  type_key: BusinessTypeKey;
  name: string;
  supports_preset: boolean;
};

export type BusinessPresetRecord = {
  id: string;
  business_type_id: string;
  preset_key: string;
  name: string;
  description: string | null;
  recommended_module_keys: ModuleKey[];
  optional_module_keys: ModuleKey[];
};

export type PaymentMethodRecord = {
  id: string;
  branch_id: string | null;
  name: string;
  method_type: string;
  instructions: string | null;
  is_active: boolean;
};

export type NotificationTemplateRecord = {
  id: string;
  branch_id: string | null;
  template_key: string;
  channel: string;
  subject: string | null;
  body: string;
  is_active: boolean;
};

export type RolePermissionRecord = {
  id: string;
  role: string;
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_export: boolean;
};

export type BusinessSettingsRecord = {
  settings: Record<string, unknown>;
  opening_hours: Record<string, unknown>;
  booking_rules: Record<string, unknown>;
  portal_settings: Record<string, unknown>;
};

export async function loadSettingsArea(businessId: string) {
  const [types, presets, settings, paymentMethods, notificationTemplates, rolePermissions] = await Promise.all([
    supabase.from("business_types").select("id, type_key, name, supports_preset").eq("is_active", true).order("display_order"),
    supabase.from("business_presets").select("*").eq("is_active", true),
    supabase.from("business_settings").select("settings, opening_hours, booking_rules, portal_settings").eq("business_id", businessId).maybeSingle(),
    supabase.from("payment_methods").select("id, branch_id, name, method_type, instructions, is_active").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100),
    supabase.from("notification_templates").select("id, branch_id, template_key, channel, subject, body, is_active").eq("business_id", businessId).order("template_key").limit(100),
    supabase.from("role_permissions").select("id, role, module_key, can_view, can_create, can_update, can_delete, can_export").eq("business_id", businessId).order("role").order("module_key"),
  ]);

  if (types.error) throw types.error;
  if (presets.error) throw presets.error;
  if (settings.error) throw settings.error;
  if (paymentMethods.error) throw paymentMethods.error;
  if (notificationTemplates.error) throw notificationTemplates.error;
  if (rolePermissions.error) throw rolePermissions.error;

  return {
    businessTypes: (types.data ?? []) as BusinessTypeOption[],
    presets: (presets.data ?? []) as BusinessPresetRecord[],
    settings: (settings.data ?? { settings: {}, opening_hours: {}, booking_rules: {}, portal_settings: {} }) as BusinessSettingsRecord,
    paymentMethods: (paymentMethods.data ?? []) as PaymentMethodRecord[],
    notificationTemplates: (notificationTemplates.data ?? []) as NotificationTemplateRecord[],
    rolePermissions: (rolePermissions.data ?? []) as RolePermissionRecord[],
  };
}

export async function updateBusinessProfile(params: {
  businessId: string;
  userId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
}) {
  const { error } = await supabase
    .from("businesses")
    .update({
      name: params.name,
      email: params.email || null,
      phone: params.phone || null,
      website: params.website || null,
      address: params.address || null,
      updated_by: params.userId,
    })
    .eq("id", params.businessId);

  if (error) throw error;

  await logSettingsAudit(params.businessId, params.userId, "business_profile_updated", "businesses", params.businessId, {
    name: params.name,
    email: params.email || null,
    phone: params.phone || null,
    website: params.website || null,
    address: params.address || null,
  });
}

export async function updateBusinessType(params: {
  businessId: string;
  userId: string;
  businessTypeId: string;
  businessTypeKey: BusinessTypeKey;
  strategy: "keep" | "apply_preset" | "manual";
  preset?: BusinessPresetRecord | null;
}) {
  const { error } = await supabase
    .from("businesses")
    .update({ business_type_id: params.businessTypeId, updated_by: params.userId })
    .eq("id", params.businessId);

  if (error) throw error;

  if (params.strategy === "apply_preset" && params.preset) {
    const moduleKeys = Array.from(new Set<ModuleKey>([
      "core",
      "settings",
      "data_backup",
      ...params.preset.recommended_module_keys,
    ]));

    const { error: moduleError } = await supabase.from("business_modules").upsert(
      moduleKeys.map((moduleKey) => ({
        business_id: params.businessId,
        module_key: moduleKey,
        is_enabled: true,
        enabled_by: params.userId,
        enabled_at: new Date().toISOString(),
        updated_by: params.userId,
      })),
      { onConflict: "business_id,module_key" }
    );

    if (moduleError) throw moduleError;
  }

  const settingsPatch = {
    last_business_type_change: {
      business_type: params.businessTypeKey,
      strategy: params.strategy,
      preset_key: params.preset?.preset_key ?? null,
      changed_at: new Date().toISOString(),
    },
    manual_module_customization_recommended: params.strategy === "manual",
  };

  await mergeBusinessSettings(params.businessId, params.userId, "settings", settingsPatch);

  await logSettingsAudit(params.businessId, params.userId, "business_type_changed", "businesses", params.businessId, {
    business_type: params.businessTypeKey,
    strategy: params.strategy,
    preset_key: params.preset?.preset_key ?? null,
  });
}

export async function saveSettingsSection(params: {
  businessId: string;
  userId: string;
  section: "settings" | "opening_hours" | "booking_rules" | "portal_settings";
  values: Record<string, unknown>;
  action: string;
}) {
  await mergeBusinessSettings(params.businessId, params.userId, params.section, params.values);
  await logSettingsAudit(params.businessId, params.userId, params.action, "business_settings", params.businessId, params.values);
}

export async function savePaymentMethod(params: {
  businessId: string;
  branchId?: string | null;
  userId: string;
  name: string;
  methodType: string;
  instructions?: string | null;
  isActive: boolean;
}) {
  const { error } = await supabase.from("payment_methods").insert({
    business_id: params.businessId,
    branch_id: params.branchId ?? null,
    name: params.name,
    method_type: params.methodType,
    instructions: params.instructions || null,
    is_active: params.isActive,
    created_by: params.userId,
    updated_by: params.userId,
  });

  if (error) throw error;
  await logSettingsAudit(params.businessId, params.userId, "payment_method_created", "payment_methods", null, {
    name: params.name,
    method_type: params.methodType,
  });
}

export async function saveNotificationTemplate(params: {
  businessId: string;
  branchId?: string | null;
  userId: string;
  templateKey: string;
  channel: string;
  subject?: string | null;
  body: string;
  isActive: boolean;
}) {
  const { error } = await supabase.from("notification_templates").upsert(
    {
      business_id: params.businessId,
      branch_id: params.branchId ?? null,
      template_key: params.templateKey,
      channel: params.channel,
      subject: params.subject || null,
      body: params.body,
      is_active: params.isActive,
      created_by: params.userId,
      updated_by: params.userId,
    },
    { onConflict: "business_id,template_key,channel" }
  );

  if (error) throw error;
  await logSettingsAudit(params.businessId, params.userId, "notification_template_saved", "notification_templates", null, {
    template_key: params.templateKey,
    channel: params.channel,
  });
}

export async function updateRolePermission(params: {
  businessId: string;
  userId: string;
  permissionId: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
}) {
  const { error } = await supabase
    .from("role_permissions")
    .update({
      can_view: params.canView,
      can_create: params.canCreate,
      can_update: params.canUpdate,
      can_delete: params.canDelete,
      can_export: params.canExport,
      updated_by: params.userId,
    })
    .eq("id", params.permissionId)
    .eq("business_id", params.businessId);

  if (error) throw error;
  await logSettingsAudit(params.businessId, params.userId, "staff_permission_updated", "role_permissions", params.permissionId, {
    can_view: params.canView,
    can_create: params.canCreate,
    can_update: params.canUpdate,
    can_delete: params.canDelete,
    can_export: params.canExport,
  });
}

async function mergeBusinessSettings(
  businessId: string,
  userId: string,
  section: "settings" | "opening_hours" | "booking_rules" | "portal_settings",
  values: Record<string, unknown>
) {
  const { data: current, error: currentError } = await supabase
    .from("business_settings")
    .select("settings, opening_hours, booking_rules, portal_settings")
    .eq("business_id", businessId)
    .maybeSingle();

  if (currentError) throw currentError;

  const nextSection = {
    ...((current?.[section] as Record<string, unknown> | null) ?? {}),
    ...values,
  };

  const { error } = await supabase.from("business_settings").upsert(
    {
      business_id: businessId,
      [section]: nextSection,
      updated_by: userId,
    },
    { onConflict: "business_id" }
  );

  if (error) throw error;
}

async function logSettingsAudit(
  businessId: string,
  userId: string,
  action: string,
  entityTable: string,
  entityId: string | null,
  newValues: Record<string, unknown>
) {
  const { error } = await supabase.from("audit_logs").insert({
    business_id: businessId,
    actor_user_id: userId,
    actor_role: "owner",
    action,
    entity_table: entityTable,
    entity_id: entityId,
    new_values: newValues,
  });

  if (error) throw error;
}
