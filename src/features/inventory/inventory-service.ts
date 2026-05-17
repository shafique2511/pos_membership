import { supabase } from "@/lib/supabase/client";

export type InventoryMovementType = "stock_in" | "stock_out" | "adjustment" | "transfer_in" | "transfer_out" | "sale_return";

export type InventoryOption = { id: string; label: string };

export type ProductRecord = {
  id: string;
  business_id: string;
  branch_id: string | null;
  category_id: string | null;
  supplier_id: string | null;
  sku: string | null;
  name: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  status: string;
};

export type InventoryTransaction = {
  id: string;
  product_id: string;
  branch_id: string | null;
  transaction_type: InventoryMovementType;
  quantity: number;
  unit_cost: number | null;
  reference_type: string | null;
  note: string | null;
  created_at: string;
};

export type ProductFormValues = {
  branch_id?: string | null;
  category_id?: string | null;
  supplier_id?: string | null;
  sku?: string | null;
  name: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
};

export async function getInventoryOptions(businessId: string, branchId?: string | null) {
  const [branches, categories, suppliers] = await Promise.all([
    optionQuery("branches", businessId, "name"),
    optionQuery("product_categories", businessId, "name", branchId),
    optionQuery("suppliers", businessId, "name", branchId),
  ]);
  return { branches, categories, suppliers };
}

export async function listProducts(params: { businessId: string; branchId?: string | null; categoryId?: string; supplierId?: string }) {
  let query = supabase.from("products").select("*").eq("business_id", params.businessId).order("created_at", { ascending: false }).limit(100);
  if (params.branchId) query = query.eq("branch_id", params.branchId);
  if (params.categoryId) query = query.eq("category_id", params.categoryId);
  if (params.supplierId) query = query.eq("supplier_id", params.supplierId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((item) => ({
    ...item,
    cost_price: Number(item.cost_price),
    selling_price: Number(item.selling_price),
    stock_quantity: Number(item.stock_quantity),
    low_stock_threshold: Number(item.low_stock_threshold),
  })) as ProductRecord[];
}

export async function upsertProduct(businessId: string, userId: string, values: ProductFormValues, productId?: string) {
  const payload = {
    business_id: businessId,
    branch_id: values.branch_id || null,
    category_id: values.category_id || null,
    supplier_id: values.supplier_id || null,
    sku: values.sku || null,
    name: values.name,
    cost_price: values.cost_price,
    selling_price: values.selling_price,
    stock_quantity: values.stock_quantity,
    low_stock_threshold: values.low_stock_threshold,
    track_inventory: values.track_inventory,
    status: "active",
    created_by: userId,
    updated_by: userId,
  };
  const query = productId
    ? supabase.from("products").update(payload).eq("business_id", businessId).eq("id", productId)
    : supabase.from("products").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function createCategory(businessId: string, userId: string, name: string, branchId?: string | null) {
  const { error } = await supabase.from("product_categories").insert({
    business_id: businessId,
    branch_id: branchId || null,
    name,
    status: "active",
    created_by: userId,
    updated_by: userId,
  });
  if (error) throw error;
}

export async function createSupplier(businessId: string, userId: string, name: string, branchId?: string | null) {
  const { error } = await supabase.from("suppliers").insert({
    business_id: businessId,
    branch_id: branchId || null,
    name,
    status: "active",
    created_by: userId,
    updated_by: userId,
  });
  if (error) throw error;
}

export async function recordStockMovement(params: {
  businessId: string;
  branchId?: string | null;
  product: ProductRecord;
  userId: string;
  type: InventoryMovementType;
  quantity: number;
  unitCost?: number | null;
  note?: string;
}) {
  const signedQuantity = ["stock_out", "transfer_out"].includes(params.type) ? -Math.abs(params.quantity) : Math.abs(params.quantity);
  const nextStock = params.type === "adjustment" ? params.quantity : Number(params.product.stock_quantity) + signedQuantity;

  const { error: productError } = await supabase
    .from("products")
    .update({ stock_quantity: nextStock, updated_by: params.userId })
    .eq("business_id", params.businessId)
    .eq("id", params.product.id);
  if (productError) throw productError;

  const { error } = await supabase.from("inventory_transactions").insert({
    business_id: params.businessId,
    branch_id: params.branchId || params.product.branch_id,
    product_id: params.product.id,
    transaction_type: params.type,
    quantity: Math.abs(params.quantity),
    unit_cost: params.unitCost ?? params.product.cost_price,
    reference_type: "manual",
    note: params.note || params.type,
    created_by: params.userId,
    updated_by: params.userId,
  });
  if (error) throw error;
}

export async function listInventoryTransactions(params: { businessId: string; branchId?: string | null; productId?: string; movementType?: string; dateFrom?: string; dateTo?: string }) {
  let query = supabase.from("inventory_transactions").select("*").eq("business_id", params.businessId).order("created_at", { ascending: false }).limit(100);
  if (params.branchId) query = query.eq("branch_id", params.branchId);
  if (params.productId) query = query.eq("product_id", params.productId);
  if (params.movementType && params.movementType !== "all") query = query.eq("transaction_type", params.movementType);
  if (params.dateFrom) query = query.gte("created_at", `${params.dateFrom}T00:00:00`);
  if (params.dateTo) query = query.lte("created_at", `${params.dateTo}T23:59:59`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((item) => ({ ...item, quantity: Number(item.quantity), unit_cost: item.unit_cost == null ? null : Number(item.unit_cost) })) as InventoryTransaction[];
}

export async function createInventoryExport(params: {
  businessId: string;
  branchId?: string | null;
  userId: string;
  categoryId?: string;
  supplierId?: string;
  movementType?: string;
  dateFrom?: string;
  dateTo?: string;
  format: "csv" | "json";
}) {
  const { data, error } = await supabase.from("backup_exports").insert({
    business_id: params.businessId,
    branch_id: params.branchId || null,
    export_type: "inventory",
    export_scope: "module",
    export_format: params.format,
    date_from: params.dateFrom || null,
    date_to: params.dateTo || null,
    status: "pending",
    requested_by: params.userId,
    metadata: {
      module: "inventory",
      category_id: params.categoryId || null,
      supplier_id: params.supplierId || null,
      movement_type: params.movementType || null,
      includes: ["products", "product_categories", "suppliers", "inventory_transactions", "stock_levels", "stock_transfers"],
    },
  }).select("id").single();
  if (error) throw error;
  await supabase.from("backup_export_items").insert([
    { backup_export_id: data.id, table_name: "products", status: "pending" },
    { backup_export_id: data.id, table_name: "product_categories", status: "pending" },
    { backup_export_id: data.id, table_name: "suppliers", status: "pending" },
    { backup_export_id: data.id, table_name: "inventory_transactions", status: "pending" },
  ]);
  return data.id as string;
}

async function optionQuery(table: string, businessId: string, labelColumn: string, branchId?: string | null): Promise<InventoryOption[]> {
  let query = supabase.from(table).select(`id, ${labelColumn}`).eq("business_id", businessId).limit(100);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, string>[]).map((item) => ({ id: item.id, label: item[labelColumn] }));
}
