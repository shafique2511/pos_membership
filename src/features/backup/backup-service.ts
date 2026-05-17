import { supabase } from "@/lib/supabase/client";

export type BackupScope =
  | "full_business"
  | "customers"
  | "bookings"
  | "memberships"
  | "loyalty"
  | "pos_sales"
  | "inventory"
  | "staff"
  | "commission"
  | "payments"
  | "reports"
  | "marketing"
  | "settings"
  | "branch_data";

export type BackupFormat = "csv" | "json" | "excel" | "pdf" | "zip";

export type BackupExportRecord = {
  id: string;
  business_id: string;
  branch_id: string | null;
  export_type: string;
  export_scope: string;
  export_format: BackupFormat;
  date_from: string | null;
  date_to: string | null;
  file_url: string | null;
  file_size: number | null;
  status: string;
  requested_by: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export const backupScopes: Array<{ key: BackupScope; label: string; tables: string[] }> = [
  { key: "full_business", label: "Full business backup", tables: ["businesses", "branches", "customers", "bookings", "memberships", "loyalty_transactions", "pos_orders", "inventory_transactions", "staff", "payments", "business_settings"] },
  { key: "customers", label: "Customers", tables: ["customers"] },
  { key: "bookings", label: "Bookings", tables: ["bookings", "booking_payments", "booking_status_history"] },
  { key: "memberships", label: "Memberships", tables: ["membership_plans", "memberships", "membership_usage"] },
  { key: "loyalty", label: "Loyalty", tables: ["loyalty_transactions", "rewards", "reward_redemptions"] },
  { key: "pos_sales", label: "POS sales", tables: ["pos_orders", "pos_order_items", "receipts"] },
  { key: "inventory", label: "Inventory", tables: ["products", "product_categories", "suppliers", "inventory_transactions"] },
  { key: "staff", label: "Staff", tables: ["staff", "staff_working_hours", "staff_off_days", "user_profiles"] },
  { key: "commission", label: "Commission", tables: ["staff_commissions"] },
  { key: "payments", label: "Payments", tables: ["payments", "payment_methods", "invoices", "receipts"] },
  { key: "reports", label: "Reports", tables: ["reports"] },
  { key: "marketing", label: "Marketing", tables: ["marketing_campaigns", "campaign_customers"] },
  { key: "settings", label: "Settings", tables: ["business_settings", "business_modules", "module_settings", "role_permissions", "notification_templates"] },
  { key: "branch_data", label: "Branch data", tables: ["branches", "customers", "bookings", "pos_orders", "inventory_transactions", "payments", "staff"] },
];

export async function listBackupExports(businessId: string) {
  const { data, error } = await supabase
    .from("backup_exports")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as unknown as BackupExportRecord[];
}

export async function createBackupExport(params: {
  businessId: string;
  branchId?: string | null;
  userId: string;
  scope: BackupScope;
  format: BackupFormat;
  dateFrom?: string | null;
  dateTo?: string | null;
}) {
  const scope = backupScopes.find((item) => item.key === params.scope);
  if (!scope) throw new Error("Unknown backup scope.");

  const exportScope = params.scope === "full_business" ? "full_business" : params.scope === "branch_data" ? "branch" : "module";
  const exportType = params.scope;

  const { data, error } = await supabase
    .from("backup_exports")
    .insert({
      business_id: params.businessId,
      branch_id: params.branchId ?? null,
      export_type: exportType,
      export_scope: exportScope,
      export_format: params.format,
      date_from: params.dateFrom || null,
      date_to: params.dateTo || null,
      status: "pending",
      requested_by: params.userId,
      metadata: {
        scope: params.scope,
        tables: scope.tables,
        warning_acknowledged: true,
        generated_by: "settings_data_backup",
      },
    })
    .select("id")
    .single();

  if (error) throw error;

  const { error: itemsError } = await supabase.from("backup_export_items").insert(
    scope.tables.map((tableName) => ({
      backup_export_id: data.id,
      table_name: tableName,
      status: "pending",
    }))
  );

  if (itemsError) throw itemsError;

  const { error: auditError } = await supabase.from("audit_logs").insert({
    business_id: params.businessId,
    branch_id: params.branchId ?? null,
    actor_user_id: params.userId,
    actor_role: "owner",
    action: "backup_export_requested",
    entity_table: "backup_exports",
    entity_id: data.id,
    new_values: {
      export_type: exportType,
      export_scope: exportScope,
      export_format: params.format,
      date_from: params.dateFrom || null,
      date_to: params.dateTo || null,
      tables: scope.tables,
    },
  });

  if (auditError) throw auditError;
  return data.id as string;
}
