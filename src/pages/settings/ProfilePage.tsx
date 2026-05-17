import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";

export function ProfilePage() {
  const { profile, user } = useAuth();
  const role = profile?.role ?? "owner";

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{roleLabel(role)} Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Personal profile, role, branch, and account contact details.</p>
        </div>
        <Badge variant="secondary">{role}</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
          <CardDescription>Profile updates will write through Supabase with RLS once connected.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4">
            <FormField label="Full name" name="name" defaultValue={profile?.full_name ?? user?.user_metadata.full_name ?? ""} />
            <FormField label="Email" name="email" type="email" defaultValue={profile?.email ?? user?.email ?? ""} />
            <FormField label="Phone" name="phone" defaultValue={profile?.phone ?? ""} />
            <FormField label="Branch" name="branch" defaultValue={profile?.branch_id ?? ""} />
            <Button type="button">Save profile</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function roleLabel(role: string) {
  if (role === "owner") return "Owner";
  if (role === "manager") return "Manager";
  if (role === "staff") return "Staff";
  return "Customer";
}
