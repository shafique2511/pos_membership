import type { ComponentType, ReactNode } from "react";
import { CalendarDays, CheckCircle2, Clock, CreditCard, Package, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
        <CardDescription>{title}</CardDescription>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </CardContent>
    </Card>
  );
}

export function ModuleToggleCard({
  title,
  description,
  enabled,
  disabled,
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <Card className={cn(enabled && "border-primary/25")}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Badge variant={enabled ? "success" : "secondary"}>{enabled ? "Enabled" : "Hidden"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {children}
        {disabled ? <p className="text-sm text-muted-foreground">This module cannot be changed from this control.</p> : null}
      </CardContent>
    </Card>
  );
}

export function CustomerCard({ name, subtitle, status = "Active" }: { name: string; subtitle?: string; status?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        <Badge variant="secondary">{status}</Badge>
      </CardContent>
    </Card>
  );
}

export function BookingCard({ title, date, status, description }: { title: string; date: string; status: string; description?: string }) {
  return (
    <Card>
      <CardContent className="grid gap-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{title}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" />{date}</p>
          </div>
          <Badge variant="secondary">{status}</Badge>
        </div>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </CardContent>
    </Card>
  );
}

export function PosCartPanel({ children, total }: { children: ReactNode; total: string }) {
  return (
    <Card className="h-fit xl:sticky xl:top-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />POS cart</CardTitle>
        <CardDescription>Stable checkout panel for split payment and receipt generation.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {children}
        <div className="flex items-center justify-between rounded-lg border bg-secondary/40 p-3 font-semibold">
          <span>Total</span>
          <span>{total}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function CalendarPreview({ days }: { days: Array<{ label: string; count: number }> }) {
  return (
    <div className="grid grid-cols-7 gap-2 rounded-lg border bg-card p-3">
      {days.map((day) => (
        <div key={day.label} className="aspect-square rounded-md border bg-background p-2 text-xs">
          <div className="flex items-center justify-between gap-1">
            <span className="font-medium">{day.label}</span>
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          {day.count > 0 ? <Badge className="mt-2" variant="secondary">{day.count}</Badge> : null}
        </div>
      ))}
    </div>
  );
}

export function BackupExportCard({
  title,
  description,
  status,
  onAction,
  actionLabel,
}: {
  title: string;
  description: string;
  status?: string;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {status ? <Badge className="mt-3" variant={status === "completed" ? "success" : status === "failed" ? "danger" : "warning"}>{status}</Badge> : null}
        </div>
        <Button size="sm" onClick={onAction}>{actionLabel}</Button>
      </CardContent>
    </Card>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-secondary">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function StatusLine({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <CheckCircle2 className={cn("h-4 w-4", complete ? "text-emerald-600" : "text-muted-foreground")} />
      <span className={complete ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

export function InventoryPill({ label, count }: { label: string; count: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm">
      <Package className="h-4 w-4 text-muted-foreground" />
      <span>{label}</span>
      <Badge variant="secondary">{count}</Badge>
    </div>
  );
}
