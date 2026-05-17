import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, FileArchive, FileSpreadsheet, Filter, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown } from "@/components/ui/dropdown";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/shared/StateViews";
import { BackupExportCard, MetricCard } from "@/components/shared/DesignSystem";
import { Tabs } from "@/components/ui/tabs";
import { BackupHistoryTable } from "@/components/backup/BackupHistoryTable";
import { BackupProgressModal } from "@/components/backup/BackupProgressModal";
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
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [progressBackup, setProgressBackup] = useState<BackupExportRecord | null>(null);
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
      setProgressBackup((await listBackupExports(auth.business.id)).find((item) => item.id === id) ?? null);
      setActiveTab("history");
      toast({ title: "Backup/export requested", description: `Export job ${id.slice(0, 8)} was created and audit logged.` });
    } catch (error) {
      toast({ title: "Backup/export failed", description: error instanceof Error ? error.message : "Try again later." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState title="Loading backup settings" />;

  const latestBackup = history[0] ?? null;
  const completedBackups = history.filter((item) => item.status === "completed").length;

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

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={FileArchive} title="Last backup date" value={latestBackup ? new Date(latestBackup.created_at).toLocaleDateString() : "Never"} description={latestBackup?.status ?? "No export jobs yet"} />
        <MetricCard icon={Download} title="Ready downloads" value={history.filter((item) => item.file_url).length} description={`${completedBackups} completed jobs`} />
        <MetricCard icon={ShieldCheck} title="Owner access" value="Protected" description="Full backup page is owner-only" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backup workspace</CardTitle>
          <CardDescription>Clean owner-only backup flow with filters, warning, progress, status, and download states.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Tabs
            items={[
              { value: "create", label: "Create export", icon: <Filter className="h-4 w-4" /> },
              { value: "history", label: "Backup history", icon: <FileArchive className="h-4 w-4" /> },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === "create" ? (
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Export scope</Label>
                    <Dropdown options={backupScopes.map((item) => ({ value: item.key, label: item.label }))} value={scope} onChange={(event) => setScope(event.target.value as BackupScope)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Format</Label>
                    <Dropdown options={[{ value: "csv", label: "CSV" }, { value: "json", label: "JSON" }]} value={format} onChange={(event) => setFormat(event.target.value as BackupFormat)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Branch</Label>
                    <Dropdown options={[{ value: "", label: "All branches" }, ...branches.map((branch) => ({ value: branch.id, label: branch.name }))]} value={branchId} onChange={(event) => setBranchId(event.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Report format</Label>
                    <Dropdown options={[{ value: "pdf", label: "PDF" }, { value: "excel", label: "Excel" }, { value: "csv", label: "CSV" }]} value={reportFormat} onChange={(event) => setReportFormat(event.target.value as BackupFormat)} />
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

                <div className="rounded-lg border bg-secondary/30 p-4">
                  <p className="font-medium">{selectedScope?.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Includes: {selectedScope?.tables.join(", ")}</p>
                </div>
              </div>

              <div className="grid gap-3">
                <BackupExportCard title="Backup All Data" description="Create a full business ZIP export across all owner-owned data." actionLabel="Backup" onAction={() => requestExport({ scope: "full_business", format: "zip", branchId: null, dateFrom, dateTo })} />
                <BackupExportCard title="Export by Module" description="Export only the selected module scope in CSV or JSON." actionLabel="Export" onAction={() => requestExport({ scope, format, branchId, dateFrom, dateTo })} />
                <BackupExportCard title="Export by Date Range" description="Apply the selected start and end date filters." actionLabel="Export" onAction={() => requestExport({ scope, format, branchId, dateFrom, dateTo })} />
                <BackupExportCard title="Export by Branch" description="Export selected branch data with branch_id isolation." actionLabel="Export" onAction={() => requestExport({ scope: "branch_data", format, branchId, dateFrom, dateTo })} />
                <Button variant="secondary" onClick={() => requestExport({ scope: "reports", format: reportFormat, branchId, dateFrom, dateTo })}>
                  <FileSpreadsheet className="h-4 w-4" />Optional report export
                </Button>
              </div>
            </div>
          ) : (
            <BackupHistoryTable history={history} onViewProgress={setProgressBackup} />
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

      <BackupProgressModal backup={progressBackup} open={Boolean(progressBackup)} onClose={() => setProgressBackup(null)} />
    </div>
  );
}
