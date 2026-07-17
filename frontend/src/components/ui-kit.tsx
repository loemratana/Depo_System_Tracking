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
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
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
        "overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm",
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
    default: "bg-slate-600 text-white border-slate-600",
    success: "bg-green-600 text-white border-green-600",
    warning: "bg-amber-500 text-white border-amber-500",
    danger: "bg-red-600 text-white border-red-600",
    info: "bg-blue-600 text-white border-blue-600",
    muted: "bg-slate-500 text-white border-slate-500",
  };
  const dotTones: Record<BadgeTone, string> = {
    default: "bg-white/90",
    success: "bg-white/90",
    warning: "bg-white/90",
    danger: "bg-white/90",
    info: "bg-white/90",
    muted: "bg-white/90",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide shadow-sm",
        tones[tone],
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotTones[tone])} />}
      {children}
    </span>
  );
}

export type KpiAccent = "primary" | "info" | "warning" | "danger" | "muted";

const kpiAccentStyles: Record<
  KpiAccent,
  { icon: string; ring: string; hint: string }
> = {
  primary: {
    icon: "bg-blue-600 text-white shadow-sm",
    ring: "ring-blue-600/40",
    hint: "text-muted-foreground",
  },
  info: {
    icon: "bg-sky-600 text-white shadow-sm",
    ring: "ring-sky-600/40",
    hint: "text-muted-foreground",
  },
  warning: {
    icon: "bg-amber-500 text-white shadow-sm",
    ring: "ring-amber-500/40",
    hint: "text-muted-foreground",
  },
  danger: {
    icon: "bg-red-600 text-white shadow-sm",
    ring: "ring-red-600/40",
    hint: "text-muted-foreground",
  },
  muted: {
    icon: "bg-slate-600 text-white shadow-sm",
    ring: "ring-slate-500/40",
    hint: "text-muted-foreground",
  },
};

export function KpiCard({
  label,
  value,
  delta,
  trend = "up",
  icon: Icon,
  hint,
  accent = "primary",
  selected,
  isLoading,
}: {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  accent?: KpiAccent;
  selected?: boolean;
  isLoading?: boolean;
}) {
  const styles = kpiAccentStyles[accent];
  const trendColor =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div
      className={cn(
        "group relative h-full rounded-xl border border-border/70 bg-card p-4",
        selected && cn("ring-2", styles.ring),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              styles.icon,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        {isLoading ? (
          <div className="h-7 w-16 animate-pulse rounded-md bg-muted" />
        ) : (
          <div className="text-[26px] font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </div>
        )}
        {delta && !isLoading && (
          <div className={cn("text-[11.5px] font-medium", trendColor)}>{delta}</div>
        )}
      </div>
      {hint && (
        <div className={cn("mt-2 text-[11px] leading-snug", styles.hint)}>{hint}</div>
      )}
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-all duration-200",
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
          : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:bg-muted/50 hover:text-foreground",
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 py-14 text-center">
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/80">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="text-[13px] font-medium text-foreground">{title}</div>
      {description && (
        <div className="mt-1 max-w-xs text-[12px] text-muted-foreground">{description}</div>
      )}
    </div>
  );
}
