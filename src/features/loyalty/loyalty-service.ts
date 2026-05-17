import { supabase } from "@/lib/supabase/client";

export type RewardType = "voucher" | "free_service" | "birthday" | "referral" | "custom";
export type RedemptionStatus = "pending" | "approved" | "used" | "cancelled" | "expired";
export type LoyaltyTransactionType = "earn" | "redeem" | "adjust" | "expire";

export type LoyaltyRules = {
  earn_points_per_currency: number;
  redemption_points_per_currency: number;
  birthday_bonus_points: number;
  referral_bonus_points: number;
  allow_pos_redemption: boolean;
  allow_booking_redemption: boolean;
};

export type RewardRecord = {
  id: string;
  business_id: string;
  branch_id: string | null;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: RewardType;
  value: number | null;
  status: "active" | "inactive";
};

export type LoyaltyTransaction = {
  id: string;
  business_id: string;
  branch_id: string | null;
  customer_id: string;
  source_type: string | null;
  source_id: string | null;
  transaction_type: LoyaltyTransactionType;
  points: number;
  balance_after: number | null;
  note: string | null;
  created_at: string;
};

export type RewardRedemption = {
  id: string;
  business_id: string;
  branch_id: string | null;
  reward_id: string;
  customer_id: string;
  points_used: number;
  status: RedemptionStatus;
  redeemed_at: string | null;
  created_at: string;
  rewards?: { name: string; reward_type: RewardType } | null;
};

export type LoyaltyOption = {
  id: string;
  label: string;
};

export type RewardFormValues = {
  branch_id?: string | null;
  name: string;
  description?: string | null;
  points_required: number;
  reward_type: RewardType;
  value?: number | null;
  status: "active" | "inactive";
};

export async function getLoyaltyRules(businessId: string): Promise<LoyaltyRules> {
  const { data, error } = await supabase
    .from("module_settings")
    .select("settings")
    .eq("business_id", businessId)
    .eq("module_key", "loyalty")
    .maybeSingle();
  if (error) throw error;
  return {
    earn_points_per_currency: Number(data?.settings?.earn_points_per_currency ?? 1),
    redemption_points_per_currency: Number(data?.settings?.redemption_points_per_currency ?? 100),
    birthday_bonus_points: Number(data?.settings?.birthday_bonus_points ?? 50),
    referral_bonus_points: Number(data?.settings?.referral_bonus_points ?? 100),
    allow_pos_redemption: data?.settings?.allow_pos_redemption !== false,
    allow_booking_redemption: data?.settings?.allow_booking_redemption !== false,
  };
}

export async function saveLoyaltyRules(businessId: string, userId: string, rules: LoyaltyRules) {
  const { error } = await supabase.from("module_settings").upsert(
    {
      business_id: businessId,
      module_key: "loyalty",
      settings: rules,
      created_by: userId,
      updated_by: userId,
    },
    { onConflict: "business_id,branch_id,module_key" }
  );
  if (error) throw error;
}

export async function listRewards(businessId: string, branchId?: string | null, rewardType?: string) {
  let query = supabase.from("rewards").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100);
  if (branchId) query = query.eq("branch_id", branchId);
  if (rewardType && rewardType !== "all") query = query.eq("reward_type", rewardType);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as RewardRecord[];
}

export async function upsertReward(businessId: string, userId: string, values: RewardFormValues, rewardId?: string) {
  const payload = {
    business_id: businessId,
    branch_id: values.branch_id || null,
    name: values.name,
    description: values.description || null,
    points_required: values.points_required,
    reward_type: values.reward_type,
    value: values.value || null,
    status: values.status,
    created_by: userId,
    updated_by: userId,
  };
  const query = rewardId
    ? supabase.from("rewards").update(payload).eq("business_id", businessId).eq("id", rewardId)
    : supabase.from("rewards").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function listLoyaltyTransactions(params: {
  businessId: string;
  branchId?: string | null;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  let query = supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("business_id", params.businessId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (params.branchId) query = query.eq("branch_id", params.branchId);
  if (params.customerId) query = query.eq("customer_id", params.customerId);
  if (params.dateFrom) query = query.gte("created_at", `${params.dateFrom}T00:00:00`);
  if (params.dateTo) query = query.lte("created_at", `${params.dateTo}T23:59:59`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as LoyaltyTransaction[];
}

export async function listRewardRedemptions(params: {
  businessId: string;
  branchId?: string | null;
  customerId?: string;
  rewardType?: string;
}) {
  let query = supabase
    .from("reward_redemptions")
    .select("*, rewards(name, reward_type)")
    .eq("business_id", params.businessId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (params.branchId) query = query.eq("branch_id", params.branchId);
  if (params.customerId) query = query.eq("customer_id", params.customerId);
  const { data, error } = await query;
  if (error) throw error;
  const redemptions = (data ?? []) as unknown as RewardRedemption[];
  return params.rewardType && params.rewardType !== "all"
    ? redemptions.filter((item) => item.rewards?.reward_type === params.rewardType)
    : redemptions;
}

export async function adjustPoints(params: {
  businessId: string;
  branchId?: string | null;
  customerId: string;
  userId: string;
  points: number;
  transactionType: LoyaltyTransactionType;
  sourceType?: string;
  note?: string;
}) {
  const balance = await getCustomerPointBalance(params.businessId, params.customerId);
  const nextBalance = balance + params.points;
  const { error } = await supabase.from("loyalty_transactions").insert({
    business_id: params.businessId,
    branch_id: params.branchId || null,
    customer_id: params.customerId,
    source_type: params.sourceType || "manual",
    transaction_type: params.transactionType,
    points: params.points,
    balance_after: nextBalance,
    note: params.note || "Points adjustment",
    created_by: params.userId,
    updated_by: params.userId,
  });
  if (error) throw error;
}

export async function redeemReward(params: {
  businessId: string;
  branchId?: string | null;
  customerId: string;
  reward: RewardRecord;
  userId: string;
  sourceType?: "pos" | "booking" | "portal";
}) {
  const { data, error } = await supabase.from("reward_redemptions").insert({
    business_id: params.businessId,
    branch_id: params.branchId || null,
    reward_id: params.reward.id,
    customer_id: params.customerId,
    points_used: params.reward.points_required,
    status: "pending",
    redeemed_at: new Date().toISOString(),
    created_by: params.userId,
    updated_by: params.userId,
  }).select("id").single();
  if (error) throw error;

  await adjustPoints({
    businessId: params.businessId,
    branchId: params.branchId,
    customerId: params.customerId,
    userId: params.userId,
    points: -Math.abs(params.reward.points_required),
    transactionType: "redeem",
    sourceType: params.sourceType || "portal",
    note: `Redeemed ${params.reward.name}`,
  });

  return data.id as string;
}

export async function updateRedemptionStatus(businessId: string, userId: string, redemptionId: string, status: RedemptionStatus) {
  const { error } = await supabase
    .from("reward_redemptions")
    .update({ status, updated_by: userId })
    .eq("business_id", businessId)
    .eq("id", redemptionId);
  if (error) throw error;
}

export async function getCustomerPointBalance(businessId: string, customerId: string) {
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("points")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .limit(1000);
  if (error) throw error;
  return (data ?? []).reduce((total, item) => total + Number(item.points ?? 0), 0);
}

export async function getLoyaltyOptions(businessId: string, branchId?: string | null) {
  const [branches, customers] = await Promise.all([
    optionQuery("branches", businessId, "name"),
    optionQuery("customers", businessId, "full_name", branchId),
  ]);
  return { branches, customers };
}

export async function createLoyaltyExport(params: {
  businessId: string;
  branchId?: string | null;
  userId: string;
  customerId?: string;
  rewardType?: string;
  dateFrom?: string;
  dateTo?: string;
  format: "csv" | "json";
}) {
  const { data, error } = await supabase.from("backup_exports").insert({
    business_id: params.businessId,
    branch_id: params.branchId || null,
    export_type: "loyalty",
    export_scope: "module",
    export_format: params.format,
    date_from: params.dateFrom || null,
    date_to: params.dateTo || null,
    status: "pending",
    requested_by: params.userId,
    metadata: {
      module: "loyalty",
      customer_id: params.customerId || null,
      reward_type: params.rewardType || null,
      includes: ["loyalty_transactions", "reward_redemptions", "rewards"],
    },
  }).select("id").single();
  if (error) throw error;

  await supabase.from("backup_export_items").insert([
    { backup_export_id: data.id, table_name: "loyalty_transactions", status: "pending" },
    { backup_export_id: data.id, table_name: "reward_redemptions", status: "pending" },
    { backup_export_id: data.id, table_name: "rewards", status: "pending" },
  ]);

  return data.id as string;
}

async function optionQuery(table: string, businessId: string, labelColumn: string, branchId?: string | null): Promise<LoyaltyOption[]> {
  let query = supabase.from(table).select(`id, ${labelColumn}`).eq("business_id", businessId).limit(100);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, string>[]).map((item) => ({ id: item.id, label: item[labelColumn] }));
}

export function formatRewardType(value: string) {
  return value.replace(/_/g, " ");
}
