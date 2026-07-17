import { Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard, type KpiAccent } from "@/components/ui-kit";
import type { KpiCardConfig } from "../types/kpi.types";

interface KpiSummaryGridProps {
  cards: KpiCardConfig[];
  columns?: 2 | 3 | 4;
  isLoading?: boolean;
  scopeLabel?: string | null;
  onClearScope?: () => void;
}

const defaultAccents: KpiAccent[] = ["primary", "info", "warning", "danger"];

export function KpiSummaryGrid({
  cards,
  columns = 4,
  isLoading = false,
  scopeLabel,
  onClearScope,
}: KpiSummaryGridProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
  };

  return (
    <div className="space-y-3">
      {scopeLabel && (
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] text-foreground shadow-sm dark:border-blue-800 dark:bg-blue-950">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
            <Tag className="h-3 w-3" />
          </span>
          <span className="text-muted-foreground">
            Filtered by{" "}
            <span className="font-medium text-foreground">{scopeLabel}</span>
          </span>
          {onClearScope && (
            <button
              type="button"
              onClick={onClearScope}
              className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-blue-600 px-2 py-0.5 text-white transition-colors hover:bg-blue-700"
            >
              <X className="h-3 w-3" />
              <span className="text-[11px] font-medium">Clear</span>
            </button>
          )}
        </div>
      )}
      <div className={cn("grid gap-4", gridCols[columns])}>
        {cards.map((card, index) => (
          <div
            key={card.id}
            onClick={card.onClick}
            className={cn(card.onClick && "cursor-pointer")}
          >
            <KpiCard
              label={card.label}
              value={card.value}
              icon={card.icon}
              hint={card.hint}
              trend={card.trend}
              delta={card.delta}
              accent={card.accent ?? defaultAccents[index % defaultAccents.length]}
              selected={card.selected}
              isLoading={isLoading}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
