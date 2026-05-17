import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, FileArchive, FileJson, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { listBranches, type BranchRecord } from "@/features/branches/branch-service";
import { backupScopes, createBackupExport, listBackupExports, type BackupExportRecord, type BackupFormat, type BackupScope } from "@/features/backup/backup-service";

type PendingExport = {
  scope: BackupScope;
  format: BackupFormat;
  branchId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export function DataBackupPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [history, setHistory] = useState<BackupExportRecord[]>([]);
  const [scope, setScope] = useState<BackupScope>("full_business");
  const [format, setFormat] = useState<BackupFormat>("json");
  const [reportFormat, setReportFormat] = useState<BackupFormat>("csv");
  const [branchId, setBranchId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadBackupData();
  }, [auth.business?.id]);

  async function loadBackupData() {
    if (!auth.business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [nextBranches, nextHistory] = await Promise.all([
        listBranches(auth.business.id),
        listBackupExports(auth.business.id),
      ]);
      setBranches(nextBranches);
      setHistory(nextHistory);
    } catch (error) {
      toast({ title: "Backup data failed to load", description: error instanceof Error ? error.message : "Check Supabase permissions." });
    } finally {
      setLoading(false);
    }
  }

  const selectedScope = useMemo(() => backupScopes.find((item) => item.key === scope), [scope]);

  function requestExport(next: PendingExport) {
    setPendingExport(next);
  }

  async function confirmExport() {
    if (!auth.business?.id || !auth.user?.id || !pendingExport) return;

    try {
      setSaving(true);
      const id = await createBackupExport({
        businessId: auth.business.id,
        userId: auth.user.id,
        scope: pendingExport.scope,
        format: pendingExport.format,
        branchId: pendingExport.branchId || null,
        dateFrom: pendingExport.dateFrom || null,
        dateTo: pendingExport.dateTo || null,
      });
      setPendingExport(null);
      await loadBackupData();
      toast({ title: "Backup/export requested", description: `Export job ${id.slice(0, 8)} was created and audit logged.` });
    } catch (error) {
      toast({ title: "Backup/export failed", description: error instanceof Error ? error.message : "Try again later." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState title="Loading backup settings" />;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Data Backup</h1>
          <p className="mt-1 text-sm text-muted-foreground">Owner-only full backup, module export, date range export, branch export, report export, and backup history.</p>
        </div>
        <Badge variant="success">Owner only</Badge>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Data ownership</CardTitle>
          <CardDescription>
            You own the business data. Export jobs are scoped by business_id and optional branch_id, and every backup/export request is recorded in audit_logs.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create backup/export</CardTitle>
            <CardDescription>Select a scope, format, branch, and date range. Sensitive exports require confirmation.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Export scope</Label>
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={scope} onChange={(event) => setScope(event.target.value as BackupScope)}>
                  {backupScopes.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Format</Label>
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={format} onChange={(event) => setFormat(event.target.value as BackupFormat)}>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Branch</Label>
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
                  <option value="">All branches</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Report format</Label>
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={reportFormat} onChange={(event) => setReportFormat(event.target.value as BackupFormat)}>
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Start date</Label>
                <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>End date</Label>
                <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="font-medium">{selectedScope?.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">Includes: {selectedScope?.tables.join(", ")}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Button onClick={() => requestExport({ scope: "full_business", format: "zip", branchId: null, dateFrom, dateTo })}>
                <FileArchive className="h-4 w-4" />Backup All Data
              </Button>
              <Button variant="outline" onClick={() => requestExport({ scope, format, branchId, dateFrom, dateTo })}>
                <FileJson className="h-4 w-4" />Export by Module
              </Button>
              <Button variant="outline" onClick={() => requestExport({ scope, format, branchId, dateFrom, dateTo })}>
                <Download className="h-4 w-4" />Export by Date Range
              </Button>
              <Button variant="outline" onClick={() => requestExport({ scope: "branch_data", format, branchId, dateFrom, dateTo })}>
                <Download className="h-4 w-4" />Export by Branch
              </Button>
            </div>
            <Button variant="secondary" onClick={() => requestExport({ scope: "reports", format: reportFormat, branchId, dateFrom, dateTo })}>
              <FileSpreadsheet className="h-4 w-4" />Optional report export
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup status</CardTitle>
              <CardDescription>Latest export job state.</CardDescription>
            </CardHeader>
            <CardContent>
              {history[0] ? (
                <div className="grid gap-2">
                  <Badge variant="secondary">{history[0].status}</Badge>
                  <p className="text-sm text-muted-foreground">{history[0].export_type} · {history[0].export_format}</p>
                  <p className="text-sm text-muted-foreground">{new Date(history[0].created_at).toLocaleString()}</p>
                </div>
              ) : (
                <EmptyState title="No backup yet" description="Backup history will appear after your first request." />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Download Backup</CardTitle>
              <CardDescription>Completed jobs with a file URL can be downloaded here.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {history.filter((item) => item.file_url).length === 0 ? (
                <p className="text-sm text-muted-foreground">No downloadable backup files yet.</p>
              ) : history.filter((item) => item.file_url).slice(0, 3).map((item) => (
                <a key={item.id} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-secondary" href={item.file_url ?? "#"} rel="noreferrer" target="_blank">
                  <Download className="h-4 w-4" />{item.export_type}
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backup history</CardTitle>
          <CardDescription>Stored in backup_exports and protected by Owner-only backup access.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState title="No backup history" description="Created exports will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                    <TableCell>{item.export_type}</TableCell>
                    <TableCell>{item.export_format}</TableCell>
                    <TableCell><Badge variant="secondary">{item.status}</Badge></TableCell>
                    <TableCell>
                      {item.file_url ? (
                        <a className="text-sm text-primary hover:underline" href={item.file_url} rel="noreferrer" target="_blank">Download</a>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not ready</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        description="This export may include sensitive customer, booking, payment, membership, staff, and settings data."
        onClose={() => setPendingExport(null)}
        open={Boolean(pendingExport)}
        title="Export sensitive data?"
      >
        <div className="grid gap-4">
          <div className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Confirm that this backup is for the Owner only.</p>
              <p className="mt-1 text-muted-foreground">The request will be business_id isolated and audit logged. Do not share exported files with unauthorized people.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingExport(null)}>Cancel</Button>
            <Button disabled={saving} onClick={confirmExport}>{saving ? "Creating" : "Confirm export"}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
