import { supabase } from "@/lib/supabase/client";
import type { ModuleKey } from "@/types/business";

export type DashboardSummary = {
  todayBookings: number;
  pendingBookings: number;
  completedBookings: number;
  todaySales: number;
  monthlySales: number;
  activeMembers: number;
  expiringMemberships: number;
  newCustomers: number;
  returningCustomers: number;
  loyaltyPointsIssued: number;
  lowStockAlerts: number;
  staffPerformance: number;
  recentPayments: RecentPayment[];
  recentPosOrders: RecentPosOrder[];
  recentBackup: RecentBackup | null;
  charts: {
    bookingTrend: ChartPoint[];
    sales: ChartPoint[];
    membershipGrowth: ChartPoint[];
    inventoryAlerts: ChartPoint[];
    branchPerformance: ChartPoint[];
  };
};

export type RecentPayment = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
};

export type RecentPosOrder = {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
};

export type RecentBackup = {
  id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};

export type ChartPoint = {
  label: string;
  value: number;
};

type LoadDashboardParams = {
  businessId: string;
  branchId?: string | null;
  enabledModules: ModuleKey[];
  isOwner: boolean;
};

const emptySummary: DashboardSummary = {
  todayBookings: 0,
  pendingBookings: 0,
  completedBookings: 0,
  todaySales: 0,
  monthlySales: 0,
  activeMembers: 0,
  expiringMemberships: 0,
  newCustomers: 0,
  returningCustomers: 0,
  loyaltyPointsIssued: 0,
  lowStockAlerts: 0,
  staffPerformance: 0,
  recentPayments: [],
  recentPosOrders: [],
  recentBackup: null,
  charts: {
    bookingTrend: [],
    sales: [],
    membershipGrowth: [],
    inventoryAlerts: [],
    branchPerformance: [],
  },
};

export async function loadDashboardSummary(params: LoadDashboardParams): Promise<DashboardSummary> {
  const moduleSet = new Set(params.enabledModules);
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const monthStartIso = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const monthEndIso = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const next30Iso = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30).toISOString().slice(0, 10);

  const summary: DashboardSummary = structuredClone(emptySummary);

  if (moduleSet.has("bookings")) {
    summary.todayBookings = await countRows(withBranch(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", params.businessId).eq("booking_date", todayIso), params.branchId));
    summary.pendingBookings = await countRows(withBranch(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", params.businessId).eq("status", "pending"), params.branchId));
    summary.completedBookings = await countRows(withBranch(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", params.businessId).eq("status", "completed"), params.branchId));
    summary.charts.bookingTrend = await countByDate("bookings", params.businessId, params.branchId, "booking_date", 7);
  }

  if (moduleSet.has("pos")) {
    summary.todaySales = await sumRows(withBranch(supabase.from("pos_orders").select("total_amount").eq("business_id", params.businessId).eq("status", "completed").gte("created_at", `${todayIso}T00:00:00`).lte("created_at", `${todayIso}T23:59:59`), params.branchId), "total_amount");
    summary.monthlySales = await sumRows(withBranch(supabase.from("pos_orders").select("total_amount").eq("business_id", params.businessId).eq("status", "completed").gte("created_at", monthStartIso), params.branchId), "total_amount");
    summary.recentPosOrders = await recentPosOrders(params.businessId, params.branchId);
    summary.charts.sales = await sumByRecentDays("pos_orders", params.businessId, params.branchId, "total_amount", 7);
  }

  if (moduleSet.has("memberships")) {
    summary.activeMembers = await countRows(withBranch(supabase.from("memberships").select("id", { count: "exact", head: true }).eq("business_id", params.businessId).eq("status", "active"), params.branchId));
    summary.expiringMemberships = await countRows(withBranch(supabase.from("memberships").select("id", { count: "exact", head: true }).eq("business_id", params.businessId).eq("status", "active").lte("expires_at", next30Iso), params.branchId));
    summary.charts.membershipGrowth = await countByDate("memberships", params.businessId, params.branchId, "created_at", 7);
  }

  summary.newCustomers = await countRows(withBranch(supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", params.businessId).gte("created_at", monthStartIso), params.branchId));
  summary.returningCustomers = await countReturningCustomers(params.businessId, params.branchId);

  if (moduleSet.has("loyalty")) {
    summary.loyaltyPointsIssued = await sumRows(withBranch(supabase.from("loyalty_transactions").select("points").eq("business_id", params.businessId).eq("transaction_type", "earn").gte("created_at", monthStartIso), params.branchId), "points");
  }

  if (moduleSet.has("inventory")) {
    summary.lowStockAlerts = await countLowStock(params.businessId, params.branchId);
    summary.charts.inventoryAlerts = await inventoryAlertChart(params.businessId, params.branchId);
  }

  if (moduleSet.has("staff")) {
    summary.staffPerformance = await countRows(withBranch(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", params.businessId).eq("status", "completed").gte("booking_date", monthStartIso.slice(0, 10)).lte("booking_date", monthEndIso), params.branchId));
  }

  if (moduleSet.has("payments")) {
    summary.recentPayments = await recentPayments(params.businessId, params.branchId);
  }

  if (moduleSet.has("branches")) {
    summary.charts.branchPerformance = await branchPerformance(params.businessId);
  }

  if (params.isOwner) {
    summary.recentBackup = await recentBackup(params.businessId);
  }

  return summary;
}

export async function createBackupExport(businessId: string, branchId: string | null | undefined, userId: string) {
  const { data, error } = await supabase
    .from("backup_exports")
    .insert({
      business_id: businessId,
      branch_id: branchId ?? null,
      export_type: "full_business",
      export_scope: branchId ? "branch" : "full_business",
      export_format: "zip",
      status: "pending",
      requested_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;

  await supabase.from("audit_logs").insert({
    business_id: businessId,
    branch_id: branchId ?? null,
    actor_user_id: userId,
    actor_role: "owner",
    action: "backup_export_requested",
    entity_table: "backup_exports",
    entity_id: data.id,
    new_values: { export_type: "full_business", export_format: "zip" },
  });

  return data.id as string;
}

async function countRows(query: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

function withBranch<T>(query: T, branchId?: string | null): T {
  if (!branchId) return query;
  return (query as { eq: (column: string, value: string) => T }).eq("branch_id", branchId);
}

async function sumRows(query: PromiseLike<{ data: Record<string, unknown>[] | null; error: unknown }>, field: string) {
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).reduce((total, row) => total + Number(row[field] ?? 0), 0);
}

async function recentPayments(businessId: string, branchId?: string | null): Promise<RecentPayment[]> {
  let query = supabase.from("payments").select("id, amount, status, created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(5);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((item) => ({ id: item.id, amount: Number(item.amount), status: item.status, created_at: item.created_at }));
}

async function recentPosOrders(businessId: string, branchId?: string | null): Promise<RecentPosOrder[]> {
  let query = supabase.from("pos_orders").select("id, order_number, total_amount, status, created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(5);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((item) => ({ id: item.id, order_number: item.order_number, total_amount: Number(item.total_amount), status: item.status, created_at: item.created_at }));
}

async function recentBackup(businessId: string): Promise<RecentBackup | null> {
  const { data, error } = await supabase
    .from("backup_exports")
    .select("id, status, created_at, completed_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as RecentBackup | null;
}

async function countReturningCustomers(businessId: string, branchId?: string | null) {
  let query = supabase
    .from("pos_orders")
    .select("customer_id")
    .eq("business_id", businessId)
    .not("customer_id", "is", null)
    .limit(1000);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) return 0;
  const counts = new Map<string, number>();
  (data ?? []).forEach((row) => counts.set(row.customer_id, (counts.get(row.customer_id) ?? 0) + 1));
  return Array.from(counts.values()).filter((count) => count > 1).length;
}

async function countLowStock(businessId: string, branchId?: string | null) {
  let query = supabase.from("products").select("id, stock_quantity, low_stock_threshold").eq("business_id", businessId).eq("track_inventory", true).limit(1000);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).filter((item) => Number(item.stock_quantity) <= Number(item.low_stock_threshold)).length;
}

async function countByDate(tableName: "bookings" | "memberships", businessId: string, branchId: string | null | undefined, dateField: string, days: number): Promise<ChartPoint[]> {
  const points = lastDays(days);
  let query = supabase.from(tableName).select(dateField).eq("business_id", businessId).gte(dateField, points[0].iso);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return points.map((point) => ({
    label: point.label,
    value: rows.filter((row) => String(row[dateField]).slice(0, 10) === point.iso).length,
  }));
}

async function sumByRecentDays(tableName: "pos_orders", businessId: string, branchId: string | null | undefined, amountField: string, days: number): Promise<ChartPoint[]> {
  const points = lastDays(days);
  let query = supabase.from(tableName).select(`created_at, ${amountField}`).eq("business_id", businessId).gte("created_at", `${points[0].iso}T00:00:00`);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return points.map((point) => ({
    label: point.label,
    value: rows
      .filter((row) => String(row.created_at).slice(0, 10) === point.iso)
      .reduce((total, row) => total + Number(row[amountField] ?? 0), 0),
  }));
}

async function inventoryAlertChart(businessId: string, branchId?: string | null): Promise<ChartPoint[]> {
  let query = supabase.from("products").select("name, stock_quantity, low_stock_threshold").eq("business_id", businessId).eq("track_inventory", true).limit(5);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((item) => ({
    label: item.name,
    value: Math.max(0, Number(item.low_stock_threshold) - Number(item.stock_quantity)),
  }));
}

async function branchPerformance(businessId: string): Promise<ChartPoint[]> {
  const { data: branches, error: branchError } = await supabase.from("branches").select("id, name").eq("business_id", businessId).limit(8);
  if (branchError) throw branchError;
  const { data: orders, error: orderError } = await supabase.from("pos_orders").select("branch_id, total_amount").eq("business_id", businessId).eq("status", "completed").limit(1000);
  if (orderError) throw orderError;

  return (branches ?? []).map((branch) => ({
    label: branch.name,
    value: (orders ?? [])
      .filter((order) => order.branch_id === branch.id)
      .reduce((total, order) => total + Number(order.total_amount ?? 0), 0),
  }));
}

function lastDays(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return {
      iso: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
    };
  });
}
