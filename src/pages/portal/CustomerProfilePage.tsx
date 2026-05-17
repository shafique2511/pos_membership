import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { useAuth } from "@/features/auth/auth-context";
import { getLinkedCustomer, updateCustomerProfile, type CustomerProfileRecord } from "@/features/portal/customer-portal-service";
import { useToast } from "@/components/ui/toast";

export function CustomerProfilePage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<CustomerProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, [auth.business?.id, auth.user?.id]);

  async function loadProfile() {
    if (!auth.business?.id || !auth.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setCustomer(await getLinkedCustomer(auth.business.id, auth.user.id));
    } catch (error) {
      toast({ title: "Profile failed to load", description: error instanceof Error ? error.message : "Try again later." });
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.business?.id || !auth.user?.id || !customer) return;
    const formData = new FormData(event.currentTarget);

    try {
      setSaving(true);
      await updateCustomerProfile(customer.id, auth.business.id, auth.user.id, {
        full_name: String(formData.get("full_name") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        date_of_birth: String(formData.get("date_of_birth") ?? "") || null,
        gender: String(formData.get("gender") ?? "") || null,
      });
      toast({ title: "Profile updated" });
      await loadProfile();
    } catch (error) {
      toast({ title: "Profile update failed", description: error instanceof Error ? error.message : "Try again later." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState title="Loading profile" />;
  if (!customer) return <EmptyState title="Customer record not linked" description="Your customer profile must be linked before editing." />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-primary" />Profile</CardTitle>
        <CardDescription>Update your own customer profile data. This does not expose business backups or staff data.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Full name" name="full_name" defaultValue={customer.full_name} />
          <Field label="Email" name="email" type="email" defaultValue={customer.email ?? ""} />
          <Field label="Phone" name="phone" defaultValue={customer.phone ?? ""} />
          <Field label="Date of birth" name="date_of_birth" type="date" defaultValue={customer.date_of_birth ?? ""} />
          <div className="grid gap-2">
            <Label>Gender</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="gender" defaultValue={customer.gender ?? ""}>
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Button disabled={saving} type="submit">{saving ? "Saving" : "Save profile"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, name, type = "text", defaultValue }: { label: string; name: string; type?: string; defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input name={name} required={name === "full_name"} type={type} defaultValue={defaultValue} />
    </div>
  );
}
