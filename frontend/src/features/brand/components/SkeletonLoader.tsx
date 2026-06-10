import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonLoader({ rows = 5, columns = 5, className }: SkeletonLoaderProps) {
  return (
    <div className={cn("w-full border border-border rounded-lg bg-card/10 overflow-hidden select-none", className)}>
      <div className="bg-card/30 h-10 border-b border-border flex items-center px-4 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-3.5 bg-muted rounded animate-pulse",
              i === 0 ? "w-1/6" : i === 1 ? "w-1/4" : "w-1/12"
            )}
          />
        ))}
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className={cn(
                  "h-3 bg-muted/65 rounded animate-pulse",
                  colIndex === 0
                    ? "w-1/6 font-mono"
                    : colIndex === 1
                    ? "w-1/3"
                    : colIndex === 2
                    ? "w-12"
                    : "w-20"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
export default SkeletonLoader;
