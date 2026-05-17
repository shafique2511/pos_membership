import { useEffect, useMemo, useState } from "react";
import { DatabaseBackup, GitCompare, Package, Plus, RefreshCcw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import {
  createBranchBackup,
  listBranchBookings,
  listBranchInventory,
  listBranches,
  listBranchStaff,
  listBranchUsers,
  loadBranchComparison,
  loadBranchSummary,
  transferStock,
  updateBranchPermission,
  upsertBranch,
  type BranchComparison,
  type BranchRecord,
  type BranchSummary,
} from "@/features/branches/branch-service";
import { canExportBusinessData } from "@/lib/auth/access";

const money = new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" });

export function BranchesPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [summary, setSummary] = useState<BranchSummary | null>(null);
  const [comparison, setComparison] = useState<BranchComparison[]>([]);
  const [staff, setStaff] = useState<{ id: string; full_name: string; role_title: string | null; status: string }[]>([]);
  const [bookings, setBookings] = useState<{ id: string; booking_date: string; start_time: string; status: string; total_amount: number }[]>([]);
  const [inventory, setInventory] = useState<{ id: string; name: string; stock_quantity: number; low_stock_threshold: number }[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string; role: string; branch_id: string | null }[]>([]);
  const [branchOpen, setBranchOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchRecord | null>(null);
  const [transferProductId, setTransferProductId] = useState("");
  const [transferToBranchId, setTransferToBranchId] = useState("");
  const [transferQty, setTransferQty] = useState(1);

  const businessId = auth.business?.id;
  const userId = auth.user?.id;
  const effectiveBranchId = selectedBranchId || auth.profile?.branch_id || branches[0]?.id || "";
  const singleBranchMode = branches.length <= 1;

  useEffect(() => {
    void loadBranches();
  }, [businessId]);

  useEffect(() => {
    void loadSelectedBranch();
  }, [businessId, effectiveBranchId]);

  async function loadBranches() {
    if (!businessId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const nextBranches = await listBranches(businessId);
      setBranches(nextBranches);
      setSelectedBranchId((current) => current || nextBranches[0]?.id || "");
      setComparison(await loadBranchComparison(businessId));
      setUsers(await listBranchUsers(businessId));
    } catch (error) {
      toast({ title: "Branches failed", description: error instanceof Error ? error.message : "Check Supabase RLS." });
    } finally {
      setLoading(false);
    }
  }

  async function loadSelectedBranch() {
    if (!businessId || !effectiveBranchId) return;
    try {
      const [nextSummary, nextStaff, nextBookings, nextInventory] = await Promise.all([
        loadBranchSummary(businessId, effectiveBranchId),
        listBranchStaff(businessId, effectiveBranchId),
        listBranchBookings(businessId, effectiveBranchId),
        listBranchInventory(businessId, effectiveBranchId),
      ]);
      setSummary(nextSummary);
      setStaff(nextStaff);
      setBookings(nextBookings);
      setInventory(nextInventory);
    } catch (error) {
      toast({ title: "Branch dashboard failed", description: error instanceof Error ? error.message : "Check branch permissions." });
    }
  }

  async function saveBranch(values: Partial<BranchRecord>) {
    if (!businessId || !userId) return;
    await upsertBranch(businessId, userId, values, editingBranch?.id);
    toast({ title: editingBranch ? "Branch updated" : "Branch created" });
    setBranchOpen(false);
    setEditingBranch(null);
    await loadBranches();
  }

  async function assignUser(userProfileId: string, branchId: string | null) {
    if (!businessId || !userId) return;
    await updateBranchPermission(userProfileId, businessId, branchId, userId);
    toast({ title: "Branch permission updated" });
    setUsers(await listBranchUsers(businessId));
  }

  async function runTransfer() {
    if (!businessId || !userId || !effectiveBranchId || !transferToBranchId || !transferProductId) return;
    await transferStock({ businessId, userId, fromBranchId: effectiveBranchId, toBranchId: transferToBranchId, productId: transferProductId, quantity: transferQty });
    toast({ title: "Stock transfer recorded" });
    setTransferOpen(false);
    await loadSelectedBranch();
  }

  async function backupBranch(branchId?: string | null) {
    if (!businessId || !userId) return;
    const exportId = await createBranchBackup({ businessId, branchId, userId, format: branchId ? "json" : "zip" });
    toast({ title: "Branch backup requested", description: `Export ${exportId.slice(0, 8)} includes branch customers, bookings, POS, inventory, payments, staff, and reports.` });
  }

  const selectedBranch = useMemo(() => branches.find((branch) => branch.id === effectiveBranchId), [branches, effectiveBranchId]);

  if (loading) return <LoadingState title="Loading branches" />;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Branches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional multi-branch operations. If disabled, Luxantara Members still uses one default branch internally.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExportBusinessData(auth) ? <Button variant="outline" onClick={() => backupBranch(null)}><DatabaseBackup className="h-4 w-4" />Backup all</Button> : null}
          <Button variant="outline" onClick={() => setTransferOpen(true)}><Package className="h-4 w-4" />Transfer stock</Button>
          <Button onClick={() => { setEditingBranch(null); setBranchOpen(true); }}><Plus className="h-4 w-4" />Branch</Button>
          <Button variant="ghost" onClick={() => void loadBranches()}><RefreshCcw className="h-4 w-4" /></Button>
        </div>
      </div>

      {singleBranchMode ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-5 text-sm text-muted-foreground">
            Multi-Branch can be disabled without breaking the system. The default branch remains the internal branch for bookings, POS, inventory, staff, payments, and backups.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Branch management</CardTitle>
          <CardDescription>Create, edit, select, and back up individual branches.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {branches.length === 0 ? <EmptyState title="No branches" description="Create a default branch first." /> : branches.map((branch) => (
            <button key={branch.id} className={`rounded-lg border p-4 text-left hover:bg-secondary ${branch.id === effectiveBranchId ? "border-primary bg-primary/5" : ""}`} onClick={() => setSelectedBranchId(branch.id)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{branch.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{branch.address || "No address"}</p>
                </div>
                {branch.is_default ? <Badge variant="secondary">Default</Badge> : null}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); setEditingBranch(branch); setBranchOpen(true); }}>Edit</Button>
                {canExportBusinessData(auth) ? <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); void backupBranch(branch.id); }}>Backup</Button> : null}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {summary ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Customers" value={summary.customers} />
          <Metric label="Bookings" value={summary.bookings} />
          <Metric label="Inventory items" value={summary.inventoryItems} />
          <Metric label="Sales" value={money.format(summary.sales)} />
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Branch staff</CardTitle>
            <CardDescription>Staff assigned to {selectedBranch?.name ?? "selected branch"}.</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleTable headers={["Name", "Role", "Status"]} rows={staff.map((item) => [item.full_name, item.role_title || "-", item.status])} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Branch bookings</CardTitle>
            <CardDescription>Recent branch booking activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleTable headers={["Date", "Time", "Status"]} rows={bookings.map((item) => [item.booking_date, item.start_time, item.status])} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Branch inventory</CardTitle>
            <CardDescription>Stock levels and low stock alerts.</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleTable headers={["Product", "Stock", "Alert"]} rows={inventory.map((item) => [item.name, String(item.stock_quantity), item.stock_quantity <= item.low_stock_threshold ? "Low" : "OK"])} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Branch-level permissions</CardTitle>
            <CardDescription>Assign managers and staff to one branch or all branches.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {users.map((user) => (
                <div key={user.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_180px]">
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user.role}</p>
                  </div>
                  <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={user.branch_id ?? ""} onChange={(event) => assignUser(user.id, event.target.value || null)}>
                    <option value="">All branches</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GitCompare className="h-5 w-5 text-primary" />Branch comparison report</CardTitle>
          <CardDescription>Compare branch customers, bookings, inventory alerts, sales, and payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Customers</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Low stock</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Payments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.map((row) => (
                <TableRow key={row.branchId}>
                  <TableCell>{row.branchName}</TableCell>
                  <TableCell>{row.customers}</TableCell>
                  <TableCell>{row.bookings}</TableCell>
                  <TableCell>{row.lowStock}</TableCell>
                  <TableCell>{money.format(row.sales)}</TableCell>
                  <TableCell>{money.format(row.payments)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={branchOpen} title={editingBranch ? "Edit branch" : "Create branch"} description="Manage branch profile and status." onClose={() => setBranchOpen(false)}>
        <BranchForm branch={editingBranch} onCancel={() => setBranchOpen(false)} onSubmit={saveBranch} />
      </Dialog>

      <Dialog open={transferOpen} title="Stock transfer between branches" description="Creates transfer out and transfer in inventory transactions." onClose={() => setTransferOpen(false)}>
        <div className="grid gap-4">
          <Select label="Product" value={transferProductId} options={inventory.map((item) => ({ id: item.id, label: item.name }))} onChange={setTransferProductId} />
          <Select label="To branch" value={transferToBranchId} options={branches.filter((branch) => branch.id !== effectiveBranchId).map((branch) => ({ id: branch.id, label: branch.name }))} onChange={setTransferToBranchId} />
          <NumberField label="Quantity" value={transferQty} onChange={setTransferQty} />
          <Button onClick={runTransfer}>Transfer stock</Button>
        </div>
      </Dialog>
    </div>
  );
}

function BranchForm({ branch, onCancel, onSubmit }: { branch: BranchRecord | null; onCancel: () => void; onSubmit: (values: Partial<BranchRecord>) => Promise<void> }) {
  const [values, setValues] = useState<Partial<BranchRecord>>({
    name: branch?.name ?? "",
    code: branch?.code ?? "",
    email: branch?.email ?? "",
    phone: branch?.phone ?? "",
    address: branch?.address ?? "",
    is_default: branch?.is_default ?? false,
    status: branch?.status ?? "active",
  });

  return (
    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void onSubmit(values); }}>
      <Field label="Name" value={values.name ?? ""} onChange={(value) => setValues({ ...values, name: value })} />
      <Field label="Code" value={values.code ?? ""} onChange={(value) => setValues({ ...values, code: value })} />
      <Field label="Email" value={values.email ?? ""} onChange={(value) => setValues({ ...values, email: value })} />
      <Field label="Phone" value={values.phone ?? ""} onChange={(value) => setValues({ ...values, phone: value })} />
      <Field label="Address" value={values.address ?? ""} onChange={(value) => setValues({ ...values, address: value })} />
      <label className="flex items-center gap-3 text-sm"><input className="h-4 w-4 accent-primary" type="checkbox" checked={Boolean(values.is_default)} onChange={(event) => setValues({ ...values, is_default: event.target.checked })} />Default branch</label>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">Save branch</Button></div>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <Card><CardHeader><CardDescription>{label}</CardDescription><CardTitle>{value}</CardTitle></CardHeader></Card>;
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) return <EmptyState title="No records" description="No branch records found." />;
  return (
    <Table>
      <TableHeader><TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map((row, index) => <TableRow key={index}>{row.map((cell, cellIndex) => <TableCell key={`${index}-${cellIndex}`}>{cell}</TableCell>)}</TableRow>)}</TableBody>
    </Table>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="grid gap-2"><Label>{label}</Label><Input value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="grid gap-2"><Label>{label}</Label><Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: { id: string; label: string }[]; onChange: (value: string) => void }) {
  return <div className="grid gap-2"><Label>{label}</Label><select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>;
}
