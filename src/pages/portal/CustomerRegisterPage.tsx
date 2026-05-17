import { useState } from "react";
import { Link } from "react-router-dom";
import { FormField } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { getAuthErrorMessage, useAuth } from "@/features/auth/auth-context";

export function CustomerRegisterPage() {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer registration</CardTitle>
        <CardDescription>Create a member portal login for customer-owned portal data.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            try {
              setLoading(true);
              await signUp({
                fullName: String(formData.get("name") ?? ""),
                email: String(formData.get("email") ?? ""),
                password: String(formData.get("password") ?? ""),
                role: "customer",
              });
              toast({ title: "Customer registration submitted", description: "Profile linking will be completed after customer records are connected." });
            } catch (error) {
              toast({ title: "Registration failed", description: getAuthErrorMessage(error) });
            } finally {
              setLoading(false);
            }
          }}
        >
          <FormField label="Full name" name="name" required />
          <FormField label="Email" name="email" type="email" required />
          <FormField label="Password" name="password" type="password" required />
          <Button disabled={loading} type="submit">{loading ? "Registering" : "Register"}</Button>
        </form>
        <Link className="mt-4 inline-block text-sm text-primary hover:underline" to="/portal/login">Back to customer login</Link>
      </CardContent>
    </Card>
  );
}
