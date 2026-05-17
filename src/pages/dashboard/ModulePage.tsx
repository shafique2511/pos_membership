import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/StateViews";
import { useBusiness } from "@/features/business/business-context";
import type { ModuleKey } from "@/types/business";

type ModulePageProps = {
  moduleKey: ModuleKey | "dashboard" | "customers";
  title: string;
};

const moduleCopy: Partial<Record<ModuleKey | "dashboard" | "customers", string>> = {
  dashboard: "A role-aware overview for bookings, sales, customers, memberships, stock alerts, and reports.",
  customers: "Customer/member profiles, notes, visit history, privacy controls, and customer-owned portal data.",
  bookings: "Appointments, table bookings, room/resource bookings, staff calendars, and booking status flows.",
  memberships: "Membership plans, renewals, usage, prepaid credit, visit packages, and QR member cards.",
  loyalty: "Points, rewards, redemptions, referrals, and birthday campaigns.",
  pos: "Checkout for products, services, memberships, discounts, split payments, and receipts.",
  inventory: "Products, stock movement, suppliers, branch stock, low stock alerts, and POS deduction.",
  staff: "Staff profiles, working hours, branch assignment, and staff dashboards.",
  staff_commission: "Service, product, and membership commissions with approval and payout states.",
  payments: "Cash, QR, card, transfer records, invoices, receipts, deposits, and refunds.",
  reports: "Filtered operational reports with charts, tables, and export-ready structure.",
  marketing: "Promos, customer segments, referral campaigns, and broadcast preparation.",
  notifications: "In-app, email, WhatsApp, and Telegram template preparation.",
  branches: "Branch records, branch permissions, stock transfer, and branch-level reports.",
};

export function ModulePage({ moduleKey, title }: ModulePageProps) {
  const { getBusinessLabel, isModuleEnabled } = useBusiness();

  if (moduleKey !== "dashboard" && moduleKey !== "customers" && !isModuleEnabled(moduleKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  const records = [
    { name: getBusinessLabel("customer"), status: "Ready for Supabase data" },
    { name: getBusinessLabel("booking"), status: "Pagination-ready layout" },
    { name: getBusinessLabel("service"), status: "Business-type labels active" },
  ];
  const dashboardWidgets = [
    { label: "Today bookings", value: "12", moduleKey: "bookings" as ModuleKey },
    { label: "Today sales", value: "RM 840", moduleKey: "pos" as ModuleKey },
    { label: "Active members", value: "128", moduleKey: "memberships" as ModuleKey },
    { label: "Loyalty issued", value: "4,210", moduleKey: "loyalty" as ModuleKey },
    { label: "Low stock", value: "7", moduleKey: "inventory" as ModuleKey },
    { label: "Reports ready", value: "6", moduleKey: "reports" as ModuleKey },
  ].filter((widget) => isModuleEnabled(widget.moduleKey));

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{moduleCopy[moduleKey]}</p>
        </div>
        <Badge variant="success">Enabled</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(moduleKey === "dashboard" ? dashboardWidgets : [
          { label: "Today", value: "12" },
          { label: "Pending", value: "4" },
          { label: "Completed", value: "28" },
        ]).map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle>{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Recent records</CardTitle>
            <CardDescription>Table component prepared for server-side pagination and filtering.</CardDescription>
          </div>
          <Button variant="outline">Add record</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.name}>
                  <TableCell className="font-medium">{record.name}</TableCell>
                  <TableCell>{record.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EmptyState title="No live data yet" description="Phase 1 creates the interface foundation. Supabase-backed data operations will be added in later phases." />
    </div>
  );
}
