import { useEffect, useState } from "react";
import { ShoppingBag, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { createMemberCardCode, getMembershipUsage, type MembershipRecord, type MembershipUsageRecord } from "@/features/memberships/membership-service";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import { createMembershipPurchaseRequest, getLinkedCustomer, listActiveMembershipPlans, listCustomerMemberships, type CustomerProfileRecord } from "@/features/portal/customer-portal-service";

export function CustomerMembershipPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<CustomerProfileRecord | null>(null);
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const [plans, setPlans] = useState<Array<Record<string, string | number | null>>>([]);
  const [usage, setUsage] = useState<Record<string, MembershipUsageRecord[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadMemberships();
  }, [auth.business?.id, auth.user?.id]);

  async function loadMemberships() {
    if (!auth.business?.id || !auth.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const linkedCustomer = await getLinkedCustomer(auth.business.id, auth.user.id);
      setCustomer(linkedCustomer);
      if (!linkedCustomer) return;
      const [nextMemberships, nextPlans] = await Promise.all([
        listCustomerMemberships(auth.business.id, linkedCustomer.id),
        listActiveMembershipPlans(auth.business.id),
      ]);
      setMemberships(nextMemberships);
      setPlans(nextPlans);
      const usageEntries = await Promise.all(nextMemberships.map(async (membership) => [membership.id, await getMembershipUsage(auth.business!.id, membership.id)] as const));
      setUsage(Object.fromEntries(usageEntries));
    } catch (error) {
      toast({ title: "Membership history failed", description: error instanceof Error ? error.message : "Customer RLS may need linked customer records." });
    } finally {
      setLoading(false);
    }
  }

  async function requestPurchase(plan: Record<string, string | number | null>) {
    if (!auth.business?.id || !auth.user?.id || !customer) return;
    await createMembershipPurchaseRequest({
      businessId: auth.business.id,
      branchId: customer.branch_id,
      customerId: customer.id,
      userId: auth.user.id,
      planId: String(plan.id),
      amount: Number(plan.price ?? 0),
    });
    toast({ title: "Membership request sent", description: "A pending manual payment record was created." });
  }

  if (loading) return <LoadingState title="Loading membership" />;

  if (!customer) {
    return <EmptyState title="Customer record not linked" description="Your customer profile must be linked before membership data appears." />;
  }

  return (
    <div className="grid gap-4">
      {memberships.length === 0 ? (
        <EmptyState title="No membership yet" description="Your membership details will appear here after assignment." />
      ) : memberships.map((membership) => (
        <Card key={membership.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{membership.membership_code}</CardTitle>
                <CardDescription>Member profile, QR card, usage, and expiry.</CardDescription>
              </div>
              <Badge variant="secondary">{membership.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-lg border p-4 text-center">
              <QrCode className="mx-auto h-16 w-16 text-primary" />
              <p className="mt-3 break-all font-mono text-xs">{createMemberCardCode(membership)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Info label="Expires" value={membership.expires_at ?? "No expiry"} />
              <Info label="Visits" value={String(membership.remaining_visits ?? "-")} />
              <Info label="Credit" value={String(membership.remaining_credit ?? "-")} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usage</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usage[membership.id] ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.usage_type}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" />Buy membership manually</CardTitle>
          <CardDescription>Request a membership plan and complete payment with the business manually.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {plans.length === 0 ? (
            <EmptyState title="No plans available" description="Active plans will appear here when configured." />
          ) : plans.map((plan) => (
            <div key={String(plan.id)} className="flex items-start justify-between gap-3 rounded-lg border p-4">
              <div>
                <p className="font-medium">{String(plan.name)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{String(plan.description ?? "Manual membership purchase")}</p>
                <Badge className="mt-3" variant="secondary">{String(plan.plan_type)} · {Number(plan.price ?? 0).toFixed(2)}</Badge>
              </div>
              <Button size="sm" onClick={() => void requestPurchase(plan)}>Request</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
