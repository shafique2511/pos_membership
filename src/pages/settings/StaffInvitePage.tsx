import { useState } from "react";
import { FormField } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

export function StaffInvitePage() {
  const { toast } = useToast();
  const [role, setRole] = useState("staff");

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff invitation</h1>
        <p className="mt-1 text-sm text-muted-foreground">Invite managers or staff into the current business and optional branch.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Invite team member</CardTitle>
          <CardDescription>Later phases can connect this to Supabase invitation emails and `user_profiles` creation.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              toast({ title: "Invitation flow prepared", description: "Use Supabase Auth admin or edge functions later to send secure staff invites." });
            }}
          >
            <FormField label="Full name" name="name" required />
            <FormField label="Email" name="email" type="email" required />
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <select id="role" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <FormField label="Branch ID or code" name="branch" placeholder="Optional branch assignment" />
            <Button type="submit">Prepare invitation</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
