import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, DatabaseBackup, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { defaultModules } from "@/features/business/modules";
import { businessTypeLabels } from "@/features/business/business-types";
import { completeBusinessSetup, slugifyBusinessName, type SetupItem, type SetupPaymentMethod } from "@/features/setup/setup-service";
import { hasSetupPreset, setupPresets } from "@/features/setup/presets";
import { getAuthErrorMessage, useAuth } from "@/features/auth/auth-context";
import type { BusinessTypeKey, ModuleKey } from "@/types/business";
import { cn } from "@/lib/utils/cn";

const businessTypes = Object.keys(businessTypeLabels) as BusinessTypeKey[];
const manualBusinessTypes: BusinessTypeKey[] = ["salon", "spa", "event_space"];

const steps = [
  "Business",
  "Business type",
  "Modules",
  "Branch",
  "Items",
  "Operations",
  "Data ownership",
  "Confirm",
];

const coreModules: ModuleKey[] = ["core", "settings", "data_backup"];

export function SetupWizardPage() {
  const { user, refreshAuthState } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("Luxantara");
  const [businessSlug, setBusinessSlug] = useState("luxantara");
  const [businessEmail, setBusinessEmail] = useState(user?.email ?? "");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessType, setBusinessType] = useState<BusinessTypeKey>("coffee_shop");
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>(["core", "settings", "data_backup"]);
  const [branchName, setBranchName] = useState("Main Branch");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [setupItems, setSetupItems] = useState<SetupItem[]>([
    { name: "Signature Service", itemType: "service", price: 0 },
  ]);
  const [openingStart, setOpeningStart] = useState("09:00");
  const [openingEnd, setOpeningEnd] = useState("18:00");
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [depositRequired, setDepositRequired] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<SetupPaymentMethod[]>([
    { name: "Cash", methodType: "cash" },
    { name: "QR Payment", methodType: "qr" },
  ]);
  const [ownershipAccepted, setOwnershipAccepted] = useState(false);

  const preset = setupPresets[businessType];
  const businessTypeHasPreset = hasSetupPreset(businessType);
  const isManualBusinessType = manualBusinessTypes.includes(businessType);

  useEffect(() => {
    if (!businessName) return;
    setBusinessSlug(slugifyBusinessName(businessName));
  }, [businessName]);

  useEffect(() => {
    const nextModules = new Set<ModuleKey>(coreModules);

    if (preset) {
      preset.recommended.forEach((moduleKey) => nextModules.add(moduleKey));
    }

    setSelectedModules(Array.from(nextModules));
  }, [preset]);

  const canGoNext = useMemo(() => {
    if (step === 0) return businessName.trim().length > 1 && businessSlug.trim().length > 1;
    if (step === 2) return coreModules.every((moduleKey) => selectedModules.includes(moduleKey));
    if (step === 3) return branchName.trim().length > 1;
    if (step === 6) return ownershipAccepted;
    return true;
  }, [branchName, businessName, businessSlug, ownershipAccepted, selectedModules, step]);

  const enabledModuleSet = useMemo(() => new Set(selectedModules), [selectedModules]);

  function toggleModule(moduleKey: ModuleKey) {
    if (coreModules.includes(moduleKey)) return;

    setSelectedModules((current) =>
      current.includes(moduleKey)
        ? current.filter((item) => item !== moduleKey)
        : [...current, moduleKey]
    );
  }

  function updateSetupItem(index: number, value: Partial<SetupItem>) {
    setSetupItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)));
  }

  function updatePaymentMethod(index: number, value: Partial<SetupPaymentMethod>) {
    setPaymentMethods((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)));
  }

  async function finishSetup() {
    if (!user) {
      toast({ title: "Login required", description: "You must be logged in as the owner to complete setup." });
      return;
    }

    try {
      setSaving(true);
      await completeBusinessSetup({
        ownerUserId: user.id,
        ownerEmail: user.email,
        ownerName: String(user.user_metadata.full_name ?? user.email ?? "Owner"),
        businessName,
        businessSlug,
        businessEmail,
        businessPhone,
        businessType,
        selectedModules,
        branchName,
        branchPhone,
        branchAddress,
        setupItems: setupItems.filter((item) => item.name.trim().length > 0),
        openingHours: {
          mode: "same_daily",
          open: openingStart,
          close: openingEnd,
          days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        },
        bookingRules: {
          slot_minutes: slotMinutes,
          deposit_required: depositRequired,
        },
        paymentMethods: paymentMethods.filter((method) => method.name.trim().length > 0),
      });

      await refreshAuthState();
      toast({ title: "Setup completed", description: "Your business dashboard is ready." });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast({ title: "Setup failed", description: getAuthErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">First-Time Setup Wizard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your private-use business workspace, enable modules, and prepare branch operations.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-8">
          {steps.map((label, index) => (
            <button
              key={label}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                index === step && "border-primary bg-primary text-primary-foreground",
                index < step && "border-primary/30 bg-primary/10 text-primary"
              )}
              onClick={() => setStep(index)}
              type="button"
            >
              <span className="block text-xs opacity-80">Step {index + 1}</span>
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Create business profile</CardTitle>
            <CardDescription>This is your private business workspace, not a SaaS tenant or package account.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" value={businessName} onChange={setBusinessName} />
            <Field label="Business slug" value={businessSlug} onChange={setBusinessSlug} />
            <Field label="Business email" type="email" value={businessEmail} onChange={setBusinessEmail} />
            <Field label="Business phone" value={businessPhone} onChange={setBusinessPhone} />
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Select business type</CardTitle>
            <CardDescription>Salon, Spa, and Event Space are manual setup only. No preset records are created for them.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {businessTypes.map((type) => (
              <button
                key={type}
                className={cn("rounded-lg border p-4 text-left transition-colors hover:bg-secondary", businessType === type && "border-primary bg-primary/5")}
                onClick={() => setBusinessType(type)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{businessTypeLabels[type]}</p>
                  <Badge variant={hasSetupPreset(type) ? "default" : "outline"}>{hasSetupPreset(type) ? "Preset" : "Manual"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {hasSetupPreset(type)
                    ? "Recommended modules are selected as a starting suggestion."
                    : "Owner manually chooses modules during setup."}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>{businessTypeHasPreset ? "Recommended modules" : "Manual module selection"}</CardTitle>
            <CardDescription>
              {isManualBusinessType
                ? `${businessTypeLabels[businessType]} has no preset. Choose the modules you want to use.`
                : "Preset modules are suggestions only. You can enable or disable any non-core module anytime."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {defaultModules.map((module) => {
              const checked = enabledModuleSet.has(module.key);
              const recommended = preset?.recommended.includes(module.key);
              const optional = preset?.optional.includes(module.key);

              return (
                <button
                  key={module.key}
                  className={cn("rounded-lg border p-4 text-left transition-colors", checked && "border-primary bg-primary/5")}
                  disabled={module.core}
                  onClick={() => toggleModule(module.key)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{module.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                    </div>
                    <Badge variant={checked ? "success" : "secondary"}>{checked ? "Enabled" : "Disabled"}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {module.core ? <Badge variant="outline">Core</Badge> : null}
                    {recommended ? <Badge>Recommended</Badge> : null}
                    {optional ? <Badge variant="outline">Optional</Badge> : null}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Create first branch</CardTitle>
            <CardDescription>A default branch is used internally even when Multi-Branch is disabled.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Branch name" value={branchName} onChange={setBranchName} />
            <Field label="Branch phone" value={branchPhone} onChange={setBranchPhone} />
            <div className="sm:col-span-2">
              <Field label="Branch address" value={branchAddress} onChange={setBranchAddress} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>Add basic services or products</CardTitle>
            <CardDescription>Start with a few items. You can edit them later from Services, POS, or Inventory.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {setupItems.map((item, index) => (
              <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_140px_120px]">
                <Input value={item.name} onChange={(event) => updateSetupItem(index, { name: event.target.value })} placeholder="Item name" />
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={item.itemType}
                  onChange={(event) => updateSetupItem(index, { itemType: event.target.value as SetupItem["itemType"] })}
                >
                  <option value="service">Service</option>
                  <option value="product">Product</option>
                </select>
                <Input type="number" min="0" value={item.price} onChange={(event) => updateSetupItem(index, { price: Number(event.target.value) })} placeholder="Price" />
              </div>
            ))}
            <Button variant="outline" onClick={() => setSetupItems((current) => [...current, { name: "", itemType: "service", price: 0 }])}>
              Add item
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 5 ? (
        <Card>
          <CardHeader>
            <CardTitle>Opening hours, booking rules, and payments</CardTitle>
            <CardDescription>Set the first operational defaults. Detailed settings can be adjusted later.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Open" type="time" value={openingStart} onChange={setOpeningStart} />
              <Field label="Close" type="time" value={openingEnd} onChange={setOpeningEnd} />
              <Field label="Slot minutes" type="number" value={String(slotMinutes)} onChange={(value) => setSlotMinutes(Number(value))} />
            </div>
            <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <input className="h-4 w-4 accent-primary" checked={depositRequired} onChange={(event) => setDepositRequired(event.target.checked)} type="checkbox" />
              Require deposit for bookings
            </label>
            <div className="grid gap-3">
              {paymentMethods.map((method, index) => (
                <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                  <Input value={method.name} onChange={(event) => updatePaymentMethod(index, { name: event.target.value })} placeholder="Payment method" />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={method.methodType}
                    onChange={(event) => updatePaymentMethod(index, { methodType: event.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="qr">QR</option>
                    <option value="card">Card record</option>
                    <option value="bank_transfer">Bank transfer</option>
                  </select>
                </div>
              ))}
              <Button variant="outline" onClick={() => setPaymentMethods((current) => [...current, { name: "", methodType: "cash" }])}>
                Add payment method
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 6 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Data Ownership and Backup
            </CardTitle>
            <CardDescription>Review this notice before completing setup.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 rounded-lg border bg-secondary/40 p-4 text-sm">
              <p>You own your business data in Luxantara Members.</p>
              <p>You can export your backup anytime from Settings &gt; Data Backup.</p>
              <p>Backup supports customers, bookings, sales, memberships, inventory, payments, reports, and settings.</p>
              <p>Full backup is Owner-only. Manager report export depends on permission. Staff and customers cannot backup business data.</p>
            </div>
            <label className="flex items-start gap-3 rounded-lg border p-4 text-sm">
              <input className="mt-1 h-4 w-4 accent-primary" checked={ownershipAccepted} onChange={(event) => setOwnershipAccepted(event.target.checked)} type="checkbox" />
              <span>I understand that business backup/export is protected by business_id and branch_id isolation and available from Settings &gt; Data Backup.</span>
            </label>
          </CardContent>
        </Card>
      ) : null}

      {step === 7 ? (
        <Card>
          <CardHeader>
            <CardTitle>Confirm setup</CardTitle>
            <CardDescription>Review the setup summary before creating your business workspace.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <SummaryRow label="Business" value={`${businessName} (${businessTypeLabels[businessType]})`} />
            <SummaryRow label="Preset mode" value={businessTypeHasPreset ? "Preset suggestion applied" : "Manual module selection"} />
            <SummaryRow label="Branch" value={branchName} />
            <SummaryRow label="Enabled modules" value={`${selectedModules.length} modules`} />
            <SummaryRow label="Starter items" value={`${setupItems.filter((item) => item.name.trim()).length} items`} />
            <SummaryRow label="Payment methods" value={`${paymentMethods.filter((method) => method.name.trim()).length} methods`} />
            <SummaryRow label="Backup notice" value={ownershipAccepted ? "Accepted" : "Not accepted"} />
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button disabled={step === 0 || saving} variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button disabled={!canGoNext || saving} onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button disabled={!ownershipAccepted || saving} onClick={finishSetup}>
            {saving ? "Finishing setup" : "Finish setup"}
            {saving ? null : <Check className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 pt-5 text-sm">
          <DatabaseBackup className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">Backup is a core module.</p>
            <p className="mt-1 text-muted-foreground">It remains enabled for the Owner and will be enforced by frontend guards and Supabase RLS policies.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
