import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MembershipFormValues, MembershipOption, MembershipPlan, MembershipPlanType, MembershipRecord, PlanFormValues } from "@/features/memberships/membership-service";

const planTypes: MembershipPlanType[] = ["monthly", "prepaid_credit", "visit_package", "vip", "service_package", "custom"];
const statuses = ["active", "expired", "cancelled", "frozen"] as const;

export function PlanForm({ plan, branches, onCancel, onSubmit }: { plan?: MembershipPlan | null; branches: MembershipOption[]; onCancel: () => void; onSubmit: (values: PlanFormValues) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<PlanFormValues>(initialPlan(plan));

  useEffect(() => setValues(initialPlan(plan)), [plan]);

  async function submit() {
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Branch" value={values.branch_id ?? ""} options={branches} onChange={(value) => setValues({ ...values, branch_id: value || null })} />
        <Select label="Type" value={values.plan_type} options={planTypes.map((type) => ({ id: type, label: type.replace(/_/g, " ") }))} onChange={(value) => setValues({ ...values, plan_type: value as MembershipPlanType })} />
        <Field label="Plan name" value={values.name} onChange={(value) => setValues({ ...values, name: value })} />
        <Field label="Price" type="number" value={String(values.price)} onChange={(value) => setValues({ ...values, price: Number(value) })} />
        <Field label="Duration days" type="number" value={String(values.duration_days ?? "")} onChange={(value) => setValues({ ...values, duration_days: value ? Number(value) : null })} />
        <Field label="Visit limit" type="number" value={String(values.visit_limit ?? "")} onChange={(value) => setValues({ ...values, visit_limit: value ? Number(value) : null })} />
        <Field label="Credit amount" type="number" value={String(values.credit_amount ?? "")} onChange={(value) => setValues({ ...values, credit_amount: value ? Number(value) : null })} />
      </div>
      <TextArea label="Description" value={values.description ?? ""} onChange={(value) => setValues({ ...values, description: value })} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button disabled={saving} type="submit">{saving ? "Saving" : plan ? "Update plan" : "Create plan"}</Button>
      </div>
    </form>
  );
}

export function MembershipForm({ membership, options, onCancel, onSubmit }: { membership?: MembershipRecord | null; options: { branches: MembershipOption[]; customers: MembershipOption[]; plans: MembershipOption[] }; onCancel: () => void; onSubmit: (values: MembershipFormValues) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<MembershipFormValues>(initialMembership(membership));

  useEffect(() => setValues(initialMembership(membership)), [membership]);

  async function submit() {
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Branch" value={values.branch_id ?? ""} options={options.branches} onChange={(value) => setValues({ ...values, branch_id: value || null })} />
        <Select label="Customer" value={values.customer_id} options={options.customers} onChange={(value) => setValues({ ...values, customer_id: value })} />
        <Select label="Plan" value={values.membership_plan_id ?? ""} options={options.plans} onChange={(value) => setValues({ ...values, membership_plan_id: value || null })} />
        <Select label="Status" value={values.status} options={statuses.map((status) => ({ id: status, label: status }))} onChange={(value) => setValues({ ...values, status: value as MembershipFormValues["status"] })} />
        <Field label="Membership code" value={values.membership_code} onChange={(value) => setValues({ ...values, membership_code: value })} />
        <Field label="Starts at" type="date" value={values.starts_at} onChange={(value) => setValues({ ...values, starts_at: value })} />
        <Field label="Expires at" type="date" value={values.expires_at ?? ""} onChange={(value) => setValues({ ...values, expires_at: value || null })} />
        <Field label="Remaining visits" type="number" value={String(values.remaining_visits ?? "")} onChange={(value) => setValues({ ...values, remaining_visits: value ? Number(value) : null })} />
        <Field label="Remaining credit" type="number" value={String(values.remaining_credit ?? "")} onChange={(value) => setValues({ ...values, remaining_credit: value ? Number(value) : null })} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button disabled={saving} type="submit">{saving ? "Saving" : membership ? "Update membership" : "Assign membership"}</Button>
      </div>
    </form>
  );
}

function initialPlan(plan?: MembershipPlan | null): PlanFormValues {
  return {
    branch_id: plan?.branch_id ?? null,
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    plan_type: plan?.plan_type ?? "monthly",
    price: plan?.price ?? 0,
    duration_days: plan?.duration_days ?? 30,
    visit_limit: plan?.visit_limit ?? null,
    credit_amount: plan?.credit_amount ?? null,
  };
}

function initialMembership(membership?: MembershipRecord | null): MembershipFormValues {
  return {
    branch_id: membership?.branch_id ?? null,
    customer_id: membership?.customer_id ?? "",
    membership_plan_id: membership?.membership_plan_id ?? null,
    membership_code: membership?.membership_code ?? `MEM-${Date.now().toString().slice(-6)}`,
    status: membership?.status ?? "active",
    starts_at: membership?.starts_at ?? new Date().toISOString().slice(0, 10),
    expires_at: membership?.expires_at ?? "",
    remaining_visits: membership?.remaining_visits ?? null,
    remaining_credit: membership?.remaining_credit ?? null,
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

function Select({ label, value, options, onChange }: { label: string; value: string; options: MembershipOption[]; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">None</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <textarea className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
