import { Download, FileArchive, FileSpreadsheet, ShieldCheck, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

const exportModules = [
  "Customers",
  "Bookings",
  "Memberships",
  "Loyalty",
  "POS orders",
  "Inventory",
  "Staff",
  "Payments",
  "Reports",
];

const backupHistory = [
  { name: "Full business export", scope: "All branches", format: "JSON + CSV", status: "Prepared structure" },
  { name: "Reports export", scope: "Main branch", format: "CSV / Excel / PDF", status: "Permission-gated" },
];

export function DataBackupPage() {
  const { toast } = useToast();

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Data Backup</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Owner-only business export foundation with module, date range, branch, CSV, and JSON structure.
          </p>
        </div>
        <Badge variant="success">Owner only</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Data ownership
          </CardTitle>
          <CardDescription>
            Owner owns the business data. Full backup must respect business_id and branch_id isolation and must be audit logged.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create export</CardTitle>
            <CardDescription>Prepared for Supabase-backed export jobs in the database phase.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="export-format">Format</Label>
                <select id="export-format" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option>CSV</option>
                  <option>JSON</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branch">Branch</Label>
                <select id="branch" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option>All branches</option>
                  <option>Main branch</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="start-date">Start date</Label>
                <Input id="start-date" type="date" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-date">End date</Label>
                <Input id="end-date" type="date" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {exportModules.map((module) => (
                <label key={module} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  <input className="h-4 w-4 accent-primary" type="checkbox" defaultChecked />
                  {module}
                </label>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() =>
                  toast({
                    title: "Export job structure ready",
                    description: "Supabase export_jobs, audit_logs, and storage output will be wired in the database phase.",
                  })
                }
              >
                <Download className="h-4 w-4" />
                Export selected data
              </Button>
              <Button variant="outline">
                <FileArchive className="h-4 w-4" />
                Full business backup
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Report exports
              </CardTitle>
              <CardDescription>Reports will support PDF, Excel, and CSV exports. Managers need explicit permission.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Restore preparation
              </CardTitle>
              <CardDescription>Import/restore structure is prepared, but restore must never run without owner confirmation.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backup history</CardTitle>
          <CardDescription>Later phases will read from export_jobs and audit_logs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backupHistory.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.scope}</TableCell>
                  <TableCell>{item.format}</TableCell>
                  <TableCell>{item.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
