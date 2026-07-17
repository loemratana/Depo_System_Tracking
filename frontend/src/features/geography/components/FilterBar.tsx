// src/features/geography/components/FilterBar.tsx
import React from "react";
import { Plus } from "lucide-react";
import { SearchInput } from "./SearchInput";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter?: "all" | "active" | "inactive";
  onStatusFilterChange?: (value: "all" | "active" | "inactive") => void;
  showStatusFilter?: boolean;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  placeholder = "Search...",
  disabled = false,
  statusFilter = "all",
  onStatusFilterChange,
  showStatusFilter = false,
  className,
}) => {
  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3", className)}>
      <SearchInput
        value={searchValue}
        onChange={onSearchChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full sm:max-w-[240px]"
      />

      <div className="flex items-center gap-2 w-full sm:w-auto">
        {showStatusFilter && onStatusFilterChange && (
          <div className="flex items-center gap-0.5 bg-muted/30 border border-border/50 rounded-lg p-1 ">
            {(["all", "active", "inactive"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => onStatusFilterChange(filter)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  statusFilter === filter
                    ? "bg-background text-foreground "
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {filter === "all" ? "All" : filter === "active" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
