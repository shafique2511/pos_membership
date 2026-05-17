import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type TabItem<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex overflow-x-auto rounded-lg border bg-card p-1">
      {items.map((item) => (
        <button
          className={cn(
            "focus-ring inline-flex min-h-9 min-w-fit flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors",
            item.value === value && "bg-primary text-primary-foreground shadow-sm"
          )}
          key={item.value}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
