import { supabase } from "@/lib/supabase/client";
import type { BusinessTypeKey, ModuleKey } from "@/types/business";

export type SetupPaymentMethod = {
  name: string;
  methodType: string;
};

export type SetupItem = {
  name: string;
  itemType: "service" | "product";
  price: number;
};

export type CompleteSetupPayload = {
  ownerUserId: string;
  ownerEmail?: string | null;
  ownerName: string;
  businessName: string;
  businessSlug: string;
  businessEmail?: string;
  businessPhone?: string;
  businessType: BusinessTypeKey;
  selectedModules: ModuleKey[];
  branchName: string;
  branchPhone?: string;
  branchAddress?: string;
  setupItems: SetupItem[];
  openingHours: Record<string, unknown>;
  bookingRules: Record<string, unknown>;
  paymentMethods: SetupPaymentMethod[];
};

export async function completeBusinessSetup(payload: CompleteSetupPayload) {
  const { data: businessType, error: businessTypeError } = await supabase
    .from("business_types")
    .select("id")
    .eq("type_key", payload.businessType)
    .maybeSingle();

  if (businessTypeError) throw businessTypeError;
  if (!businessType) throw new Error("Selected business type is not available. Run the seed data first.");

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({
      business_type_id: businessType.id,
      name: payload.businessName,
      slug: payload.businessSlug,
      email: payload.businessEmail || null,
      phone: payload.businessPhone || null,
      status: "active",
      owner_id: payload.ownerUserId,
      created_by: payload.ownerUserId,
      updated_by: payload.ownerUserId,
    })
    .select("id")
    .single();

  if (businessError) throw businessError;

  const businessId = business.id as string;

  const { data: ownerProfile, error: profileError } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: payload.ownerUserId,
        business_id: businessId,
        role: "owner",
        full_name: payload.ownerName,
        email: payload.ownerEmail || payload.businessEmail || null,
        status: "active",
        created_by: payload.ownerUserId,
        updated_by: payload.ownerUserId,
      },
      { onConflict: "user_id,business_id,role" }
    )
    .select("id")
    .single();

  if (profileError) throw profileError;

  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .insert({
      business_id: businessId,
      name: payload.branchName,
      code: "MAIN",
      phone: payload.branchPhone || null,
      address: payload.branchAddress || null,
      is_default: true,
      status: "active",
      created_by: payload.ownerUserId,
      updated_by: payload.ownerUserId,
    })
    .select("id")
    .single();

  if (branchError) throw branchError;

  const branchId = branch.id as string;

  const profileBranchUpdate = await supabase
    .from("user_profiles")
    .update({ branch_id: branchId, updated_by: payload.ownerUserId })
    .eq("id", ownerProfile.id);

  if (profileBranchUpdate.error) throw profileBranchUpdate.error;

  const moduleRows = payload.selectedModules.map((moduleKey) => ({
    business_id: businessId,
    module_key: moduleKey,
    is_enabled: true,
    enabled_by: payload.ownerUserId,
    enabled_at: new Date().toISOString(),
    created_by: payload.ownerUserId,
    updated_by: payload.ownerUserId,
  }));

  const { error: moduleError } = await supabase.from("business_modules").insert(moduleRows);
  if (moduleError) throw moduleError;

  const { error: settingsError } = await supabase.from("business_settings").insert({
    business_id: businessId,
    opening_hours: payload.openingHours,
    booking_rules: payload.bookingRules,
    settings: {
      setup_completed: true,
      data_ownership_acknowledged: true,
    },
    created_by: payload.ownerUserId,
    updated_by: payload.ownerUserId,
  });

  if (settingsError) throw settingsError;

  if (payload.paymentMethods.length > 0) {
    const { error } = await supabase.from("payment_methods").insert(
      payload.paymentMethods.map((method) => ({
        business_id: businessId,
        branch_id: branchId,
        name: method.name,
        method_type: method.methodType,
        is_active: true,
        created_by: payload.ownerUserId,
        updated_by: payload.ownerUserId,
      }))
    );

    if (error) throw error;
  }

  const serviceItems = payload.setupItems.filter((item) => item.itemType === "service");
  const productItems = payload.setupItems.filter((item) => item.itemType === "product");

  if (serviceItems.length > 0) {
    const { data: category, error: categoryError } = await supabase
      .from("service_categories")
      .insert({
        business_id: businessId,
        branch_id: branchId,
        name: "Default Services",
        status: "active",
        created_by: payload.ownerUserId,
        updated_by: payload.ownerUserId,
      })
      .select("id")
      .single();

    if (categoryError) throw categoryError;

    const { error } = await supabase.from("services").insert(
      serviceItems.map((item) => ({
        business_id: businessId,
        branch_id: branchId,
        category_id: category.id,
        name: item.name,
        price: item.price,
        status: "active",
        created_by: payload.ownerUserId,
        updated_by: payload.ownerUserId,
      }))
    );

    if (error) throw error;
  }

  if (productItems.length > 0) {
    const { data: category, error: categoryError } = await supabase
      .from("product_categories")
      .insert({
        business_id: businessId,
        branch_id: branchId,
        name: "Default Products",
        status: "active",
        created_by: payload.ownerUserId,
        updated_by: payload.ownerUserId,
      })
      .select("id")
      .single();

    if (categoryError) throw categoryError;

    const { error } = await supabase.from("products").insert(
      productItems.map((item) => ({
        business_id: businessId,
        branch_id: branchId,
        category_id: category.id,
        name: item.name,
        selling_price: item.price,
        status: "active",
        created_by: payload.ownerUserId,
        updated_by: payload.ownerUserId,
      }))
    );

    if (error) throw error;
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    business_id: businessId,
    branch_id: branchId,
    actor_user_id: payload.ownerUserId,
    actor_role: "owner",
    action: "business_setup_completed",
    entity_table: "businesses",
    entity_id: businessId,
    new_values: {
      business_type: payload.businessType,
      selected_modules: payload.selectedModules,
      backup_notice_acknowledged: true,
    },
  });

  if (auditError) throw auditError;

  return { businessId, branchId };
}

export function slugifyBusinessName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
