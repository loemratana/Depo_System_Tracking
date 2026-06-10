import React from "react";
import { cn } from "@/lib/utils";
import { BrandStatus } from "../types/brand.types";

interface BrandStatusBadgeProps {
  status: BrandStatus;
  className?: string;
}

export function BrandStatusBadge({ status, className }: BrandStatusBadgeProps) {
  const styles = {
    active: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold",
    inactive: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold",
    archived: "bg-zinc-500/10 border-zinc-500/20 text-zinc-500 dark:text-zinc-400 font-medium",
  };

  const labels = {
    active: "Active",
    inactive: "Inactive",
    archived: "Archived",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border select-none shrink-0",
        styles[status],
        className
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", 
        status === "active" ? "bg-emerald-500" :
        status === "inactive" ? "bg-amber-500" : "bg-zinc-500"
      )} />
      {labels[status]}
    </span>
  );
}
export default BrandStatusBadge;
