import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Clock } from "lucide-react";

export type StatusType =
  | "Processing"
  | "Completed"
  | "Failed"
  | "Partial Success"
  | "Validating"
  | "Queued"
  | "Generating"
  | "Ready"
  | "Expired";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles: Record<StatusType, { bg: string; text: string; dot: string; icon?: React.ComponentType<{ className?: string }> }> = {
    Completed: {
      bg: "bg-success/10 dark:bg-success/5 border-success/20",
      text: "text-success-foreground",
      dot: "bg-success",
      icon: CheckCircle2,
    },
    Ready: {
      bg: "bg-success/10 dark:bg-success/5 border-success/20",
      text: "text-success-foreground",
      dot: "bg-success",
      icon: CheckCircle2,
    },
    "Partial Success": {
      bg: "bg-warning/10 dark:bg-warning/5 border-warning/20",
      text: "text-warning-foreground",
      dot: "bg-warning",
      icon: AlertTriangle,
    },
    Processing: {
      bg: "bg-primary/10 dark:bg-primary/5 border-primary/20",
      text: "text-primary",
      dot: "bg-primary",
      icon: RefreshCw,
    },
    Validating: {
      bg: "bg-primary/10 dark:bg-primary/5 border-primary/20",
      text: "text-primary",
      dot: "bg-primary",
      icon: RefreshCw,
    },
    Generating: {
      bg: "bg-primary/10 dark:bg-primary/5 border-primary/20",
      text: "text-primary",
      dot: "bg-primary",
      icon: RefreshCw,
    },
    Queued: {
      bg: "bg-muted border-border",
      text: "text-muted-foreground",
      dot: "bg-muted-foreground/60",
      icon: Clock,
    },
    Failed: {
      bg: "bg-destructive/10 dark:bg-destructive/5 border-destructive/20",
      text: "text-destructive",
      dot: "bg-destructive",
      icon: XCircle,
    },
    Expired: {
      bg: "bg-muted border-border",
      text: "text-muted-foreground/80 line-through",
      dot: "bg-muted-foreground/40",
      icon: Clock,
    },
  };

  const current = styles[status] || {
    bg: "bg-muted border-border",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/50",
  };
  const Icon = current.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-tight transition-all",
        current.bg,
        current.text,
        className
      )}
    >
      {Icon ? (
        <Icon className={cn("h-3 w-3 shrink-0", status === "Processing" || status === "Generating" || status === "Validating" ? "animate-spin" : "")} />
      ) : (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", current.dot)} />
      )}
      <span>{status}</span>
    </div>
  );
}
