import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { defaultModules } from "@/features/business/modules";

export function SettingsPage() {
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Business profile, roles, modules, branches, portal, and security configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module controls</CardTitle>
          <CardDescription>Owner-controlled private-use modules. No SaaS billing or upgrade flow.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {defaultModules.map((module) => (
            <div key={module.key} className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div>
                <p className="font-medium">{module.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
              </div>
              <Badge variant={module.enabled ? "success" : "secondary"}>{module.enabled ? "Enabled" : "Disabled"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
