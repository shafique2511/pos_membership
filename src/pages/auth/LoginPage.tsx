import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/shared/FormField";
import { useToast } from "@/components/ui/toast";
import { getAuthErrorMessage, useAuth } from "@/features/auth/auth-context";

export function LoginPage() {
  const { toast } = useToast();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Access your private business dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const email = String(formData.get("email") ?? "");
            const password = String(formData.get("password") ?? "");

            try {
              setLoading(true);
              await signIn(email, password);
              toast({ title: "Logged in" });
              navigate((location.state as { from?: string } | null)?.from ?? "/dashboard", { replace: true });
            } catch (error) {
              toast({ title: "Login failed", description: getAuthErrorMessage(error) });
            } finally {
              setLoading(false);
            }
          }}
        >
          <FormField label="Email" name="email" type="email" placeholder="owner@example.com" required />
          <FormField label="Password" name="password" type="password" required />
          <Button disabled={loading} type="submit">{loading ? "Logging in" : "Login"}</Button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link className="text-primary hover:underline" to="/auth/register">Create account</Link>
          <Link className="text-primary hover:underline" to="/auth/forgot-password">Forgot password</Link>
        </div>
      </CardContent>
    </Card>
  );
}
