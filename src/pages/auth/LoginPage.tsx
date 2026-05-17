import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/shared/FormField";
import { useToast } from "@/components/ui/toast";

export function LoginPage() {
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Access your private business dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            toast({ title: "Supabase auth is ready for connection", description: "Phase 1 prepares the form. Auth logic comes in the auth phase." });
          }}
        >
          <FormField label="Email" name="email" type="email" placeholder="owner@example.com" required />
          <FormField label="Password" name="password" type="password" required />
          <Button type="submit">Login</Button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link className="text-primary hover:underline" to="/auth/register">Create account</Link>
          <Link className="text-primary hover:underline" to="/auth/forgot-password">Forgot password</Link>
        </div>
      </CardContent>
    </Card>
  );
}
