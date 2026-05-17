import { useEffect, useMemo, useState } from "react";
import { Gift, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { getCustomerPointBalance, listLoyaltyTransactions, listRewardRedemptions, listRewards, redeemReward, type LoyaltyTransaction, type RewardRecord, type RewardRedemption } from "@/features/loyalty/loyalty-service";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/components/ui/toast";

export function CustomerRewardsPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    void loadRewards();
  }, [auth.business?.id]);

  async function loadRewards() {
    if (!auth.business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [nextRewards, nextTransactions, nextRedemptions] = await Promise.all([
        listRewards(auth.business.id),
        listLoyaltyTransactions({ businessId: auth.business.id }),
        listRewardRedemptions({ businessId: auth.business.id }),
      ]);
      setRewards(nextRewards.filter((reward) => reward.status === "active"));
      setTransactions(nextTransactions);
      setRedemptions(nextRedemptions);
      const customerId = nextTransactions[0]?.customer_id ?? nextRedemptions[0]?.customer_id;
      setBalance(customerId ? await getCustomerPointBalance(auth.business.id, customerId) : 0);
    } catch (error) {
      toast({ title: "Rewards failed", description: error instanceof Error ? error.message : "Customer RLS may need linked customer records." });
    } finally {
      setLoading(false);
    }
  }

  async function redeem(reward: RewardRecord) {
    const customerId = transactions[0]?.customer_id ?? redemptions[0]?.customer_id;
    if (!auth.business?.id || !auth.user?.id || !customerId) {
      toast({ title: "Customer profile required", description: "A linked customer record is needed before redemption." });
      return;
    }

    await redeemReward({ businessId: auth.business.id, customerId, reward, userId: auth.user.id, sourceType: "portal" });
    toast({ title: "Reward redemption requested" });
    await loadRewards();
  }

  const pointsIssued = useMemo(() => transactions.filter((item) => item.points > 0).reduce((total, item) => total + item.points, 0), [transactions]);

  if (loading) return <LoadingState title="Loading rewards" />;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-primary" />Rewards</CardTitle>
          <CardDescription>Points balance, points history, and reward redemption.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Info label="Balance" value={`${balance} pts`} />
          <Info label="Points issued" value={`${pointsIssued} pts`} />
          <Info label="Redemptions" value={String(redemptions.length)} />
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {rewards.length === 0 ? <EmptyState title="No rewards available" description="Rewards will appear here when active." /> : rewards.map((reward) => (
          <Card key={reward.id}>
            <CardContent className="flex items-start justify-between gap-3 pt-5">
              <div>
                <p className="font-medium">{reward.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{reward.description || "No description"}</p>
                <Badge className="mt-3" variant="secondary">{reward.points_required} pts</Badge>
              </div>
              <Button size="sm" onClick={() => redeem(reward)}><Gift className="h-4 w-4" />Redeem</Button>
            </CardContent>
          </Card>
        ))}
      </div>
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
