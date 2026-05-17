import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BookingFormValues, BookingOption, BookingRecord, BookingStatus } from "@/features/bookings/booking-service";

type BookingFormProps = {
  booking?: BookingRecord | null;
  options: {
    branches: BookingOption[];
    customers: BookingOption[];
    staff: BookingOption[];
    services: BookingOption[];
    resources: BookingOption[];
  };
  onSubmit: (values: BookingFormValues) => Promise<void>;
  onCancel: () => void;
};

const statuses: BookingStatus[] = ["pending", "confirmed", "checked_in", "completed", "cancelled", "no_show", "rescheduled"];

export function BookingForm({ booking, options, onSubmit, onCancel }: BookingFormProps) {
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<BookingFormValues>(createInitialValues(booking));

  useEffect(() => {
    setValues(createInitialValues(booking));
  }, [booking]);

  async function submit() {
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Branch" value={values.branch_id ?? ""} options={options.branches} onChange={(value) => setValues({ ...values, branch_id: value || null })} />
        <Select label="Customer" value={values.customer_id ?? ""} options={options.customers} onChange={(value) => setValues({ ...values, customer_id: value || null })} />
        <Select label="Staff" value={values.staff_id ?? ""} options={options.staff} onChange={(value) => setValues({ ...values, staff_id: value || null })} />
        <Select label="Service" value={values.service_id ?? ""} options={options.services} onChange={(value) => setValues({ ...values, service_id: value || null })} />
        <Select label="Resource / room / table" value={values.resource_id ?? ""} options={options.resources} onChange={(value) => setValues({ ...values, resource_id: value || null })} />
        <Select label="Status" value={values.status} options={statuses.map((status) => ({ id: status, label: formatStatus(status) }))} onChange={(value) => setValues({ ...values, status: value as BookingStatus })} />
        <Field label="Date" type="date" value={values.booking_date} onChange={(value) => setValues({ ...values, booking_date: value })} />
        <Field label="Start time" type="time" value={values.start_time} onChange={(value) => setValues({ ...values, start_time: value })} />
        <Field label="End time" type="time" value={values.end_time ?? ""} onChange={(value) => setValues({ ...values, end_time: value || null })} />
        <Field label="Total amount" type="number" value={String(values.total_amount)} onChange={(value) => setValues({ ...values, total_amount: Number(value) })} />
        <Field label="Deposit amount" type="number" value={String(values.deposit_amount)} onChange={(value) => setValues({ ...values, deposit_amount: Number(value) })} />
        <Select
          label="Booking source"
          value={values.source}
          options={[
            { id: "dashboard", label: "Dashboard" },
            { id: "walk_in", label: "Walk-in" },
            { id: "portal", label: "Customer portal" },
            { id: "public", label: "Public page" },
          ]}
          onChange={(value) => setValues({ ...values, source: value })}
        />
      </div>
      <TextArea label="Booking notes" value={values.notes ?? ""} onChange={(value) => setValues({ ...values, notes: value })} />
      <TextArea label="Internal staff notes" value={values.internal_notes ?? ""} onChange={(value) => setValues({ ...values, internal_notes: value })} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button disabled={saving} type="submit">{saving ? "Saving" : booking ? "Update booking" : "Create booking"}</Button>
      </div>
    </form>
  );
}

function createInitialValues(booking?: BookingRecord | null): BookingFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    branch_id: booking?.branch_id ?? null,
    customer_id: booking?.customer_id ?? null,
    staff_id: booking?.staff_id ?? null,
    service_id: booking?.service_id ?? null,
    resource_id: booking?.resource_id ?? null,
    booking_date: booking?.booking_date ?? today,
    start_time: booking?.start_time ?? "09:00",
    end_time: booking?.end_time ?? "09:30",
    status: booking?.status ?? "pending",
    source: booking?.source ?? "dashboard",
    notes: booking?.notes ?? "",
    internal_notes: booking?.internal_notes ?? "",
    total_amount: booking?.total_amount ?? 0,
    deposit_amount: booking?.deposit_amount ?? 0,
  };
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: BookingOption[]; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">None</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <textarea className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}
