import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { defaultModules } from "@/features/business/modules";
import { businessTypeLabels, presetSupportedBusinessTypes } from "@/features/business/business-types";
import type { BusinessTypeKey } from "@/types/business";

const businessTypes = Object.keys(businessTypeLabels) as BusinessTypeKey[];

export function SetupWizardPage() {
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">First-Time Setup Wizard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create the business profile, choose a business type, enable modules, and prepare the first branch.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business type</CardTitle>
          <CardDescription>Salon, Spa, and Event Space are supported but have no preset.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {businessTypes.map((businessType) => (
            <div key={businessType} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{businessTypeLabels[businessType]}</p>
                <Badge variant={presetSupportedBusinessTypes.includes(businessType) ? "default" : "outline"}>
                  {presetSupportedBusinessTypes.includes(businessType) ? "Preset" : "Manual"}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {presetSupportedBusinessTypes.includes(businessType)
                  ? "Recommended modules can be used as a starting suggestion."
                  : "Owner manually chooses modules during setup."}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Module selection</CardTitle>
          <CardDescription>Modules are private-use toggles. Disabled modules are hidden and later blocked by database policies/functions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {defaultModules.map((module) => (
            <div key={module.key} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{module.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                </div>
                <Badge variant={module.enabled ? "success" : "secondary"}>{module.enabled ? "Enabled" : "Disabled"}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Continue setup</Button>
      </div>
    </div>
  );
}
