import { AlertTriangle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ProgressBar, StatusLine } from "@/components/shared/DesignSystem";
import type { BackupExportRecord } from "@/features/backup/backup-service";

export function BackupProgressModal({
  open,
  backup,
  onClose,
}: {
  open: boolean;
  backup: BackupExportRecord | null;
  onClose: () => void;
}) {
  const progress = getProgress(backup?.status);
  const completed = backup?.status === "completed";
  const failed = backup?.status === "failed";

  return (
    <Dialog
      description="Backup progress is tracked from the export job status. Completed jobs show a download action when a file is available."
      onClose={onClose}
      open={open}
      title="Backup progress"
    >
      <div className="grid gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{backup?.export_type ?? "Backup request"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{backup?.export_format?.toUpperCase() ?? "Export"} · {backup ? new Date(backup.created_at).toLocaleString() : "Pending"}</p>
          </div>
          <Badge variant={completed ? "success" : failed ? "danger" : "warning"}>{backup?.status ?? "pending"}</Badge>
        </div>

        <ProgressBar value={progress} />

        <div className="grid gap-2 rounded-lg border p-3">
          <StatusLine complete={Boolean(backup)} label="Export job created" />
          <StatusLine complete={Boolean(backup && backup.status !== "pending")} label="Processing started" />
          <StatusLine complete={completed} label="Backup file ready" />
        </div>

        {failed ? (
          <div className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <p className="text-muted-foreground">{backup?.error_message ?? "Backup failed. Check the export job logs."}</p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {completed && backup?.file_url ? (
            <a className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90" href={backup.file_url} rel="noreferrer" target="_blank">
              <Download className="h-4 w-4" />Download
            </a>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}

function getProgress(status?: string) {
  if (status === "completed") return 100;
  if (status === "processing") return 64;
  if (status === "failed") return 100;
  if (status === "expired") return 100;
  return 25;
}
