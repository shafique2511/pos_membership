import { useEffect, useState } from "react";
import { CreditCard, Download, IdCard, Plus, QrCode, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { MembershipForm, PlanForm } from "@/features/memberships/MembershipForms";
import {
  assignMembership,
  createMemberCardCode,
  createMembershipExport,
  deductMembershipUsage,
  formatPlanType,
  getMembershipOptions,
  getMembershipPayments,
  getMembershipUsage,
  listMembershipPlans,
  listMemberships,
  renewMembership,
  setMembershipStatus,
  updateMembership,
  upsertMembershipPlan,
  type MembershipFormValues,
  type MembershipOption,
  type MembershipPaymentRecord,
  type MembershipPlan,
  type MembershipRecord,
  type MembershipStatus,
  type MembershipUsageRecord,
  type PlanFormValues,
} from "@/features/memberships/membership-service";
import { useAuth } from "@/features/auth/auth-context";
import { canExportBusinessData } from "@/lib/auth/access";
import { useToast } from "@/components/ui/toast";

const statusOptions = ["all", "active", "expired", "cancelled", "frozen"];
const typeOptions = ["all", "monthly", "prepaid_credit", "visit_package", "vip", "service_package", "custom"];

const emptyOptions = {
  branches: [] as MembershipOption[],
  customers: [] as MembershipOption[],
  plans: [] as MembershipOption[],
};

export function MembershipsPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const [count, setCount] = useState(0);
  const [options, setOptions] = useState(emptyOptions);
  const [planOpen, setPlanOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [editingMembership, setEditingMembership] = useState<MembershipRecord | null>(null);
  const [selectedMembership, setSelectedMembership] = useState<MembershipRecord | null>(null);
  const [usage, setUsage] = useState<MembershipUsageRecord[]>([]);
  const [payments, setPayments] = useState<MembershipPaymentRecord[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("all");
  const [planType, setPlanType] = useState("all");
  const [customerId, setCustomerId] = useState("");
  const [branchId, setBranchId] = useState(auth.profile?.role === "owner" ? "" : auth.profile?.branch_id ?? "");

  const businessId = auth.business?.id;
  const userId = auth.user?.id;

  useEffect(() => {
    void loadOptions();
  }, [businessId, auth.profile?.branch_id]);

  useEffect(() => {
    void loadMemberships();
  }, [businessId, branchId, dateFrom, dateTo, status, planType, customerId]);

  async function loadOptions() {
    if (!businessId) return;
    try {
      const scopedBranchId = auth.profile?.role === "owner" ? null : auth.profile?.branch_id;
      setOptions(await getMembershipOptions(businessId, scopedBranchId));
      setPlans(await listMembershipPlans(businessId, scopedBranchId));
    } catch (error) {
      toast({ title: "Membership options failed", description: error instanceof Error ? error.message : "Check Supabase RLS." });
    }
  }

  async function loadMemberships() {
    if (!businessId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const result = await listMemberships({
        businessId,
        branchId: branchId || (auth.profile?.role === "owner" ? null : auth.profile?.branch_id),
        customerId,
        status,
        planType,
        dateFrom,
        dateTo,
      });
      setMemberships(result.memberships);
      setCount(result.count);
    } catch (error) {
      toast({ title: "Memberships failed", description: error instanceof Error ? error.message : "Check Supabase RLS." });
    } finally {
      setLoading(false);
    }
  }

  async function savePlan(values: PlanFormValues) {
    if (!businessId || !userId) return;
    await upsertMembershipPlan(businessId, userId, values, editingPlan?.id);
    toast({ title: editingPlan ? "Plan updated" : "Plan created" });
    setPlanOpen(false);
    setEditingPlan(null);
    await loadOptions();
  }

  async function saveMembership(values: MembershipFormValues) {
    if (!businessId || !userId) return;
    if (editingMembership) {
      await updateMembership(businessId, userId, editingMembership.id, values);
      toast({ title: "Membership updated" });
    } else {
      await assignMembership(businessId, userId, values);
      toast({ title: "Membership assigned" });
    }
    setMembershipOpen(false);
    setEditingMembership(null);
    await loadMemberships();
  }

  async function statusAction(membership: MembershipRecord, nextStatus: MembershipStatus) {
    if (!businessId || !userId) return;
    await setMembershipStatus(businessId, userId, membership, nextStatus);
    toast({ title: "Membership status updated", description: nextStatus });
    await loadMemberships();
  }

  async function renewAction(membership: MembershipRecord) {
    if (!businessId || !userId) return;
    await renewMembership(businessId, userId, membership, 30);
    toast({ title: "Membership renewed", description: "30 days added." });
    await loadMemberships();
  }

  async function deductAction(membership: MembershipRecord, mode: "visit" | "credit" | "discount") {
    if (!businessId || !userId) return;
    await deductMembershipUsage({ businessId, userId, membership, mode, quantity: 1 });
    toast({ title: "Membership usage recorded", description: `${mode} deducted.` });
    await loadMemberships();
  }

  async function openProfile(membership: MembershipRecord) {
    if (!businessId) return;
    setSelectedMembership(membership);
    setUsage(await getMembershipUsage(businessId, membership.id));
    setPayments(await getMembershipPayments(businessId, membership.customer_id));
    setProfileOpen(true);
  }

  async function exportMemberships(format: "csv" | "json") {
    if (!businessId || !userId) return;
    const exportId = await createMembershipExport({
      businessId,
      branchId: branchId || null,
      userId,
      customerId,
      status,
      planType,
      dateFrom,
      dateTo,
      format,
    });
    toast({ title: "Membership export requested", description: `Export ${exportId.slice(0, 8)} includes plans, memberships, usage, and payments.` });
    setExportOpen(false);
  }

  if (loading) return <LoadingState title="Loading memberships" />;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Memberships</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plans, member assignment, renewals, freezes, upgrades, credits, visits, and QR member cards.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setEditingPlan(null); setPlanOpen(true); }}><Plus className="h-4 w-4" />Plan</Button>
          <Button onClick={() => { setEditingMembership(null); setMembershipOpen(true); }}><IdCard className="h-4 w-4" />Assign</Button>
          {canExportBusinessData(auth) ? <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="h-4 w-4" />Export</Button> : null}
          <Button variant="ghost" onClick={() => { void loadOptions(); void loadMemberships(); }}><RefreshCcw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Plans" value={plans.length} />
        <Metric label="Active" value={memberships.filter((membership) => membership.status === "active").length} />
        <Metric label="Expiring" value={memberships.filter((membership) => membership.expires_at && new Date(membership.expires_at) <= addDays(30)).length} />
        <Metric label="Filtered records" value={count} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Export and list by customer, status, date range, branch, and membership type.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-6">
          <FilterDate label="From" value={dateFrom} onChange={setDateFrom} />
          <FilterDate label="To" value={dateTo} onChange={setDateTo} />
          <FilterSelect label="Branch" value={branchId} options={options.branches} onChange={setBranchId} disabled={auth.profile?.role !== "owner"} />
          <FilterSelect label="Customer" value={customerId} options={options.customers} onChange={setCustomerId} />
          <SelectRaw label="Status" value={status} options={statusOptions} onChange={setStatus} />
          <SelectRaw label="Type" value={planType} options={typeOptions} onChange={setPlanType} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membership plans</CardTitle>
          <CardDescription>Monthly, prepaid credit, visit package, VIP, service package, and custom plans.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plans.length === 0 ? <EmptyState title="No plans" description="Create a membership plan first." /> : plans.map((plan) => (
            <button key={plan.id} className="rounded-lg border p-4 text-left hover:bg-secondary" onClick={() => { setEditingPlan(plan); setPlanOpen(true); }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{plan.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatPlanType(plan.plan_type)}</p>
                </div>
                <Badge variant="secondary">RM {plan.price}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{plan.description || "No description"}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Member records</CardTitle>
          <CardDescription>Track expiry, usage, renewals, payments, credits, visits, and status.</CardDescription>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? <EmptyState title="No memberships found" description="Assign a customer membership or adjust your filters." /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((membership) => (
                  <TableRow key={membership.id}>
                    <TableCell className="font-medium">{membership.membership_code}</TableCell>
                    <TableCell><Badge variant="secondary">{membership.status}</Badge></TableCell>
                    <TableCell>{membership.expires_at || "No expiry"}</TableCell>
                    <TableCell>{membership.remaining_visits ?? "-"}</TableCell>
                    <TableCell>{membership.remaining_credit ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditingMembership(membership); setMembershipOpen(true); }}>Edit</Button>
                        <Button size="sm" variant="outline" onClick={() => renewAction(membership)}>Renew</Button>
                        <Button size="sm" variant="outline" onClick={() => statusAction(membership, "frozen")}>Freeze</Button>
                        <Button size="sm" variant="outline" onClick={() => statusAction(membership, "active")}>Upgrade</Button>
                        <Button size="sm" variant="outline" onClick={() => deductAction(membership, "visit")}>Visit</Button>
                        <Button size="sm" variant="outline" onClick={() => deductAction(membership, "credit")}>Credit</Button>
                        <Button size="sm" variant="outline" onClick={() => deductAction(membership, "discount")}>Discount</Button>
                        <Button size="sm" variant="destructive" onClick={() => statusAction(membership, "cancelled")}>Cancel</Button>
                        <Button size="sm" variant="ghost" onClick={() => openProfile(membership)}><QrCode className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={planOpen} title={editingPlan ? "Edit membership plan" : "Create membership plan"} description="Configure type, price, duration, visits, and credit." onClose={() => setPlanOpen(false)}>
        <PlanForm plan={editingPlan} branches={options.branches} onCancel={() => setPlanOpen(false)} onSubmit={savePlan} />
      </Dialog>

      <Dialog open={membershipOpen} title={editingMembership ? "Edit membership" : "Assign customer membership"} description="Assign customer membership and starting balance." onClose={() => setMembershipOpen(false)}>
        <MembershipForm membership={editingMembership} options={options} onCancel={() => setMembershipOpen(false)} onSubmit={saveMembership} />
      </Dialog>

      <Dialog open={profileOpen} title="Member profile" description="QR member card, usage history, and membership payment history." onClose={() => setProfileOpen(false)}>
        {selectedMembership ? (
          <div className="grid gap-4">
            <div className="rounded-lg border p-4 text-center">
              <QrCode className="mx-auto h-16 w-16 text-primary" />
              <p className="mt-3 font-mono text-xs break-all">{createMemberCardCode(selectedMembership)}</p>
              <p className="mt-2 text-sm text-muted-foreground">QR member card payload structure.</p>
            </div>
            <HistoryTable title="Usage history" rows={usage.map((item) => [item.usage_type, String(item.quantity), new Date(item.created_at).toLocaleDateString()])} />
            <HistoryTable title="Payment history" rows={payments.map((item) => [`RM ${item.amount}`, item.status, new Date(item.created_at).toLocaleDateString()])} />
          </div>
        ) : null}
      </Dialog>

      <Dialog open={exportOpen} title="Export membership data" description="Owner export includes plans, active/expired memberships, usage history, and payment history." onClose={() => setExportOpen(false)}>
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">Current filters will be stored with the backup export request.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => exportMemberships("json")}>JSON</Button>
            <Button onClick={() => exportMemberships("csv")}>CSV</Button>
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

function FilterDate({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function FilterSelect({ label, value, options, onChange, disabled }: { label: string; value: string; options: MembershipOption[]; onChange: (value: string) => void; disabled?: boolean }) {
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
        {options.map((option) => <option key={option} value={option}>{formatPlanType(option)}</option>)}
      </select>
    </div>
  );
}

function HistoryTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="font-medium">{title}</p>
      {rows.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No records yet.</p> : (
        <div className="mt-3 grid gap-2">
          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-3 gap-2 text-sm">
              {row.map((cell) => <span key={cell} className="truncate">{cell}</span>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
