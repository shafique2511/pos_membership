import { useEffect, useState } from "react";
import { AlertTriangle, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { LoadingState } from "@/components/shared/StateViews";
import { useAuth } from "@/features/auth/auth-context";
import { businessTypeLabels } from "@/features/business/business-types";
import { checkDisableSafety, getModuleSettingState, saveModuleSettings, setBusinessModuleEnabled, type DisableSafetyResult, type ModuleSettingState } from "@/features/modules/module-settings-service";
import type { ModuleKey } from "@/types/business";

export function ModuleSettingsPage() {
  const { business, refreshAuthState, user } = useAuth();
  const { toast } = useToast();
  const [modules, setModules] = useState<ModuleSettingState[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ModuleKey | null>(null);
  const [pendingDisable, setPendingDisable] = useState<{ module: ModuleSettingState; safety: DisableSafetyResult } | null>(null);

  useEffect(() => {
    void loadModules();
  }, [business?.id]);

  async function loadModules() {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setModules(await getModuleSettingState(business.id));
    } catch (error) {
      toast({ title: "Could not load modules", description: error instanceof Error ? error.message : "Check Supabase connection." });
    } finally {
      setLoading(false);
    }
  }

  async function toggleModule(module: ModuleSettingState, nextEnabled: boolean, force = false) {
    if (!business?.id || !user?.id) return;

    if (!nextEnabled && !force) {
      const safety = await checkDisableSafety(business.id, module.key);

      if (!safety.safe) {
        toast({ title: "Module cannot be disabled", description: safety.message });
        return;
      }

      if (safety.requiresConfirmation) {
        setPendingDisable({ module, safety });
        return;
      }
    }

    try {
      setSavingKey(module.key);
      await setBusinessModuleEnabled({
        businessId: business.id,
        moduleKey: module.key,
        enabled: nextEnabled,
        userId: user.id,
      });
      await refreshAuthState();
      await loadModules();
      toast({ title: nextEnabled ? "Module enabled" : "Module disabled", description: `${module.name} has been updated.` });
    } catch (error) {
      toast({ title: "Module update failed", description: error instanceof Error ? error.message : "Check Supabase permissions." });
    } finally {
      setSavingKey(null);
      setPendingDisable(null);
    }
  }

  async function updateModuleSettings(module: ModuleSettingState, sidebarVisible: boolean) {
    if (!business?.id || !user?.id) return;

    const nextSettings = {
      ...module.settings,
      sidebar_visible: sidebarVisible,
    };

    try {
      setSavingKey(module.key);
      await saveModuleSettings({
        businessId: business.id,
        moduleKey: module.key,
        userId: user.id,
        settings: nextSettings,
        moduleEnabled: module.enabled,
      });
      await refreshAuthState();
      await loadModules();
      toast({ title: "Module settings saved", description: `${module.name} settings were updated.` });
    } catch (error) {
      toast({ title: "Settings update failed", description: error instanceof Error ? error.message : "Check Supabase permissions." });
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) return <LoadingState title="Loading module settings" />;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Module Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Owner-controlled private-use modules. No package pricing, unlocks, or upgrade prompts.</p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 pt-5 text-sm">
          <Settings2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">Database-backed module access</p>
            <p className="mt-1 text-muted-foreground">Sidebar visibility updates after module changes, and Supabase RLS still blocks disabled module data access.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {modules.map((module) => {
          const isLockedCore = module.key === "core" || module.key === "settings";
          const isDataBackup = module.key === "data_backup";
          const disabled = savingKey === module.key || isLockedCore || isDataBackup;

          return (
            <Card key={module.key}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{module.name}</CardTitle>
                    <CardDescription className="mt-1">{module.description}</CardDescription>
                  </div>
                  <Badge variant={module.enabled ? "success" : "secondary"}>{module.enabled ? "Enabled" : "Disabled"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex flex-wrap gap-2">
                  {module.core ? <Badge variant="outline">Core</Badge> : null}
                  {module.recommendedBusinessTypes?.map((type) => (
                    <Badge key={type} variant="outline">{businessTypeLabels[type]}</Badge>
                  ))}
                </div>

                {isDataBackup ? (
                  <div className="rounded-md border bg-secondary/40 p-3 text-sm text-muted-foreground">
                    Data Backup is Owner-only. The Owner cannot lose backup access, and old data remains exportable even if other modules are disabled.
                  </div>
                ) : null}

                <div className="grid gap-3 rounded-md border p-3">
                  <label className="flex items-center justify-between gap-4 text-sm">
                    <span>
                      <span className="font-medium">Enable module</span>
                      <span className="block text-muted-foreground">Controls route access, sidebar visibility, and backend module checks.</span>
                    </span>
                    <input
                      checked={module.enabled}
                      className="h-5 w-5 accent-primary"
                      disabled={disabled}
                      onChange={(event) => toggleModule(module, event.target.checked)}
                      type="checkbox"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-4 text-sm">
                    <span>
                      <span className="font-medium">Show in sidebar</span>
                      <span className="block text-muted-foreground">Useful for hiding rarely used settings while keeping access available.</span>
                    </span>
                    <input
                      checked={module.sidebarVisible}
                      className="h-5 w-5 accent-primary"
                      disabled={savingKey === module.key}
                      onChange={(event) => updateModuleSettings(module, event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        description={pendingDisable?.safety.message}
        onClose={() => setPendingDisable(null)}
        open={Boolean(pendingDisable)}
        title="Disable module?"
      >
        <div className="grid gap-4">
          <div className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Existing data will stay protected.</p>
              <p className="mt-1 text-muted-foreground">The module will be hidden from operational screens. Owner backup can still export old data.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingDisable(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => pendingDisable && toggleModule(pendingDisable.module, false, true)}>
              Confirm disable
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
