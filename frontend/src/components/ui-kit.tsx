import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-[20px] font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Surface({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card",
        padded && "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h3>
        {meta && <span className="text-[11px] text-muted-foreground">{meta}</span>}
      </div>
      {action}
    </div>
  );
}

type BadgeTone = "default" | "success" | "warning" | "danger" | "info" | "muted";

export function StatusBadge({
  tone = "default",
  children,
  dot,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  dot?: boolean;
}) {
  const tones: Record<BadgeTone, string> = {
    default: "bg-muted text-foreground/80 border-border",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/25",
    danger: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-primary/10 text-primary border-primary/20",
    muted: "bg-muted text-muted-foreground border-border",
  };
  const dotTones: Record<BadgeTone, string> = {
    default: "bg-foreground/40",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-destructive",
    info: "bg-primary",
    muted: "bg-muted-foreground/50",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium",
        tones[tone],
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotTones[tone])} />}
      {children}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  trend = "up",
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  const trendColor =
    trend === "up" ? "text-green-600 dark:text-green-400" : trend === "down" ? "text-red-600 dark:text-red-400" : "ext-gray-500 dark:text-gray-400";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4  dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <div className="text-[22px] font-semibold tracking-tight text-foreground">{value}</div>
        {delta && <div className={cn("text-[11.5px] font-medium", trendColor)}>{delta}</div>}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function FilterChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] font-medium transition-colors",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
      {Icon && (
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="text-[13px] font-medium text-foreground">{title}</div>
      {description && <div className="mt-1 max-w-xs text-[12px] text-muted-foreground">{description}</div>}
    </div>
  );
}
