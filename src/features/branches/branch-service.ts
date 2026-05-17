import { supabase } from "@/lib/supabase/client";

export type BranchRecord = {
  id: string;
  business_id: string;
  name: string;
  code: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_default: boolean;
  status: "active" | "inactive" | "archived";
};

export type BranchSummary = {
  customers: number;
  staff: number;
  bookings: number;
  inventoryItems: number;
  lowStock: number;
  sales: number;
  payments: number;
};

export type BranchComparison = BranchSummary & {
  branchId: string;
  branchName: string;
};

export type BranchOption = {
  id: string;
  label: string;
};

export async function listBranches(businessId: string) {
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .eq("business_id", businessId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BranchRecord[];
}

export async function upsertBranch(businessId: string, userId: string, values: Partial<BranchRecord>, branchId?: string) {
  const payload = {
    business_id: businessId,
    name: values.name,
    code: values.code || null,
    email: values.email || null,
    phone: values.phone || null,
    address: values.address || null,
    is_default: Boolean(values.is_default),
    status: values.status ?? "active",
    created_by: userId,
    updated_by: userId,
  };

  const query = branchId
    ? supabase.from("branches").update(payload).eq("business_id", businessId).eq("id", branchId)
    : supabase.from("branches").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function loadBranchSummary(businessId: string, branchId: string): Promise<BranchSummary> {
  const [customers, staff, bookings, products, sales, payments] = await Promise.all([
    countTable("customers", businessId, branchId),
    countTable("staff", businessId, branchId),
    countTable("bookings", businessId, branchId),
    loadProducts(businessId, branchId),
    sumTable("pos_orders", businessId, branchId, "total_amount"),
    sumTable("payments", businessId, branchId, "amount"),
  ]);

  return {
    customers,
    staff,
    bookings,
    inventoryItems: products.length,
    lowStock: products.filter((product) => Number(product.stock_quantity) <= Number(product.low_stock_threshold)).length,
    sales,
    payments,
  };
}

export async function loadBranchComparison(businessId: string): Promise<BranchComparison[]> {
  const branches = await listBranches(businessId);
  const rows = await Promise.all(
    branches.map(async (branch) => ({
      branchId: branch.id,
      branchName: branch.name,
      ...(await loadBranchSummary(businessId, branch.id)),
    }))
  );
  return rows;
}

export async function listBranchStaff(businessId: string, branchId: string) {
  const { data, error } = await supabase
    .from("staff")
    .select("id, full_name, role_title, status")
    .eq("business_id", businessId)
    .eq("branch_id", branchId)
    .limit(100);
  if (error) throw error;
  return (data ?? []) as { id: string; full_name: string; role_title: string | null; status: string }[];
}

export async function listBranchBookings(businessId: string, branchId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, booking_date, start_time, status, total_amount")
    .eq("business_id", businessId)
    .eq("branch_id", branchId)
    .order("booking_date", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as { id: string; booking_date: string; start_time: string; status: string; total_amount: number }[];
}

export async function listBranchInventory(businessId: string, branchId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, stock_quantity, low_stock_threshold")
    .eq("business_id", businessId)
    .eq("branch_id", branchId)
    .order("name")
    .limit(50);
  if (error) throw error;
  return (data ?? []) as { id: string; name: string; stock_quantity: number; low_stock_threshold: number }[];
}

export async function listBranchUsers(businessId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, full_name, role, branch_id")
    .eq("business_id", businessId)
    .in("role", ["manager", "staff"])
    .limit(100);
  if (error) throw error;
  return (data ?? []) as { id: string; full_name: string; role: string; branch_id: string | null }[];
}

export async function updateBranchPermission(userProfileId: string, businessId: string, branchId: string | null, userId: string) {
  const { error } = await supabase
    .from("user_profiles")
    .update({ branch_id: branchId, updated_by: userId })
    .eq("business_id", businessId)
    .eq("id", userProfileId);
  if (error) throw error;
}

export async function transferStock(params: {
  businessId: string;
  userId: string;
  productId: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
}) {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, cost_price")
    .eq("business_id", params.businessId)
    .eq("id", params.productId)
    .single();
  if (productError) throw productError;

  const referenceId = crypto.randomUUID();
  const rows = [
    {
      business_id: params.businessId,
      branch_id: params.fromBranchId,
      product_id: params.productId,
      transaction_type: "transfer_out",
      quantity: params.quantity,
      unit_cost: product.cost_price,
      reference_type: "branch_transfer",
      reference_id: referenceId,
      note: `Transfer to branch ${params.toBranchId}`,
      created_by: params.userId,
      updated_by: params.userId,
    },
    {
      business_id: params.businessId,
      branch_id: params.toBranchId,
      product_id: params.productId,
      transaction_type: "transfer_in",
      quantity: params.quantity,
      unit_cost: product.cost_price,
      reference_type: "branch_transfer",
      reference_id: referenceId,
      note: `Transfer from branch ${params.fromBranchId}`,
      created_by: params.userId,
      updated_by: params.userId,
    },
  ];
  const { error } = await supabase.from("inventory_transactions").insert(rows);
  if (error) throw error;
}

export async function createBranchBackup(params: {
  businessId: string;
  branchId?: string | null;
  userId: string;
  format: "csv" | "json" | "zip";
}) {
  const { data, error } = await supabase
    .from("backup_exports")
    .insert({
      business_id: params.businessId,
      branch_id: params.branchId || null,
      export_type: params.branchId ? "branch" : "all_branches",
      export_scope: params.branchId ? "branch" : "full_business",
      export_format: params.format,
      status: "pending",
      requested_by: params.userId,
      metadata: {
        module: "branches",
        branch_id: params.branchId || null,
        includes: ["branches", "customers", "bookings", "pos_orders", "inventory_transactions", "payments", "staff", "reports"],
      },
    })
    .select("id")
    .single();
  if (error) throw error;

  await supabase.from("backup_export_items").insert([
    { backup_export_id: data.id, table_name: "branches", status: "pending" },
    { backup_export_id: data.id, table_name: "customers", status: "pending" },
    { backup_export_id: data.id, table_name: "bookings", status: "pending" },
    { backup_export_id: data.id, table_name: "pos_orders", status: "pending" },
    { backup_export_id: data.id, table_name: "inventory_transactions", status: "pending" },
    { backup_export_id: data.id, table_name: "payments", status: "pending" },
    { backup_export_id: data.id, table_name: "staff", status: "pending" },
  ]);

  return data.id as string;
}

async function countTable(table: string, businessId: string, branchId: string) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("branch_id", branchId);
  if (error) throw error;
  return count ?? 0;
}

async function sumTable(table: string, businessId: string, branchId: string, field: string) {
  const { data, error } = await supabase.from(table).select(field).eq("business_id", businessId).eq("branch_id", branchId).limit(1000);
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, number>[]).reduce((total, row) => total + Number(row[field] ?? 0), 0);
}

async function loadProducts(businessId: string, branchId: string) {
  const { data, error } = await supabase.from("products").select("id, stock_quantity, low_stock_threshold").eq("business_id", businessId).eq("branch_id", branchId).limit(1000);
  if (error) throw error;
  return data ?? [];
}
