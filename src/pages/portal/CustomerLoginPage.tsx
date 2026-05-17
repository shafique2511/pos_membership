import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FormField } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { getAuthErrorMessage, useAuth } from "@/features/auth/auth-context";

export function CustomerLoginPage() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer login</CardTitle>
        <CardDescription>Access bookings, memberships, rewards, receipts, and profile data.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            try {
              setLoading(true);
              await signIn(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
              navigate("/portal", { replace: true });
            } catch (error) {
              toast({ title: "Customer login failed", description: getAuthErrorMessage(error) });
            } finally {
              setLoading(false);
            }
          }}
        >
          <FormField label="Email" name="email" type="email" required />
          <FormField label="Password" name="password" type="password" required />
          <Button disabled={loading} type="submit">{loading ? "Logging in" : "Login"}</Button>
        </form>
        <Link className="mt-4 inline-block text-sm text-primary hover:underline" to="/portal/register">Create customer account</Link>
      </CardContent>
    </Card>
  );
}
