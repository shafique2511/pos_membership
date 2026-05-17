import { supabase } from "@/lib/supabase/client";

export type MembershipPlanType = "monthly" | "prepaid_credit" | "visit_package" | "vip" | "service_package" | "custom";
export type MembershipStatus = "active" | "expired" | "cancelled" | "frozen";

export type MembershipPlan = {
  id: string;
  business_id: string;
  branch_id: string | null;
  name: string;
  description: string | null;
  plan_type: MembershipPlanType;
  price: number;
  duration_days: number | null;
  visit_limit: number | null;
  credit_amount: number | null;
  status: "active" | "inactive";
};

export type MembershipRecord = {
  id: string;
  business_id: string;
  branch_id: string | null;
  customer_id: string;
  membership_plan_id: string | null;
  membership_code: string | null;
  status: MembershipStatus;
  starts_at: string;
  expires_at: string | null;
  remaining_visits: number | null;
  remaining_credit: number | null;
  created_at: string;
};

export type MembershipUsageRecord = {
  id: string;
  membership_id: string;
  customer_id: string;
  usage_type: string;
  quantity: number;
  note: string | null;
  created_at: string;
};

export type MembershipPaymentRecord = {
  id: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export type MembershipOption = {
  id: string;
  label: string;
};

export type MembershipFilters = {
  businessId: string;
  branchId?: string | null;
  customerId?: string;
  status?: string;
  planType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export type PlanFormValues = {
  branch_id?: string | null;
  name: string;
  description?: string | null;
  plan_type: MembershipPlanType;
  price: number;
  duration_days?: number | null;
  visit_limit?: number | null;
  credit_amount?: number | null;
};

export type MembershipFormValues = {
  branch_id?: string | null;
  customer_id: string;
  membership_plan_id?: string | null;
  membership_code: string;
  status: MembershipStatus;
  starts_at: string;
  expires_at?: string | null;
  remaining_visits?: number | null;
  remaining_credit?: number | null;
};

export async function listMembershipPlans(businessId: string, branchId?: string | null) {
  let query = supabase
    .from("membership_plans")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as MembershipPlan[];
}

export async function upsertMembershipPlan(businessId: string, userId: string, values: PlanFormValues, planId?: string) {
  const payload = {
    business_id: businessId,
    branch_id: values.branch_id || null,
    name: values.name,
    description: values.description || null,
    plan_type: values.plan_type,
    price: values.price,
    duration_days: values.duration_days || null,
    visit_limit: values.visit_limit || null,
    credit_amount: values.credit_amount || null,
    status: "active",
    updated_by: userId,
    created_by: userId,
  };

  const query = planId
    ? supabase.from("membership_plans").update(payload).eq("id", planId).eq("business_id", businessId)
    : supabase.from("membership_plans").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function listMemberships(filters: MembershipFilters) {
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? 20;
  let query = supabase
    .from("memberships")
    .select("*, membership_plans(plan_type, name)", { count: "exact" })
    .eq("business_id", filters.businessId)
    .order("created_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (filters.branchId) query = query.eq("branch_id", filters.branchId);
  if (filters.customerId) query = query.eq("customer_id", filters.customerId);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
  if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59`);

  const { data, error, count } = await query;
  if (error) throw error;

  let memberships = (data ?? []) as unknown as (MembershipRecord & { membership_plans?: { plan_type: MembershipPlanType; name: string } | null })[];

  if (filters.planType && filters.planType !== "all") {
    memberships = memberships.filter((membership) => membership.membership_plans?.plan_type === filters.planType);
  }

  return { memberships, count: count ?? memberships.length };
}

export async function assignMembership(businessId: string, userId: string, values: MembershipFormValues) {
  const { data, error } = await supabase
    .from("memberships")
    .insert({
      business_id: businessId,
      branch_id: values.branch_id || null,
      customer_id: values.customer_id,
      membership_plan_id: values.membership_plan_id || null,
      membership_code: values.membership_code,
      status: values.status,
      starts_at: values.starts_at,
      expires_at: values.expires_at || null,
      remaining_visits: values.remaining_visits || null,
      remaining_credit: values.remaining_credit || null,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function updateMembership(businessId: string, userId: string, membershipId: string, values: MembershipFormValues) {
  const { error } = await supabase
    .from("memberships")
    .update({
      branch_id: values.branch_id || null,
      customer_id: values.customer_id,
      membership_plan_id: values.membership_plan_id || null,
      membership_code: values.membership_code,
      status: values.status,
      starts_at: values.starts_at,
      expires_at: values.expires_at || null,
      remaining_visits: values.remaining_visits || null,
      remaining_credit: values.remaining_credit || null,
      updated_by: userId,
    })
    .eq("business_id", businessId)
    .eq("id", membershipId);

  if (error) throw error;
}

export async function setMembershipStatus(businessId: string, userId: string, membership: MembershipRecord, status: MembershipStatus) {
  const { error } = await supabase
    .from("memberships")
    .update({ status, updated_by: userId })
    .eq("business_id", businessId)
    .eq("id", membership.id);
  if (error) throw error;

  await addMembershipUsage({
    businessId,
    branchId: membership.branch_id,
    membershipId: membership.id,
    customerId: membership.customer_id,
    userId,
    usageType: status,
    quantity: 0,
    note: `Membership ${status}`,
  });
}

export async function renewMembership(businessId: string, userId: string, membership: MembershipRecord, durationDays = 30) {
  const start = new Date();
  const base = membership.expires_at ? new Date(membership.expires_at) : start;
  const expires = new Date(Math.max(base.getTime(), start.getTime()));
  expires.setDate(expires.getDate() + durationDays);

  const { error } = await supabase
    .from("memberships")
    .update({ status: "active", expires_at: expires.toISOString().slice(0, 10), updated_by: userId })
    .eq("business_id", businessId)
    .eq("id", membership.id);
  if (error) throw error;

  await addMembershipUsage({
    businessId,
    branchId: membership.branch_id,
    membershipId: membership.id,
    customerId: membership.customer_id,
    userId,
    usageType: "renew",
    quantity: durationDays,
    note: `Renewed for ${durationDays} days`,
  });
}

export async function deductMembershipUsage(params: {
  businessId: string;
  userId: string;
  membership: MembershipRecord;
  mode: "visit" | "credit" | "discount";
  quantity: number;
  note?: string;
}) {
  const updates: Record<string, unknown> = { updated_by: params.userId };

  if (params.mode === "visit") {
    updates.remaining_visits = Math.max(0, Number(params.membership.remaining_visits ?? 0) - params.quantity);
  }

  if (params.mode === "credit" || params.mode === "discount") {
    updates.remaining_credit = Math.max(0, Number(params.membership.remaining_credit ?? 0) - params.quantity);
  }

  const { error } = await supabase
    .from("memberships")
    .update(updates)
    .eq("business_id", params.businessId)
    .eq("id", params.membership.id);
  if (error) throw error;

  await addMembershipUsage({
    businessId: params.businessId,
    branchId: params.membership.branch_id,
    membershipId: params.membership.id,
    customerId: params.membership.customer_id,
    userId: params.userId,
    usageType: params.mode,
    quantity: params.quantity,
    note: params.note || `Deducted ${params.mode}`,
  });
}

export async function getMembershipUsage(businessId: string, membershipId: string) {
  const { data, error } = await supabase
    .from("membership_usage")
    .select("*")
    .eq("business_id", businessId)
    .eq("membership_id", membershipId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as MembershipUsageRecord[];
}

export async function getMembershipPayments(businessId: string, customerId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, status, paid_at, created_at")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .eq("source_type", "membership")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((payment) => ({
    id: payment.id,
    amount: Number(payment.amount),
    status: payment.status,
    paid_at: payment.paid_at,
    created_at: payment.created_at,
  })) as MembershipPaymentRecord[];
}

export async function getMembershipOptions(businessId: string, branchId?: string | null) {
  const [branches, customers, plans] = await Promise.all([
    optionQuery("branches", businessId, "name"),
    optionQuery("customers", businessId, "full_name", branchId),
    listMembershipPlans(businessId, branchId),
  ]);

  return {
    branches,
    customers,
    plans: plans.map((plan) => ({ id: plan.id, label: `${plan.name} (${formatPlanType(plan.plan_type)})` })),
  };
}

export async function createMembershipExport(params: {
  businessId: string;
  branchId?: string | null;
  userId: string;
  customerId?: string;
  status?: string;
  planType?: string;
  dateFrom?: string;
  dateTo?: string;
  format: "csv" | "json";
}) {
  const { data, error } = await supabase
    .from("backup_exports")
    .insert({
      business_id: params.businessId,
      branch_id: params.branchId || null,
      export_type: "memberships",
      export_scope: "module",
      export_format: params.format,
      date_from: params.dateFrom || null,
      date_to: params.dateTo || null,
      status: "pending",
      requested_by: params.userId,
      metadata: {
        module: "memberships",
        customer_id: params.customerId || null,
        status: params.status || null,
        membership_type: params.planType || null,
        includes: ["membership_plans", "memberships", "membership_usage", "payments"],
      },
    })
    .select("id")
    .single();
  if (error) throw error;

  await supabase.from("backup_export_items").insert([
    { backup_export_id: data.id, table_name: "membership_plans", status: "pending" },
    { backup_export_id: data.id, table_name: "memberships", status: "pending" },
    { backup_export_id: data.id, table_name: "membership_usage", status: "pending" },
    { backup_export_id: data.id, table_name: "payments", status: "pending" },
  ]);

  return data.id as string;
}

async function addMembershipUsage(params: {
  businessId: string;
  branchId: string | null;
  membershipId: string;
  customerId: string;
  userId: string;
  usageType: string;
  quantity: number;
  note: string;
}) {
  const { error } = await supabase.from("membership_usage").insert({
    business_id: params.businessId,
    branch_id: params.branchId,
    membership_id: params.membershipId,
    customer_id: params.customerId,
    usage_type: params.usageType,
    quantity: params.quantity,
    note: params.note,
    created_by: params.userId,
    updated_by: params.userId,
  });
  if (error) throw error;
}

async function optionQuery(table: string, businessId: string, labelColumn: string, branchId?: string | null): Promise<MembershipOption[]> {
  let query = supabase.from(table).select(`id, ${labelColumn}`).eq("business_id", businessId).limit(100);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, string>[]).map((item) => ({ id: item.id, label: item[labelColumn] }));
}

export function formatPlanType(planType: string) {
  return planType.replace(/_/g, " ");
}

export function createMemberCardCode(membership: MembershipRecord) {
  return `LUX:${membership.business_id}:${membership.customer_id}:${membership.membership_code ?? membership.id}`;
}
