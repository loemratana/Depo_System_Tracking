import React from "react";
import { cn } from "@/lib/utils";
import { BrandStatus } from "../types/brand.types";

interface BrandStatusBadgeProps {
  status: BrandStatus;
  className?: string;
}

export function BrandStatusBadge({ status, className }: BrandStatusBadgeProps) {
  const styles = {
    active: "bg-green-600 text-white border-green-600",
    inactive: "bg-amber-500 text-white border-amber-500",
    archived: "bg-slate-500 text-white border-slate-500",
  };

  const labels = {
    active: "Active",
    inactive: "Inactive",
    archived: "Archived",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm select-none shrink-0",
        styles[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
      {labels[status]}
    </span>
  );
}
export default BrandStatusBadge;
