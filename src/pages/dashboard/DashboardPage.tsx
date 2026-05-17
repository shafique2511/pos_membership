import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  CircleDollarSign,
  DatabaseBackup,
  IdCard,
  PackageSearch,
  RefreshCcw,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { useAuth } from "@/features/auth/auth-context";
import { useBusiness } from "@/features/business/business-context";
import { businessTypeLabels } from "@/features/business/business-types";
import { createBackupExport, loadDashboardSummary, type ChartPoint, type DashboardSummary } from "@/features/dashboard/dashboard-service";
import { canExportBusinessData } from "@/lib/auth/access";
import { useToast } from "@/components/ui/toast";
import type { ModuleKey } from "@/types/business";

const currencyFormatter = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  maximumFractionDigits: 0,
});

export function DashboardPage() {
  const auth = useAuth();
  const { businessName, businessType, enabledModuleKeys, isModuleEnabled, getBusinessLabel } = useBusiness();
  const { toast } = useToast();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const isOwner = auth.profile?.role === "owner";
  const branchId = auth.profile?.role === "owner" ? null : auth.profile?.branch_id;

  useEffect(() => {
    void loadSummary();
  }, [auth.business?.id, auth.profile?.branch_id, enabledModuleKeys.join(":")]);

  async function loadSummary() {
    if (!auth.business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setSummary(
        await loadDashboardSummary({
          businessId: auth.business.id,
          branchId,
          enabledModules: enabledModuleKeys,
          isOwner,
        })
      );
    } catch (error) {
      toast({ title: "Dashboard data failed", description: error instanceof Error ? error.message : "Check Supabase RLS and data setup." });
    } finally {
      setLoading(false);
    }
  }

  async function createBackup() {
    if (!auth.business?.id || !auth.user?.id || !canExportBusinessData(auth)) return;

    try {
      setBackupLoading(true);
      await createBackupExport(auth.business.id, null, auth.user.id);
      await loadSummary();
      toast({ title: "Backup requested", description: "A pending backup export was created." });
    } catch (error) {
      toast({ title: "Backup request failed", description: error instanceof Error ? error.message : "Only the Owner can create full backups." });
    } finally {
      setBackupLoading(false);
    }
  }

  const metricCards = useMemo(() => {
    if (!summary) return [];

    return [
      { title: `Today ${getBusinessLabel("booking")}s`, value: summary.todayBookings, moduleKey: "bookings", icon: CalendarCheck },
      { title: "Pending bookings", value: summary.pendingBookings, moduleKey: "bookings", icon: CalendarCheck },
      { title: "Completed bookings", value: summary.completedBookings, moduleKey: "bookings", icon: CalendarCheck },
      { title: "Today sales", value: currencyFormatter.format(summary.todaySales), moduleKey: "pos", icon: CircleDollarSign },
      { title: "Monthly sales", value: currencyFormatter.format(summary.monthlySales), moduleKey: "pos", icon: TrendingUp },
      { title: "Active members", value: summary.activeMembers, moduleKey: "memberships", icon: IdCard },
      { title: "Expiring memberships", value: summary.expiringMemberships, moduleKey: "memberships", icon: IdCard },
      { title: `New ${getBusinessLabel("customer")}s`, value: summary.newCustomers, moduleKey: "core", icon: Users },
      { title: `Returning ${getBusinessLabel("customer")}s`, value: summary.returningCustomers, moduleKey: "core", icon: Users },
      { title: "Loyalty points issued", value: summary.loyaltyPointsIssued, moduleKey: "loyalty", icon: Star },
      { title: "Low stock alerts", value: summary.lowStockAlerts, moduleKey: "inventory", icon: PackageSearch },
      { title: "Staff performance", value: summary.staffPerformance, moduleKey: "staff", icon: Users },
    ].filter((card) => card.moduleKey === "core" || isModuleEnabled(card.moduleKey as ModuleKey));
  }, [getBusinessLabel, isModuleEnabled, summary]);

  if (loading) return <LoadingState title="Loading dashboard" />;

  if (!auth.business?.id) {
    return (
      <EmptyState
        title="Business setup required"
        description="Complete the first-time setup wizard before dashboard metrics can load from Supabase."
      />
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{businessName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {businessTypeLabels[businessType]} dashboard filtered by enabled modules, role, and branch access.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{auth.profile?.role ?? "owner"}</Badge>
          {branchId ? <Badge variant="outline">Branch scoped</Badge> : <Badge variant="outline">All branches</Badge>}
          <Button variant="outline" onClick={loadSummary}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>{card.title}</CardDescription>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isOwner && summary ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DatabaseBackup className="h-5 w-5 text-primary" />
                Recent backup status
              </CardTitle>
              <CardDescription>Owner-only full business backup shortcut.</CardDescription>
            </div>
            <Button disabled={backupLoading} onClick={createBackup}>
              <DatabaseBackup className="h-4 w-4" />
              {backupLoading ? "Creating" : "Create Backup"}
            </Button>
          </CardHeader>
          <CardContent>
            {summary.recentBackup ? (
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <Info label="Last backup date" value={formatDate(summary.recentBackup.completed_at ?? summary.recentBackup.created_at)} />
                <Info label="Status" value={summary.recentBackup.status} />
                <Info label="Backup ID" value={summary.recentBackup.id.slice(0, 8)} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No backup exports have been created yet.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {summary ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {isModuleEnabled("bookings") ? <ChartCard title="Booking trend" points={summary.charts.bookingTrend} /> : null}
          {isModuleEnabled("pos") ? <ChartCard title="Sales chart" points={summary.charts.sales} currency /> : null}
          {isModuleEnabled("memberships") ? <ChartCard title="Membership growth" points={summary.charts.membershipGrowth} /> : null}
          {isModuleEnabled("inventory") ? <ChartCard title="Inventory alert chart" points={summary.charts.inventoryAlerts} /> : null}
          {isModuleEnabled("branches") ? <ChartCard title="Branch performance" points={summary.charts.branchPerformance} currency /> : null}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {summary && isModuleEnabled("payments") ? (
          <Card>
            <CardHeader>
              <CardTitle>Recent payments</CardTitle>
              <CardDescription>Latest payment records scoped by role and branch.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{currencyFormatter.format(payment.amount)}</TableCell>
                      <TableCell>{payment.status}</TableCell>
                      <TableCell>{formatDate(payment.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        {summary && isModuleEnabled("pos") ? (
          <Card>
            <CardHeader>
              <CardTitle>Recent POS orders</CardTitle>
              <CardDescription>Latest checkout activity.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recentPosOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.order_number}</TableCell>
                      <TableCell>{currencyFormatter.format(order.total_amount)}</TableCell>
                      <TableCell>{order.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function ChartCard({ title, points, currency = false }: { title: string; points: ChartPoint[]; currency?: boolean }) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Lightweight chart prepared for high-traffic dashboards.</CardDescription>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="flex h-44 items-end gap-2">
            {points.map((point) => (
              <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-primary"
                  style={{ height: `${Math.max(8, (point.value / max) * 140)}px` }}
                  title={`${point.label}: ${currency ? currencyFormatter.format(point.value) : point.value}`}
                />
                <span className="max-w-full truncate text-xs text-muted-foreground">{point.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}
