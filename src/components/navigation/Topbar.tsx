import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "@/features/business/business-context";

type TopbarProps = {
  onMenuClick: () => void;
};

export function Topbar({ onMenuClick }: TopbarProps) {
  const { role } = useBusiness();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Button aria-label="Open navigation" className="lg:hidden" size="icon" variant="ghost" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative hidden w-full max-w-sm sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search records" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary">{role}</Badge>
          <Button variant="outline">Account</Button>
        </div>
      </div>
    </header>
  );
}
