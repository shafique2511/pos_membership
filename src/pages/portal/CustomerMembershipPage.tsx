import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { createMemberCardCode, getMembershipUsage, listMemberships, type MembershipRecord, type MembershipUsageRecord } from "@/features/memberships/membership-service";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/components/ui/toast";

export function CustomerMembershipPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const [usage, setUsage] = useState<Record<string, MembershipUsageRecord[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadMemberships();
  }, [auth.business?.id]);

  async function loadMemberships() {
    if (!auth.business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await listMemberships({ businessId: auth.business.id, pageSize: 20 });
      setMemberships(result.memberships);
      const usageEntries = await Promise.all(result.memberships.map(async (membership) => [membership.id, await getMembershipUsage(auth.business!.id, membership.id)] as const));
      setUsage(Object.fromEntries(usageEntries));
    } catch (error) {
      toast({ title: "Membership history failed", description: error instanceof Error ? error.message : "Customer RLS may need linked customer records." });
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState title="Loading membership" />;

  if (memberships.length === 0) {
    return <EmptyState title="No membership yet" description="Your membership details will appear here after assignment." />;
  }

  return (
    <div className="grid gap-4">
      {memberships.map((membership) => (
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
