import React from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Search,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-12 border border-dashed border-border rounded-lg bg-card/5 select-none",
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card shadow-sm shrink-0 mb-4">
        <Icon className="h-5 w-5 text-muted-foreground/60" />
      </div>

      <h3 className="text-[13px] font-semibold text-foreground tracking-tight">
        {title}
      </h3>
      <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px] leading-normal">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="outline"
          size="sm"
          className="mt-4 text-[11px] h-7 border-border-strong text-foreground hover:bg-muted font-semibold"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
export default EmptyState;
