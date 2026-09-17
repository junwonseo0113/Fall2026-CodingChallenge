import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm outline-none transition-all placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/25 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
