import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/shared/FormField";

export function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create owner account</CardTitle>
        <CardDescription>Register the owner profile for private-use operations.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4">
          <FormField label="Owner name" name="name" required />
          <FormField label="Email" name="email" type="email" required />
          <FormField label="Password" name="password" type="password" required />
          <Button type="submit">Register</Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Already registered? <Link className="text-primary hover:underline" to="/auth/login">Login</Link>
        </p>
      </CardContent>
    </Card>
  );
}
