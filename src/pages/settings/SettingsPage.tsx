import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, CalendarClock, CreditCard, DatabaseBackup, IdCard, LockKeyhole, MessageSquareText, Package, Settings2, ShieldCheck, Store, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { businessTypeLabels } from "@/features/business/business-types";
import { loadSettingsArea, saveNotificationTemplate, savePaymentMethod, saveSettingsSection, updateBusinessProfile, updateBusinessType, updateRolePermission, type BusinessPresetRecord, type BusinessTypeOption, type NotificationTemplateRecord, type PaymentMethodRecord, type RolePermissionRecord } from "@/features/settings/settings-service";
import { listBranches, type BranchRecord } from "@/features/branches/branch-service";
import type { BusinessTypeKey } from "@/types/business";

export function SettingsPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeOption[]>([]);
  const [presets, setPresets] = useState<BusinessPresetRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRecord[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplateRecord[]>([]);
  const [permissions, setPermissions] = useState<RolePermissionRecord[]>([]);
  const [settings, setSettings] = useState({
    settings: {} as Record<string, unknown>,
    opening_hours: {} as Record<string, unknown>,
    booking_rules: {} as Record<string, unknown>,
    portal_settings: {} as Record<string, unknown>,
  });
  const [selectedBusinessTypeId, setSelectedBusinessTypeId] = useState("");
  const [typeStrategy, setTypeStrategy] = useState<"keep" | "apply_preset" | "manual">("keep");

  useEffect(() => {
    void loadSettings();
  }, [auth.business?.id]);

  async function loadSettings() {
    if (!auth.business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [settingsData, branchData] = await Promise.all([
        loadSettingsArea(auth.business.id),
        listBranches(auth.business.id),
      ]);
      setBusinessTypes(settingsData.businessTypes);
      setPresets(settingsData.presets);
      setPaymentMethods(settingsData.paymentMethods);
      setTemplates(settingsData.notificationTemplates);
      setPermissions(settingsData.rolePermissions);
      setSettings(settingsData.settings);
      setBranches(branchData);
      setSelectedBusinessTypeId(auth.business.business_type_id ?? settingsData.businessTypes[0]?.id ?? "");
    } catch (error) {
      toast({ title: "Settings failed to load", description: error instanceof Error ? error.message : "Check Supabase permissions." });
    } finally {
      setLoading(false);
    }
  }

  const selectedType = useMemo(() => businessTypes.find((type) => type.id === selectedBusinessTypeId), [businessTypes, selectedBusinessTypeId]);
  const selectedPreset = useMemo(() => presets.find((preset) => preset.business_type_id === selectedBusinessTypeId) ?? null, [presets, selectedBusinessTypeId]);
  const selectedTypeHasPreset = Boolean(selectedType?.supports_preset && selectedPreset);

  useEffect(() => {
    if (selectedType && !selectedTypeHasPreset && typeStrategy === "apply_preset") {
      setTypeStrategy("manual");
    }
  }, [selectedType?.id, selectedTypeHasPreset, typeStrategy]);

  async function submitBusinessProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.business?.id || !auth.user?.id) return;
    const formData = new FormData(event.currentTarget);

    try {
      await updateBusinessProfile({
        businessId: auth.business.id,
        userId: auth.user.id,
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        website: String(formData.get("website") ?? ""),
        address: String(formData.get("address") ?? ""),
      });
      await auth.refreshAuthState();
      toast({ title: "Business profile saved" });
    } catch (error) {
      toast({ title: "Business profile failed", description: error instanceof Error ? error.message : "Try again later." });
    }
  }

  async function submitBusinessType() {
    if (!auth.business?.id || !auth.user?.id || !selectedType) return;
    const strategy = selectedTypeHasPreset ? typeStrategy : "manual";

    try {
      await updateBusinessType({
        businessId: auth.business.id,
        userId: auth.user.id,
        businessTypeId: selectedType.id,
        businessTypeKey: selectedType.type_key,
        strategy,
        preset: strategy === "apply_preset" ? selectedPreset : null,
      });
      await auth.refreshAuthState();
      await loadSettings();
      toast({
        title: "Business type updated",
        description: selectedTypeHasPreset ? "Your selected module strategy was saved." : "This type has no preset, so manual module customization is used.",
      });
    } catch (error) {
      toast({ title: "Business type update failed", description: error instanceof Error ? error.message : "Try again later." });
    }
  }

  async function submitSettings(event: React.FormEvent<HTMLFormElement>, section: "opening_hours" | "booking_rules" | "settings" | "portal_settings", action: string) {
    event.preventDefault();
    if (!auth.business?.id || !auth.user?.id) return;
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries());

    try {
      await saveSettingsSection({ businessId: auth.business.id, userId: auth.user.id, section, values, action });
      await loadSettings();
      toast({ title: "Settings saved" });
    } catch (error) {
      toast({ title: "Settings failed", description: error instanceof Error ? error.message : "Try again later." });
    }
  }

  async function submitPaymentMethod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.business?.id || !auth.user?.id) return;
    const formData = new FormData(event.currentTarget);

    try {
      await savePaymentMethod({
        businessId: auth.business.id,
        branchId: String(formData.get("branch_id") ?? "") || null,
        userId: auth.user.id,
        name: String(formData.get("name") ?? ""),
        methodType: String(formData.get("method_type") ?? "cash"),
        instructions: String(formData.get("instructions") ?? ""),
        isActive: formData.get("is_active") === "on",
      });
      event.currentTarget.reset();
      await loadSettings();
      toast({ title: "Payment method saved" });
    } catch (error) {
      toast({ title: "Payment method failed", description: error instanceof Error ? error.message : "Try again later." });
    }
  }

  async function submitTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.business?.id || !auth.user?.id) return;
    const formData = new FormData(event.currentTarget);

    try {
      await saveNotificationTemplate({
        businessId: auth.business.id,
        branchId: String(formData.get("branch_id") ?? "") || null,
        userId: auth.user.id,
        templateKey: String(formData.get("template_key") ?? ""),
        channel: String(formData.get("channel") ?? "in_app"),
        subject: String(formData.get("subject") ?? ""),
        body: String(formData.get("body") ?? ""),
        isActive: formData.get("is_active") === "on",
      });
      event.currentTarget.reset();
      await loadSettings();
      toast({ title: "Notification template saved" });
    } catch (error) {
      toast({ title: "Template failed", description: error instanceof Error ? error.message : "Try again later." });
    }
  }

  async function togglePermission(permission: RolePermissionRecord, key: "can_view" | "can_create" | "can_update" | "can_delete" | "can_export", value: boolean) {
    if (!auth.business?.id || !auth.user?.id) return;
    const next = { ...permission, [key]: value };
    await updateRolePermission({
      businessId: auth.business.id,
      userId: auth.user.id,
      permissionId: permission.id,
      canView: next.can_view,
      canCreate: next.can_create,
      canUpdate: next.can_update,
      canDelete: next.can_delete,
      canExport: next.can_export,
    });
    await loadSettings();
  }

  if (loading) return <LoadingState title="Loading settings" />;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Business profile, modules, branches, rules, payments, templates, portal, backup, account, and security.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SettingsLink icon={Settings2} title="Module settings" description="Enable, disable, and hide modules." to="/settings/modules" />
        <SettingsLink icon={Package} title="Branch settings" description="Branches, transfers, and branch permissions." to="/dashboard/branches" />
        <SettingsLink icon={DatabaseBackup} title="Data Backup" description="Full backup, module export, and history." to="/settings/data-backup" />
        <SettingsLink icon={ShieldCheck} title="Account & security" description="Profile, role, and session settings." to="/settings/profile" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Business profile</CardTitle>
          <CardDescription>Private-use business identity and public contact details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitBusinessProfile}>
            <Field label="Business name" name="name" defaultValue={auth.business?.name ?? ""} />
            <Field label="Email" name="email" type="email" defaultValue={auth.business?.email ?? ""} />
            <Field label="Phone" name="phone" defaultValue={auth.business?.phone ?? ""} />
            <Field label="Website" name="website" defaultValue={auth.business?.website ?? ""} />
            <div className="grid gap-2 md:col-span-2">
              <Label>Address</Label>
              <Input name="address" defaultValue={auth.business?.address ?? ""} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Save business profile</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business type</CardTitle>
          <CardDescription>Changing type updates wording and optional preset defaults. Salon, Spa, and Event Space use manual module customization.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Business type</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={selectedBusinessTypeId} onChange={(event) => setSelectedBusinessTypeId(event.target.value)}>
              {businessTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
          </div>
          <div className="grid gap-3 rounded-lg border p-4">
            <label className="flex items-start gap-3 text-sm">
              <input checked={typeStrategy === "keep"} className="mt-1 h-4 w-4 accent-primary" name="type_strategy" onChange={() => setTypeStrategy("keep")} type="radio" />
              <span><span className="font-medium">Keep current module settings</span><span className="block text-muted-foreground">Only business type wording changes.</span></span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input checked={typeStrategy === "apply_preset"} className="mt-1 h-4 w-4 accent-primary" disabled={!selectedTypeHasPreset} name="type_strategy" onChange={() => setTypeStrategy("apply_preset")} type="radio" />
              <span><span className="font-medium">Apply preset defaults if available</span><span className="block text-muted-foreground">{selectedTypeHasPreset ? `${selectedPreset?.name} will enable recommended modules.` : "No preset exists for this business type."}</span></span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input checked={typeStrategy === "manual" || !selectedTypeHasPreset} className="mt-1 h-4 w-4 accent-primary" name="type_strategy" onChange={() => setTypeStrategy("manual")} type="radio" />
              <span><span className="font-medium">Manually customize modules</span><span className="block text-muted-foreground">Go to Module Settings after saving. Required for Salon, Spa, and Event Space.</span></span>
            </label>
          </div>
          {selectedType ? <Badge variant="secondary">{businessTypeLabels[selectedType.type_key as BusinessTypeKey] ?? selectedType.name}</Badge> : null}
          <div>
            <Button onClick={submitBusinessType} type="button">Save business type</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsForm icon={CalendarClock} title="Opening hours" description="Used by booking, public pages, and portal availability." onSubmit={(event) => submitSettings(event, "opening_hours", "opening_hours_updated")}>
          <Field label="Timezone" name="timezone" defaultValue={String(settings.opening_hours.timezone ?? "Asia/Singapore")} />
          <Field label="Weekly hours" name="weekly_hours" defaultValue={String(settings.opening_hours.weekly_hours ?? "Mon-Fri 09:00-18:00")} />
        </SettingsForm>

        <SettingsForm icon={CalendarClock} title="Booking rules" description="Controls approval, cancellation, reschedule, deposits, and public booking behavior." onSubmit={(event) => submitSettings(event, "booking_rules", "booking_rules_updated")}>
          <Field label="Advance booking days" name="advance_booking_days" type="number" defaultValue={String(settings.booking_rules.advance_booking_days ?? 30)} />
          <Field label="Cancellation hours" name="cancellation_hours" type="number" defaultValue={String(settings.booking_rules.cancellation_hours ?? 24)} />
        </SettingsForm>

        <SettingsForm icon={IdCard} title="Membership settings" description="Membership renewal, freeze, QR card, and manual purchase defaults." onSubmit={(event) => submitSettings(event, "settings", "membership_settings_updated")}>
          <Field label="Expiry reminder days" name="membership_expiry_reminder_days" type="number" defaultValue={String(settings.settings.membership_expiry_reminder_days ?? 7)} />
          <Field label="Allow manual purchase" name="membership_manual_purchase" defaultValue={String(settings.settings.membership_manual_purchase ?? "true")} />
        </SettingsForm>

        <SettingsForm icon={Store} title="POS & inventory settings" description="POS closing, stock deduction, low stock, and costing defaults." onSubmit={(event) => submitSettings(event, "settings", "pos_inventory_settings_updated")}>
          <Field label="Low stock threshold" name="low_stock_threshold" type="number" defaultValue={String(settings.settings.low_stock_threshold ?? 5)} />
          <Field label="Auto deduct inventory" name="auto_deduct_inventory" defaultValue={String(settings.settings.auto_deduct_inventory ?? "true")} />
        </SettingsForm>

        <SettingsForm icon={Users} title="Customer portal settings" description="Mobile portal, customer receipts, booking controls, and profile access." onSubmit={(event) => submitSettings(event, "portal_settings", "customer_portal_settings_updated")}>
          <Field label="Allow receipt download" name="allow_receipt_download" defaultValue={String(settings.portal_settings.allow_receipt_download ?? "false")} />
          <Field label="Allow customer reschedule" name="allow_customer_reschedule" defaultValue={String(settings.portal_settings.allow_customer_reschedule ?? "true")} />
        </SettingsForm>

        <SettingsForm icon={LockKeyhole} title="Security settings" description="Session expectations and sensitive export confirmation." onSubmit={(event) => submitSettings(event, "settings", "security_settings_updated")}>
          <Field label="Require backup warning" name="require_backup_warning" defaultValue={String(settings.settings.require_backup_warning ?? "true")} />
          <Field label="Require owner for full backup" name="require_owner_full_backup" defaultValue="true" />
        </SettingsForm>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Payment methods</CardTitle>
            <CardDescription>Cash, QR, card, bank transfer, and manual payment instructions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form className="grid gap-3" onSubmit={submitPaymentMethod}>
              <Field label="Name" name="name" defaultValue="" />
              <Field label="Type" name="method_type" defaultValue="cash" />
              <BranchSelect branches={branches} />
              <Field label="Instructions" name="instructions" defaultValue="" />
              <label className="flex items-center gap-2 text-sm"><input className="h-4 w-4 accent-primary" defaultChecked name="is_active" type="checkbox" />Active</label>
              <Button type="submit">Add payment method</Button>
            </form>
            <SimpleTable empty="No payment methods yet" rows={paymentMethods.map((item) => [item.name, item.method_type, item.is_active ? "Active" : "Inactive"])} headers={["Name", "Type", "Status"]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-primary" />Notification templates</CardTitle>
            <CardDescription>In-app, email, WhatsApp, and Telegram template preparation.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form className="grid gap-3" onSubmit={submitTemplate}>
              <Field label="Template key" name="template_key" defaultValue="booking_reminder" />
              <Field label="Channel" name="channel" defaultValue="in_app" />
              <Field label="Subject" name="subject" defaultValue="" />
              <div className="grid gap-2">
                <Label>Body</Label>
                <textarea className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm" name="body" required />
              </div>
              <BranchSelect branches={branches} />
              <label className="flex items-center gap-2 text-sm"><input className="h-4 w-4 accent-primary" defaultChecked name="is_active" type="checkbox" />Active</label>
              <Button type="submit">Save template</Button>
            </form>
            <SimpleTable empty="No templates yet" rows={templates.map((item) => [item.template_key, item.channel, item.is_active ? "Active" : "Inactive"])} headers={["Template", "Channel", "Status"]} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff permissions</CardTitle>
          <CardDescription>Manager and staff role permissions. Report export requires explicit permission unless user is Owner.</CardDescription>
        </CardHeader>
        <CardContent>
          {permissions.length === 0 ? (
            <EmptyState title="No permissions configured" description="Role permission seed data will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>View</TableHead>
                  <TableHead>Create</TableHead>
                  <TableHead>Update</TableHead>
                  <TableHead>Delete</TableHead>
                  <TableHead>Export</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.filter((permission) => permission.role !== "owner").map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell>{permission.role}</TableCell>
                    <TableCell>{permission.module_key}</TableCell>
                    {(["can_view", "can_create", "can_update", "can_delete", "can_export"] as const).map((key) => (
                      <TableCell key={key}>
                        <input checked={permission[key]} className="h-4 w-4 accent-primary" onChange={(event) => void togglePermission(permission, key, event.target.checked)} type="checkbox" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsLink({ icon: Icon, title, description, to }: { icon: typeof Settings2; title: string; description: string; to: string }) {
  return (
    <Link className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50" to={to}>
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

function SettingsForm({ icon: Icon, title, description, children, onSubmit }: { icon: typeof Settings2; title: string; description: string; children: React.ReactNode; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          {children}
          <Button type="submit">Save</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, name, type = "text", defaultValue }: { label: string; name: string; type?: string; defaultValue: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input name={name} required={name === "name"} type={type} defaultValue={defaultValue} />
    </div>
  );
}

function BranchSelect({ branches }: { branches: BranchRecord[] }) {
  return (
    <div className="grid gap-2">
      <Label>Branch</Label>
      <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" name="branch_id">
        <option value="">All branches</option>
        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select>
    </div>
  );
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  if (rows.length === 0) return <EmptyState title={empty} description="Saved records will appear here." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={index}>
            {row.map((cell, cellIndex) => <TableCell key={`${index}-${cellIndex}`}>{cell}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
