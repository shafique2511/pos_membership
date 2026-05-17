import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function LoadingState({ title = "Loading" }: { title?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {title}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center px-5 py-12 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground" />
        <h3 className="mt-4 font-semibold">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="flex gap-3 pt-5">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
