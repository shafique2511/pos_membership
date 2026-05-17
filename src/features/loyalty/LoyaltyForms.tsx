import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoyaltyOption, LoyaltyRules, RewardFormValues, RewardRecord, RewardType } from "@/features/loyalty/loyalty-service";
import { formatRewardType } from "@/features/loyalty/loyalty-service";

const rewardTypes: RewardType[] = ["voucher", "free_service", "birthday", "referral", "custom"];

export function LoyaltyRulesForm({ rules, onSubmit }: { rules: LoyaltyRules; onSubmit: (rules: LoyaltyRules) => Promise<void> }) {
  const [values, setValues] = useState(rules);
  const [saving, setSaving] = useState(false);

  useEffect(() => setValues(rules), [rules]);

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
        <Field label="Earn points per currency" value={String(values.earn_points_per_currency)} onChange={(value) => setValues({ ...values, earn_points_per_currency: Number(value) })} />
        <Field label="Redemption points per currency" value={String(values.redemption_points_per_currency)} onChange={(value) => setValues({ ...values, redemption_points_per_currency: Number(value) })} />
        <Field label="Birthday bonus points" value={String(values.birthday_bonus_points)} onChange={(value) => setValues({ ...values, birthday_bonus_points: Number(value) })} />
        <Field label="Referral bonus points" value={String(values.referral_bonus_points)} onChange={(value) => setValues({ ...values, referral_bonus_points: Number(value) })} />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input className="h-4 w-4 accent-primary" type="checkbox" checked={values.allow_pos_redemption} onChange={(event) => setValues({ ...values, allow_pos_redemption: event.target.checked })} />
        Allow POS points redemption
      </label>
      <label className="flex items-center gap-3 text-sm">
        <input className="h-4 w-4 accent-primary" type="checkbox" checked={values.allow_booking_redemption} onChange={(event) => setValues({ ...values, allow_booking_redemption: event.target.checked })} />
        Allow booking points redemption
      </label>
      <Button disabled={saving} type="submit">{saving ? "Saving" : "Save rules"}</Button>
    </form>
  );
}

export function RewardForm({ reward, branches, onCancel, onSubmit }: { reward?: RewardRecord | null; branches: LoyaltyOption[]; onCancel: () => void; onSubmit: (values: RewardFormValues) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<RewardFormValues>(initialReward(reward));

  useEffect(() => setValues(initialReward(reward)), [reward]);

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
        <Select label="Branch" value={values.branch_id ?? ""} options={[{ id: "", label: "All branches" }, ...branches]} onChange={(value) => setValues({ ...values, branch_id: value || null })} />
        <Select label="Reward type" value={values.reward_type} options={rewardTypes.map((type) => ({ id: type, label: formatRewardType(type) }))} onChange={(value) => setValues({ ...values, reward_type: value as RewardType })} />
        <Field label="Reward name" value={values.name} onChange={(value) => setValues({ ...values, name: value })} />
        <Field label="Points required" value={String(values.points_required)} onChange={(value) => setValues({ ...values, points_required: Number(value) })} />
        <Field label="Reward value" value={String(values.value ?? "")} onChange={(value) => setValues({ ...values, value: value ? Number(value) : null })} />
        <Select label="Status" value={values.status} options={[{ id: "active", label: "Active" }, { id: "inactive", label: "Inactive" }]} onChange={(value) => setValues({ ...values, status: value as RewardFormValues["status"] })} />
      </div>
      <TextArea label="Description" value={values.description ?? ""} onChange={(value) => setValues({ ...values, description: value })} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button disabled={saving} type="submit">{saving ? "Saving" : reward ? "Update reward" : "Create reward"}</Button>
      </div>
    </form>
  );
}

function initialReward(reward?: RewardRecord | null): RewardFormValues {
  return {
    branch_id: reward?.branch_id ?? null,
    name: reward?.name ?? "",
    description: reward?.description ?? "",
    points_required: reward?.points_required ?? 0,
    reward_type: reward?.reward_type ?? "voucher",
    value: reward?.value ?? null,
    status: reward?.status ?? "active",
  };
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: LoyaltyOption[]; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.id || "all"} value={option.id}>{option.label}</option>)}
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
