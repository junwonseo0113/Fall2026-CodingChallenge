import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MasonryGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4", className)}>
      {children}
    </div>
  );
}
