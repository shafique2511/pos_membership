import { supabase } from "@/lib/supabase/client";
import type { BookingRecord, BookingStatus } from "@/features/bookings/booking-service";
import type { MembershipRecord } from "@/features/memberships/membership-service";
import type { LoyaltyTransaction, RewardRecord, RewardRedemption } from "@/features/loyalty/loyalty-service";

export type CustomerProfileRecord = {
  id: string;
  business_id: string;
  branch_id: string | null;
  user_id: string | null;
  customer_code: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  status: string;
};

export type CustomerPaymentRecord = {
  id: string;
  business_id: string;
  branch_id: string | null;
  customer_id: string | null;
  source_type: string | null;
  source_id: string | null;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  note: string | null;
  created_at: string;
};

export type CustomerReceiptRecord = {
  id: string;
  business_id: string;
  branch_id: string | null;
  payment_id: string | null;
  pos_order_id: string | null;
  receipt_number: string;
  file_url: string | null;
  issued_at: string;
  created_at: string;
};

export type PortalBookingOptions = {
  branches: { id: string; label: string }[];
  services: { id: string; label: string; price?: number; durationMinutes?: number }[];
  resources: { id: string; label: string; type?: string }[];
};

export type PublicBusinessPageContext = {
  business: {
    id: string;
    name: string;
    slug: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    website: string | null;
  };
  modules: string[];
  branches: { id: string; label: string }[];
  services: { id: string; label: string; price?: number; durationMinutes?: number }[];
  resources: { id: string; label: string; type?: string }[];
};

export async function getLinkedCustomer(businessId: string, userId: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("id, business_id, branch_id, user_id, customer_code, full_name, email, phone, date_of_birth, gender, status")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data as CustomerProfileRecord | null;
}

export async function updateCustomerProfile(customerId: string, businessId: string, userId: string, values: {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
}) {
  const { error } = await supabase
    .from("customers")
    .update({
      full_name: values.full_name,
      email: values.email || null,
      phone: values.phone || null,
      date_of_birth: values.date_of_birth || null,
      gender: values.gender || null,
      updated_by: userId,
    })
    .eq("id", customerId)
    .eq("business_id", businessId);

  if (error) throw error;
}

export async function getPortalBookingOptions(businessId: string): Promise<PortalBookingOptions> {
  const [branches, services, resources] = await Promise.all([
    supabase.from("branches").select("id, name").eq("business_id", businessId).eq("status", "active").order("is_default", { ascending: false }).limit(50),
    supabase.from("services").select("id, name, price, duration_minutes").eq("business_id", businessId).eq("status", "active").limit(100),
    supabase.from("bookable_resources").select("id, name, resource_type").eq("business_id", businessId).eq("status", "active").limit(100),
  ]);

  if (branches.error) throw branches.error;
  if (services.error) throw services.error;
  if (resources.error) throw resources.error;

  return {
    branches: (branches.data ?? []).map((item) => ({ id: item.id, label: item.name })),
    services: (services.data ?? []).map((item) => ({ id: item.id, label: item.name, price: Number(item.price ?? 0), durationMinutes: item.duration_minutes ?? undefined })),
    resources: (resources.data ?? []).map((item) => ({ id: item.id, label: item.name, type: item.resource_type ?? undefined })),
  };
}

export async function createCustomerBooking(params: {
  businessId: string;
  userId: string;
  customerId: string;
  branchId?: string | null;
  serviceId?: string | null;
  resourceId?: string | null;
  bookingDate: string;
  startTime: string;
  notes?: string | null;
}) {
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      business_id: params.businessId,
      branch_id: params.branchId || null,
      customer_id: params.customerId,
      service_id: params.serviceId || null,
      resource_id: params.resourceId || null,
      booking_date: params.bookingDate,
      start_time: params.startTime,
      status: "pending",
      source: "portal",
      notes: params.notes || null,
      internal_notes: null,
      total_amount: 0,
      deposit_amount: 0,
      created_by: params.userId,
      updated_by: params.userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function listCustomerBookings(businessId: string, customerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as unknown as BookingRecord[];
}

export async function updateCustomerBookingStatus(params: {
  businessId: string;
  customerId: string;
  bookingId: string;
  userId: string;
  status: Extract<BookingStatus, "cancelled" | "rescheduled">;
  bookingDate?: string;
  startTime?: string;
}) {
  const patch: Record<string, unknown> = {
    status: params.status,
    updated_by: params.userId,
  };
  if (params.status === "rescheduled") {
    patch.booking_date = params.bookingDate;
    patch.start_time = params.startTime;
  }

  const { error } = await supabase
    .from("bookings")
    .update(patch)
    .eq("id", params.bookingId)
    .eq("business_id", params.businessId)
    .eq("customer_id", params.customerId)
    .in("status", ["pending", "confirmed", "rescheduled"]);

  if (error) throw error;
}

export async function listCustomerMemberships(businessId: string, customerId: string) {
  const { data, error } = await supabase
    .from("memberships")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as unknown as MembershipRecord[];
}

export async function listActiveMembershipPlans(businessId: string) {
  const { data, error } = await supabase
    .from("membership_plans")
    .select("id, name, description, plan_type, price, duration_days, visit_limit, credit_amount")
    .eq("business_id", businessId)
    .eq("status", "active")
    .order("price", { ascending: true })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as Array<Record<string, string | number | null>>;
}

export async function createMembershipPurchaseRequest(params: {
  businessId: string;
  branchId?: string | null;
  customerId: string;
  userId: string;
  planId: string;
  amount: number;
}) {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      business_id: params.businessId,
      branch_id: params.branchId ?? null,
      customer_id: params.customerId,
      source_type: "membership_manual_purchase",
      source_id: params.planId,
      amount: params.amount,
      status: "pending",
      note: "Customer requested manual membership purchase from portal.",
      created_by: params.userId,
      updated_by: params.userId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function getCustomerPointBalance(businessId: string, customerId: string) {
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("points")
    .eq("business_id", businessId)
    .eq("customer_id", customerId);

  if (error) throw error;
  return (data ?? []).reduce((total, item) => total + Number(item.points ?? 0), 0);
}

export async function listCustomerLoyalty(businessId: string, customerId: string) {
  const [transactions, redemptions, rewards] = await Promise.all([
    supabase.from("loyalty_transactions").select("*").eq("business_id", businessId).eq("customer_id", customerId).order("created_at", { ascending: false }).limit(100),
    supabase.from("reward_redemptions").select("*").eq("business_id", businessId).eq("customer_id", customerId).order("created_at", { ascending: false }).limit(100),
    supabase.from("rewards").select("*").eq("business_id", businessId).eq("status", "active").order("points_required", { ascending: true }).limit(100),
  ]);

  if (transactions.error) throw transactions.error;
  if (redemptions.error) throw redemptions.error;
  if (rewards.error) throw rewards.error;

  return {
    transactions: (transactions.data ?? []) as unknown as LoyaltyTransaction[],
    redemptions: (redemptions.data ?? []) as unknown as RewardRedemption[],
    rewards: (rewards.data ?? []) as unknown as RewardRecord[],
  };
}

export async function redeemCustomerReward(params: {
  businessId: string;
  branchId?: string | null;
  customerId: string;
  userId: string;
  reward: RewardRecord;
}) {
  const { error } = await supabase.from("reward_redemptions").insert({
    business_id: params.businessId,
    branch_id: params.branchId ?? null,
    customer_id: params.customerId,
    reward_id: params.reward.id,
    points_used: params.reward.points_required,
    status: "pending",
    source_type: "portal",
    created_by: params.userId,
    updated_by: params.userId,
  });

  if (error) throw error;
}

export async function listCustomerPaymentsAndReceipts(businessId: string, customerId: string) {
  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (paymentsError) throw paymentsError;

  const paymentIds = (payments ?? []).map((payment) => payment.id);
  if (paymentIds.length === 0) {
    return { payments: [] as CustomerPaymentRecord[], receipts: [] as CustomerReceiptRecord[] };
  }

  const { data: receipts, error: receiptsError } = await supabase
    .from("receipts")
    .select("*")
    .eq("business_id", businessId)
    .in("payment_id", paymentIds)
    .order("issued_at", { ascending: false })
    .limit(100);

  if (receiptsError) throw receiptsError;
  return {
    payments: (payments ?? []) as unknown as CustomerPaymentRecord[],
    receipts: (receipts ?? []) as unknown as CustomerReceiptRecord[],
  };
}

export async function getPortalSettings(businessId: string) {
  const { data, error } = await supabase.rpc("get_customer_portal_settings", { target_business_id: businessId });
  if (error) throw error;
  return (data ?? {}) as { allow_receipt_download?: boolean };
}

export async function getPublicBusinessPage(slug: string): Promise<PublicBusinessPageContext | null> {
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, slug, email, phone, address, website")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (businessError) throw businessError;
  if (!business) return null;

  const options = await getPortalBookingOptions(business.id);

  return {
    business,
    modules: [...(options.services.length || options.resources.length ? ["bookings"] : []), "customer_portal"],
    branches: options.branches,
    services: options.services,
    resources: options.resources,
  };
}
