import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusiness } from "@/features/business/business-context";

export function CustomerPortalPage() {
  const { getBusinessLabel } = useBusiness();

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Member Dashboard</CardTitle>
              <CardDescription>Mobile-first portal for customer self-service.</CardDescription>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{getBusinessLabel("booking")}</p>
            <p className="mt-1 font-medium">No upcoming records</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Membership</p>
            <p className="mt-1 font-medium">Ready for member data</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Loyalty</p>
            <p className="mt-1 font-medium">0 points</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
