import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/StateViews";
import type { BackupExportRecord } from "@/features/backup/backup-service";

export function BackupHistoryTable({
  history,
  onViewProgress,
}: {
  history: BackupExportRecord[];
  onViewProgress: (backup: BackupExportRecord) => void;
}) {
  if (history.length === 0) {
    return <EmptyState title="No backup history" description="Created exports will appear here." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Created</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead>Format</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
            <TableCell>{item.export_type}</TableCell>
            <TableCell>{item.export_format}</TableCell>
            <TableCell><Badge variant={statusVariant(item.status)}>{item.status}</Badge></TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-2">
                <Button size="xs" variant="outline" onClick={() => onViewProgress(item)}>Progress</Button>
                {item.file_url ? (
                  <a className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input bg-background px-2.5 text-xs font-medium hover:bg-secondary" href={item.file_url} rel="noreferrer" target="_blank">
                    <Download className="h-3.5 w-3.5" />Download
                  </a>
                ) : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function statusVariant(status: string) {
  if (status === "completed") return "success";
  if (status === "failed" || status === "expired") return "danger";
  return "warning";
}
