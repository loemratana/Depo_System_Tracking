// src/features/geography/components/StatusBadge.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "active" | "inactive";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  return (
    <Badge
      variant={status === "active" ? "success" : "secondary"}
      className={cn(
        "gap-1.5 font-medium px-2 py-0.5 text-[10px] uppercase tracking-wider",
        className,
      )}
    >
      <span
        className={cn(
          "w-1 h-1 rounded-full",
          status === "active" ? "bg-success-foreground" : "bg-muted-foreground",
        )}
      />
      {status}
    </Badge>
  );
};
