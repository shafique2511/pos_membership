import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type DropdownOption = {
  value: string;
  label: string;
};

type DropdownProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: DropdownOption[];
};

export function Dropdown({ className, options, ...props }: DropdownProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "focus-ring h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm shadow-sm",
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
