import { supabase } from "@/lib/supabase/client";

export type BookingStatus = "pending" | "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show" | "rescheduled";

export type BookingRecord = {
  id: string;
  business_id: string;
  branch_id: string | null;
  customer_id: string | null;
  staff_id: string | null;
  service_id: string | null;
  resource_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string | null;
  status: BookingStatus;
  source: string;
  notes: string | null;
  internal_notes: string | null;
  total_amount: number;
  deposit_amount: number;
  created_at: string;
};

export type BookingOption = {
  id: string;
  label: string;
};

export type BookingFormValues = {
  branch_id?: string | null;
  customer_id?: string | null;
  staff_id?: string | null;
  service_id?: string | null;
  resource_id?: string | null;
  booking_date: string;
  start_time: string;
  end_time?: string | null;
  status: BookingStatus;
  source: string;
  notes?: string | null;
  internal_notes?: string | null;
  total_amount: number;
  deposit_amount: number;
};

export type BookingFilters = {
  businessId: string;
  branchId?: string | null;
  dateFrom?: string;
  dateTo?: string;
  staffId?: string;
  customerId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export async function listBookings(filters: BookingFilters) {
  const page = filters.page ?? 0;
  const pageSize = filters.pageSize ?? 20;
  let query = supabase
    .from("bookings")
    .select("*", { count: "exact" })
    .eq("business_id", filters.businessId)
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (filters.branchId) query = query.eq("branch_id", filters.branchId);
  if (filters.dateFrom) query = query.gte("booking_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("booking_date", filters.dateTo);
  if (filters.staffId) query = query.eq("staff_id", filters.staffId);
  if (filters.customerId) query = query.eq("customer_id", filters.customerId);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);

  const { data, error, count } = await query;
  if (error) throw error;
  return { bookings: (data ?? []) as unknown as BookingRecord[], count: count ?? 0 };
}

export async function createBooking(businessId: string, userId: string, values: BookingFormValues) {
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      business_id: businessId,
      ...values,
      branch_id: values.branch_id || null,
      customer_id: values.customer_id || null,
      staff_id: values.staff_id || null,
      service_id: values.service_id || null,
      resource_id: values.resource_id || null,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;

  await addBookingStatusHistory(businessId, values.branch_id ?? null, data.id, null, values.status, "Booking created", userId);

  if (values.deposit_amount > 0) {
    await supabase.from("booking_payments").insert({
      business_id: businessId,
      branch_id: values.branch_id || null,
      booking_id: data.id,
      amount: values.deposit_amount,
      status: "pending",
      created_by: userId,
      updated_by: userId,
    });
  }

  return data.id as string;
}

export async function updateBooking(businessId: string, userId: string, bookingId: string, values: BookingFormValues) {
  const { error } = await supabase
    .from("bookings")
    .update({
      ...values,
      branch_id: values.branch_id || null,
      customer_id: values.customer_id || null,
      staff_id: values.staff_id || null,
      service_id: values.service_id || null,
      resource_id: values.resource_id || null,
      updated_by: userId,
    })
    .eq("id", bookingId)
    .eq("business_id", businessId);

  if (error) throw error;
}

export async function changeBookingStatus(params: {
  businessId: string;
  branchId?: string | null;
  bookingId: string;
  oldStatus: BookingStatus;
  newStatus: BookingStatus;
  userId: string;
  note?: string;
}) {
  const { error } = await supabase
    .from("bookings")
    .update({ status: params.newStatus, updated_by: params.userId })
    .eq("business_id", params.businessId)
    .eq("id", params.bookingId);

  if (error) throw error;

  await addBookingStatusHistory(
    params.businessId,
    params.branchId ?? null,
    params.bookingId,
    params.oldStatus,
    params.newStatus,
    params.note ?? `Status changed to ${params.newStatus}`,
    params.userId
  );
}

export async function createBookingReminder(params: {
  businessId: string;
  branchId?: string | null;
  customerId?: string | null;
  bookingId: string;
  userId: string;
}) {
  const { error } = await supabase.from("notifications").insert({
    business_id: params.businessId,
    branch_id: params.branchId ?? null,
    customer_id: params.customerId ?? null,
    channel: "in_app",
    title: "Booking reminder",
    message: "Reminder prepared for this booking.",
    status: "pending",
    created_by: params.userId,
    updated_by: params.userId,
  });

  if (error) throw error;
}

export async function createBookingExport(params: {
  businessId: string;
  branchId?: string | null;
  userId: string;
  dateFrom?: string;
  dateTo?: string;
  staffId?: string;
  customerId?: string;
  status?: string;
  format: "csv" | "json";
}) {
  const { data, error } = await supabase
    .from("backup_exports")
    .insert({
      business_id: params.businessId,
      branch_id: params.branchId ?? null,
      export_type: "bookings",
      export_scope: "module",
      export_format: params.format,
      date_from: params.dateFrom || null,
      date_to: params.dateTo || null,
      status: "pending",
      requested_by: params.userId,
      metadata: {
        module: "bookings",
        staff_id: params.staffId || null,
        customer_id: params.customerId || null,
        status: params.status || null,
        includes: ["bookings", "booking_payments", "booking_status_history"],
      },
    })
    .select("id")
    .single();

  if (error) throw error;

  await supabase.from("backup_export_items").insert([
    { backup_export_id: data.id, table_name: "bookings", status: "pending" },
    { backup_export_id: data.id, table_name: "booking_payments", status: "pending" },
    { backup_export_id: data.id, table_name: "booking_status_history", status: "pending" },
  ]);

  return data.id as string;
}

export async function getBookingOptions(businessId: string, branchId?: string | null) {
  const [branches, customers, staff, services, resources] = await Promise.all([
    optionQuery("branches", businessId, "name"),
    optionQuery("customers", businessId, "full_name", branchId),
    optionQuery("staff", businessId, "full_name", branchId),
    optionQuery("services", businessId, "name", branchId),
    optionQuery("bookable_resources", businessId, "name", branchId),
  ]);

  return { branches, customers, staff, services, resources };
}

export async function getPublicBookingContext(slug: string) {
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (businessError) throw businessError;
  if (!business) return null;

  const [branches, services, resources] = await Promise.all([
    optionQuery("branches", business.id, "name"),
    optionQuery("services", business.id, "name"),
    optionQuery("bookable_resources", business.id, "name"),
  ]);

  return { business: business as { id: string; name: string; slug: string }, branches, services, resources };
}

export async function createPublicBooking(values: BookingFormValues & { business_id: string }) {
  const { error } = await supabase.from("bookings").insert({
    business_id: values.business_id,
    branch_id: values.branch_id || null,
    service_id: values.service_id || null,
    resource_id: values.resource_id || null,
    booking_date: values.booking_date,
    start_time: values.start_time,
    end_time: values.end_time || null,
    status: "pending",
    source: "public",
    notes: values.notes || null,
    internal_notes: null,
    total_amount: values.total_amount,
    deposit_amount: values.deposit_amount,
  });

  if (error) throw error;
}

async function addBookingStatusHistory(
  businessId: string,
  branchId: string | null,
  bookingId: string,
  oldStatus: BookingStatus | null,
  newStatus: BookingStatus,
  note: string,
  userId: string
) {
  const { error } = await supabase.from("booking_status_history").insert({
    business_id: businessId,
    branch_id: branchId,
    booking_id: bookingId,
    old_status: oldStatus,
    new_status: newStatus,
    note,
    changed_by: userId,
  });

  if (error) throw error;
}

async function optionQuery(table: string, businessId: string, labelColumn: string, branchId?: string | null): Promise<BookingOption[]> {
  let query = supabase.from(table).select(`id, ${labelColumn}`).eq("business_id", businessId).limit(100);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, string>[]).map((item) => ({ id: item.id, label: item[labelColumn] }));
}
