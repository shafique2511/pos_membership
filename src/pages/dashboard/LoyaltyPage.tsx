import { useEffect, useMemo, useState } from "react";
import { Download, Gift, Plus, RefreshCcw, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { LoyaltyRulesForm, RewardForm } from "@/features/loyalty/LoyaltyForms";
import {
  adjustPoints,
  createLoyaltyExport,
  formatRewardType,
  getLoyaltyOptions,
  getLoyaltyRules,
  listLoyaltyTransactions,
  listRewardRedemptions,
  listRewards,
  redeemReward,
  saveLoyaltyRules,
  updateRedemptionStatus,
  upsertReward,
  type LoyaltyOption,
  type LoyaltyRules,
  type LoyaltyTransaction,
  type RedemptionStatus,
  type RewardRecord,
  type RewardRedemption,
} from "@/features/loyalty/loyalty-service";
import { useAuth } from "@/features/auth/auth-context";
import { canExportBusinessData } from "@/lib/auth/access";
import { useToast } from "@/components/ui/toast";

const rewardTypes = ["all", "voucher", "free_service", "birthday", "referral", "custom"];

const defaultRules: LoyaltyRules = {
  earn_points_per_currency: 1,
  redemption_points_per_currency: 100,
  birthday_bonus_points: 50,
  referral_bonus_points: 100,
  allow_pos_redemption: true,
  allow_booking_redemption: true,
};

const emptyOptions = { branches: [] as LoyaltyOption[], customers: [] as LoyaltyOption[] };

export function LoyaltyPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState(defaultRules);
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [options, setOptions] = useState(emptyOptions);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardRecord | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [branchId, setBranchId] = useState(auth.profile?.role === "owner" ? "" : auth.profile?.branch_id ?? "");
  const [customerId, setCustomerId] = useState("");
  const [rewardType, setRewardType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [adjustPointsValue, setAdjustPointsValue] = useState(10);
  const [adjustNote, setAdjustNote] = useState("");
  const [redeemRewardId, setRedeemRewardId] = useState("");
  const [redeemSource, setRedeemSource] = useState<"pos" | "booking" | "portal">("pos");

  const businessId = auth.business?.id;
  const userId = auth.user?.id;

  useEffect(() => {
    void loadAll();
  }, [businessId, branchId, customerId, rewardType, dateFrom, dateTo]);

  async function loadAll() {
    if (!businessId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const scopedBranchId = branchId || (auth.profile?.role === "owner" ? null : auth.profile?.branch_id);
      const [nextRules, nextOptions, nextRewards, nextTransactions, nextRedemptions] = await Promise.all([
        getLoyaltyRules(businessId),
        getLoyaltyOptions(businessId, scopedBranchId),
        listRewards(businessId, scopedBranchId, rewardType),
        listLoyaltyTransactions({ businessId, branchId: scopedBranchId, customerId, dateFrom, dateTo }),
        listRewardRedemptions({ businessId, branchId: scopedBranchId, customerId, rewardType }),
      ]);
      setRules(nextRules);
      setOptions(nextOptions);
      setRewards(nextRewards);
      setTransactions(nextTransactions);
      setRedemptions(nextRedemptions);
    } catch (error) {
      toast({ title: "Loyalty data failed", description: error instanceof Error ? error.message : "Check Supabase RLS." });
    } finally {
      setLoading(false);
    }
  }

  async function saveRules(nextRules: LoyaltyRules) {
    if (!businessId || !userId) return;
    await saveLoyaltyRules(businessId, userId, nextRules);
    setRules(nextRules);
    toast({ title: "Loyalty rules saved" });
  }

  async function saveReward(values: Parameters<typeof upsertReward>[2]) {
    if (!businessId || !userId) return;
    await upsertReward(businessId, userId, values, editingReward?.id);
    toast({ title: editingReward ? "Reward updated" : "Reward created" });
    setRewardOpen(false);
    setEditingReward(null);
    await loadAll();
  }

  async function adjustCustomerPoints() {
    if (!businessId || !userId || !customerId) {
      toast({ title: "Customer required", description: "Select a customer before adjusting points." });
      return;
    }
    await adjustPoints({
      businessId,
      branchId: branchId || null,
      customerId,
      userId,
      points: adjustPointsValue,
      transactionType: "adjust",
      note: adjustNote || "Manual points adjustment",
    });
    toast({ title: "Points adjusted" });
    setAdjustOpen(false);
    await loadAll();
  }

  async function redeemSelectedReward() {
    if (!businessId || !userId || !customerId || !redeemRewardId) {
      toast({ title: "Customer and reward required" });
      return;
    }
    const reward = rewards.find((item) => item.id === redeemRewardId);
    if (!reward) return;
    await redeemReward({ businessId, branchId: branchId || null, customerId, reward, userId, sourceType: redeemSource });
    toast({ title: "Reward redemption created", description: `${formatRewardType(redeemSource)} redemption prepared.` });
    setRedeemOpen(false);
    await loadAll();
  }

  async function setRedemptionStatus(redemption: RewardRedemption, status: RedemptionStatus) {
    if (!businessId || !userId) return;
    await updateRedemptionStatus(businessId, userId, redemption.id, status);
    toast({ title: "Redemption updated", description: status });
    await loadAll();
  }

  async function exportLoyalty(format: "csv" | "json") {
    if (!businessId || !userId) return;
    const exportId = await createLoyaltyExport({ businessId, branchId: branchId || null, userId, customerId, rewardType, dateFrom, dateTo, format });
    toast({ title: "Loyalty export requested", description: `Export ${exportId.slice(0, 8)} includes transactions, redemptions, point history, and rewards.` });
    setExportOpen(false);
  }

  const pointsIssued = useMemo(() => transactions.filter((item) => item.points > 0).reduce((total, item) => total + item.points, 0), [transactions]);
  const pointsRedeemed = useMemo(() => Math.abs(transactions.filter((item) => item.points < 0).reduce((total, item) => total + item.points, 0)), [transactions]);

  if (loading) return <LoadingState title="Loading loyalty" />;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Loyalty & Rewards</h1>
          <p className="mt-1 text-sm text-muted-foreground">Points rules, reward catalog, redemptions, POS/booking redemption hooks, and point history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setEditingReward(null); setRewardOpen(true); }}><Plus className="h-4 w-4" />Reward</Button>
          <Button variant="outline" onClick={() => setAdjustOpen(true)}><Star className="h-4 w-4" />Adjust</Button>
          <Button onClick={() => setRedeemOpen(true)}><Gift className="h-4 w-4" />Redeem</Button>
          {canExportBusinessData(auth) ? <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="h-4 w-4" />Export</Button> : null}
          <Button variant="ghost" onClick={() => void loadAll()}><RefreshCcw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Rewards" value={rewards.length} />
        <Metric label="Points issued" value={pointsIssued} />
        <Metric label="Points redeemed" value={pointsRedeemed} />
        <Metric label="Redemptions" value={redemptions.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and export by customer, date range, reward type, and branch.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <FilterSelect label="Branch" value={branchId} options={options.branches} onChange={setBranchId} disabled={auth.profile?.role !== "owner"} />
          <FilterSelect label="Customer" value={customerId} options={options.customers} onChange={setCustomerId} />
          <SelectRaw label="Reward type" value={rewardType} options={rewardTypes} onChange={setRewardType} />
          <FilterDate label="From" value={dateFrom} onChange={setDateFrom} />
          <FilterDate label="To" value={dateTo} onChange={setDateTo} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Points earning and redemption rules</CardTitle>
          <CardDescription>Controls POS points redemption, booking points redemption, birthday rewards, and referral rewards.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoyaltyRulesForm rules={rules} onSubmit={saveRules} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rewards catalog</CardTitle>
          <CardDescription>Voucher rewards, free service rewards, birthday rewards, referral rewards, and custom rewards.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rewards.length === 0 ? <EmptyState title="No rewards" description="Create the first reward catalog item." /> : rewards.map((reward) => (
            <button key={reward.id} className="rounded-lg border p-4 text-left hover:bg-secondary" onClick={() => { setEditingReward(reward); setRewardOpen(true); }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{reward.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatRewardType(reward.reward_type)}</p>
                </div>
                <Badge variant="secondary">{reward.points_required} pts</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{reward.description || "No description"}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Points history</CardTitle>
            <CardDescription>Earn, redeem, adjust, expire, POS, and booking point transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <HistoryTable rows={transactions.map((item) => [item.transaction_type, String(item.points), item.note || "-", new Date(item.created_at).toLocaleDateString()])} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reward redemptions</CardTitle>
            <CardDescription>Approve, use, cancel, or expire redemptions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reward</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.rewards?.name ?? item.reward_id}</TableCell>
                    <TableCell>{item.points_used}</TableCell>
                    <TableCell><Badge variant="secondary">{item.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {(["approved", "used", "cancelled", "expired"] as RedemptionStatus[]).map((status) => (
                          <Button key={status} size="sm" variant="outline" onClick={() => setRedemptionStatus(item, status)}>{status}</Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={rewardOpen} title={editingReward ? "Edit reward" : "Create reward"} description="Configure reward type, points, value, and branch scope." onClose={() => setRewardOpen(false)}>
        <RewardForm reward={editingReward} branches={options.branches} onCancel={() => setRewardOpen(false)} onSubmit={saveReward} />
      </Dialog>

      <Dialog open={adjustOpen} title="Points adjustment" description="Manual earn, redeem, adjustment, birthday, referral, or expiry correction." onClose={() => setAdjustOpen(false)}>
        <div className="grid gap-4">
          <FilterSelect label="Customer" value={customerId} options={options.customers} onChange={setCustomerId} />
          <div className="grid gap-2">
            <Label>Points</Label>
            <Input type="number" value={adjustPointsValue} onChange={(event) => setAdjustPointsValue(Number(event.target.value))} />
          </div>
          <div className="grid gap-2">
            <Label>Note</Label>
            <Input value={adjustNote} onChange={(event) => setAdjustNote(event.target.value)} placeholder="Birthday reward, referral reward, correction..." />
          </div>
          <Button onClick={adjustCustomerPoints}>Apply adjustment</Button>
        </div>
      </Dialog>

      <Dialog open={redeemOpen} title="Reward redemption" description="Create POS, booking, or portal reward redemption." onClose={() => setRedeemOpen(false)}>
        <div className="grid gap-4">
          <FilterSelect label="Customer" value={customerId} options={options.customers} onChange={setCustomerId} />
          <FilterSelect label="Reward" value={redeemRewardId} options={rewards.map((reward) => ({ id: reward.id, label: `${reward.name} (${reward.points_required} pts)` }))} onChange={setRedeemRewardId} />
          <SelectRaw label="Source" value={redeemSource} options={["pos", "booking", "portal"]} onChange={(value) => setRedeemSource(value as typeof redeemSource)} />
          <Button onClick={redeemSelectedReward}>Redeem reward</Button>
        </div>
      </Dialog>

      <Dialog open={exportOpen} title="Export loyalty data" description="Owner export includes transactions, reward redemptions, points history, and rewards catalog." onClose={() => setExportOpen(false)}>
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">Current filters will be stored with the backup export request.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => exportLoyalty("json")}>JSON</Button>
            <Button onClick={() => exportLoyalty("csv")}>CSV</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function HistoryTable({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return <EmptyState title="No history" description="Point history will appear here." />;
  return (
    <Table>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={index}>
            {row.map((cell, cellIndex) => <TableCell key={`${index}-${cellIndex}`}>{cell}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function FilterDate({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function FilterSelect({ label, value, options, onChange, disabled }: { label: string; value: string; options: LoyaltyOption[]; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </div>
  );
}

function SelectRaw({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{formatRewardType(option)}</option>)}
      </select>
    </div>
  );
}
