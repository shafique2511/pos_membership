import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/shared/FormField";

export function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Send a Supabase password reset email once auth is connected.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4">
          <FormField label="Email" name="email" type="email" required />
          <Button type="submit">Send reset link</Button>
        </form>
        <Link className="mt-4 inline-block text-sm text-primary hover:underline" to="/auth/login">Back to login</Link>
      </CardContent>
    </Card>
  );
}
