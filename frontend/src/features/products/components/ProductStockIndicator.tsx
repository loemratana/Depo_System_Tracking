import React from "react";
import { cn } from "@/lib/utils";

interface ProductStockIndicatorProps {
  currentStock: number;
  minStock: number;
}

export const ProductStockIndicator: React.FC<ProductStockIndicatorProps> = ({
  currentStock,
  minStock,
}) => {
  const isOut = currentStock === 0;
  const isLow = currentStock > 0 && currentStock <= minStock;
  const isHealthy = currentStock > minStock;

  let colorClass = "";
  let bgColorClass = "";
  let progressColorClass = "";

  if (isOut) {
    colorClass = "text-destructive";
    bgColorClass = "bg-destructive/10";
    progressColorClass = "bg-destructive";
  } else if (isLow) {
    colorClass = "text-amber-500 dark:text-amber-400";
    bgColorClass = "bg-amber-500/10 dark:bg-amber-400/10";
    progressColorClass = "bg-amber-500 dark:bg-amber-400";
  } else if (isHealthy) {
    colorClass = "text-emerald-600 dark:text-emerald-400";
    bgColorClass = "bg-emerald-600/10 dark:bg-emerald-400/10";
    progressColorClass = "bg-emerald-600 dark:bg-emerald-400";
  }

  // Calculate percentage for mini progress bar (maxed at 100%)
  // If healthy, we can base it on 2x minStock as a visual 'full' point
  const targetScale = isHealthy ? Math.max(minStock * 2, currentStock) : minStock;
  const percentage = targetScale > 0 ? Math.min((currentStock / targetScale) * 100, 100) : 0;

  return (
    <div className="flex flex-col gap-1.5 w-[100px]">
      <div className="flex items-center justify-between text-[13px]">
        <span className={cn("font-semibold tabular-nums", colorClass)}>
          {currentStock.toLocaleString()}
        </span>
        {isLow && !isOut && (
          <span className="text-[10px] font-medium text-amber-500 dark:text-amber-400 uppercase tracking-wide">
            Low
          </span>
        )}
        {isOut && (
          <span className="text-[10px] font-medium text-destructive uppercase tracking-wide">
            Out
          </span>
        )}
      </div>
      <div className={cn("h-1.5 w-full rounded-full overflow-hidden", bgColorClass)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", progressColorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
