import { supabase } from "@/lib/supabase/client";

export type PosCatalogItem = {
  id: string;
  name: string;
  type: "product" | "service" | "membership";
  price: number;
};

export type PosCartItem = PosCatalogItem & {
  quantity: number;
  discount: number;
};

export type PosPaymentInput = {
  payment_method_id?: string | null;
  method_name: string;
  amount: number;
};

export type PosOrderRecord = {
  id: string;
  order_number: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  created_at: string;
};

export async function getPosOptions(businessId: string, branchId?: string | null) {
  const [customers, staff, paymentMethods, products, services, membershipPlans] = await Promise.all([
    optionQuery("customers", businessId, "full_name", branchId),
    optionQuery("staff", businessId, "full_name", branchId),
    optionQuery("payment_methods", businessId, "name", branchId),
    catalogQuery("products", businessId, "name", "selling_price", "product", branchId),
    catalogQuery("services", businessId, "name", "price", "service", branchId),
    catalogQuery("membership_plans", businessId, "name", "price", "membership", branchId),
  ]);
  return { customers, staff, paymentMethods, catalog: [...products, ...services, ...membershipPlans] };
}

export async function createPosOrder(params: {
  businessId: string;
  branchId?: string | null;
  customerId?: string | null;
  staffId?: string | null;
  userId: string;
  cart: PosCartItem[];
  payments: PosPaymentInput[];
  discountAmount: number;
  loyaltyPointsRedeemed: number;
  prepaidCreditUsed: number;
  membershipBenefitAmount: number;
  notes?: string;
}) {
  const subtotal = params.cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const itemDiscount = params.cart.reduce((total, item) => total + item.discount, 0);
  const discountAmount = params.discountAmount + itemDiscount + params.membershipBenefitAmount + params.prepaidCreditUsed;
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const paidAmount = params.payments.reduce((total, payment) => total + payment.amount, 0);
  const orderNumber = `POS-${Date.now().toString().slice(-8)}`;

  const { data: order, error: orderError } = await supabase.from("pos_orders").insert({
    business_id: params.businessId,
    branch_id: params.branchId || null,
    customer_id: params.customerId || null,
    staff_id: params.staffId || null,
    order_number: orderNumber,
    status: paidAmount >= totalAmount ? "completed" : "open",
    subtotal,
    discount_amount: discountAmount,
    tax_amount: 0,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    notes: params.notes || null,
    completed_at: paidAmount >= totalAmount ? new Date().toISOString() : null,
    created_by: params.userId,
    updated_by: params.userId,
  }).select("id").single();
  if (orderError) throw orderError;

  const orderId = order.id as string;
  const itemRows = params.cart.map((item) => ({
    business_id: params.businessId,
    branch_id: params.branchId || null,
    pos_order_id: orderId,
    product_id: item.type === "product" ? item.id : null,
    service_id: item.type === "service" ? item.id : null,
    membership_plan_id: item.type === "membership" ? item.id : null,
    item_name: item.name,
    item_type: item.type,
    quantity: item.quantity,
    unit_price: item.price,
    discount_amount: item.discount,
    total_amount: item.price * item.quantity - item.discount,
    created_by: params.userId,
    updated_by: params.userId,
  }));

  const { error: itemError } = await supabase.from("pos_order_items").insert(itemRows);
  if (itemError) throw itemError;

  for (const payment of params.payments.filter((item) => item.amount > 0)) {
    const { data: paymentRow, error: paymentError } = await supabase.from("payments").insert({
      business_id: params.businessId,
      branch_id: params.branchId || null,
      customer_id: params.customerId || null,
      payment_method_id: payment.payment_method_id || null,
      source_type: "pos_order",
      source_id: orderId,
      amount: payment.amount,
      currency: "MYR",
      status: "paid",
      paid_at: new Date().toISOString(),
      note: payment.method_name,
      created_by: params.userId,
      updated_by: params.userId,
    }).select("id").single();
    if (paymentError) throw paymentError;

    await supabase.from("receipts").insert({
      business_id: params.businessId,
      branch_id: params.branchId || null,
      payment_id: paymentRow.id,
      pos_order_id: orderId,
      receipt_number: `R-${Date.now().toString().slice(-8)}-${payment.method_name.slice(0, 2).toUpperCase()}`,
      created_by: params.userId,
      updated_by: params.userId,
    });
  }

  for (const item of params.cart.filter((cartItem) => cartItem.type === "product")) {
    await supabase.from("inventory_transactions").insert({
      business_id: params.businessId,
      branch_id: params.branchId || null,
      product_id: item.id,
      transaction_type: "stock_out",
      quantity: item.quantity,
      reference_type: "pos_order",
      reference_id: orderId,
      note: "Auto stock deduction from POS",
      created_by: params.userId,
      updated_by: params.userId,
    });
  }

  if (params.customerId && params.loyaltyPointsRedeemed > 0) {
    await supabase.from("loyalty_transactions").insert({
      business_id: params.businessId,
      branch_id: params.branchId || null,
      customer_id: params.customerId,
      source_type: "pos",
      source_id: orderId,
      transaction_type: "redeem",
      points: -Math.abs(params.loyaltyPointsRedeemed),
      note: "POS points redemption",
      created_by: params.userId,
      updated_by: params.userId,
    });
  }

  return orderId;
}

export async function listRecentPosOrders(businessId: string, branchId?: string | null) {
  let query = supabase.from("pos_orders").select("id, order_number, total_amount, paid_amount, status, created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(25);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((item) => ({ ...item, total_amount: Number(item.total_amount), paid_amount: Number(item.paid_amount) })) as PosOrderRecord[];
}

export async function refundPosOrder(businessId: string, userId: string, order: PosOrderRecord) {
  const { error } = await supabase.from("pos_orders").update({ status: "refunded", updated_by: userId }).eq("business_id", businessId).eq("id", order.id);
  if (error) throw error;
  await supabase.from("payments").insert({
    business_id: businessId,
    source_type: "pos_refund",
    source_id: order.id,
    amount: -Math.abs(order.total_amount),
    status: "refunded",
    note: `Refund for ${order.order_number}`,
    created_by: userId,
    updated_by: userId,
  });
}

export async function createDailyClosing(businessId: string, branchId: string | null | undefined, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from("pos_orders").select("total_amount").eq("business_id", businessId).eq("status", "completed").gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`);
  if (error) throw error;
  const total = (data ?? []).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
  const { error: auditError } = await supabase.from("audit_logs").insert({
    business_id: businessId,
    branch_id: branchId || null,
    actor_user_id: userId,
    actor_role: "staff",
    action: "pos_daily_closing",
    entity_table: "pos_orders",
    metadata: { date: today, total_sales: total, order_count: data?.length ?? 0 },
  });
  if (auditError) throw auditError;
  return total;
}

export async function createPosExport(params: {
  businessId: string;
  branchId?: string | null;
  userId: string;
  dateFrom?: string;
  dateTo?: string;
  staffId?: string;
  customerId?: string;
  paymentMethodId?: string;
  format: "csv" | "json";
}) {
  const { data, error } = await supabase.from("backup_exports").insert({
    business_id: params.businessId,
    branch_id: params.branchId || null,
    export_type: "pos",
    export_scope: "module",
    export_format: params.format,
    date_from: params.dateFrom || null,
    date_to: params.dateTo || null,
    status: "pending",
    requested_by: params.userId,
    metadata: {
      module: "pos",
      staff_id: params.staffId || null,
      customer_id: params.customerId || null,
      payment_method_id: params.paymentMethodId || null,
      includes: ["pos_orders", "pos_order_items", "receipts", "payments", "refunds", "discounts"],
    },
  }).select("id").single();
  if (error) throw error;
  await supabase.from("backup_export_items").insert([
    { backup_export_id: data.id, table_name: "pos_orders", status: "pending" },
    { backup_export_id: data.id, table_name: "pos_order_items", status: "pending" },
    { backup_export_id: data.id, table_name: "receipts", status: "pending" },
    { backup_export_id: data.id, table_name: "payments", status: "pending" },
    { backup_export_id: data.id, table_name: "inventory_transactions", status: "pending" },
  ]);
  return data.id as string;
}

async function optionQuery(table: string, businessId: string, labelColumn: string, branchId?: string | null) {
  let query = supabase.from(table).select(`id, ${labelColumn}`).eq("business_id", businessId).limit(100);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, string>[]).map((item) => ({ id: item.id, label: item[labelColumn] }));
}

async function catalogQuery(table: string, businessId: string, labelColumn: string, priceColumn: string, type: PosCatalogItem["type"], branchId?: string | null): Promise<PosCatalogItem[]> {
  let query = supabase.from(table).select(`id, ${labelColumn}, ${priceColumn}`).eq("business_id", businessId).limit(100);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, string | number>[]).map((item) => ({
    id: String(item.id),
    name: String(item[labelColumn]),
    type,
    price: Number(item[priceColumn] ?? 0),
  }));
}
