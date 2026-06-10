import React from "react";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, LayoutGrid, ListCollapse } from "lucide-react";
import { SearchInput } from "./SearchInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandStatus } from "../types/brand.types";

interface BrandFiltersProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  compact: boolean;
  onCompactToggle: (val: boolean) => void;
  className?: string;
}

export function BrandFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  compact,
  onCompactToggle,
  className,
}: BrandFiltersProps) {
  return (
    <div
      className={cn(
        "border border-border rounded-lg bg-card/15 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none",
        className
      )}
    >
      {/* Search and Status Selectors */}
      <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3">
        <div className="w-full sm:max-w-xs">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search by brand name or code..."
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["All", "Active", "Inactive", "Archived"].map((st) => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => onStatusFilterChange(st)}
                className={cn(
                  "px-2.5 py-1 rounded border text-[11px] font-semibold transition-all duration-150 cursor-pointer",
                  active
                    ? "bg-primary border-primary text-primary-foreground font-bold shadow-sm"
                    : "bg-background border-border hover:border-border-strong text-foreground hover:bg-muted/10"
                )}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort, View mode, and Density */}
      <div className="flex items-center gap-3 self-end md:self-auto">
        {/* Sort Select */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3" />
            Sort:
          </span>
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="h-8 w-36 text-[11px] bg-background border-border-strong text-foreground font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border text-[12px] font-medium">
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Separator */}
        <span className="h-4 w-px bg-border shrink-0" />

        {/* Density controls */}
        <div className="flex items-center border border-border-strong rounded-md overflow-hidden bg-background">
          <button
            onClick={() => onCompactToggle(true)}
            className={cn(
              "p-1.5 transition-colors cursor-pointer",
              compact
                ? "bg-muted text-foreground"
                : "text-muted-foreground/60 hover:text-foreground"
            )}
            title="Compact Spacing"
          >
            <ListCollapse className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onCompactToggle(false)}
            className={cn(
              "p-1.5 border-l border-border-strong transition-colors cursor-pointer",
              !compact
                ? "bg-muted text-foreground"
                : "text-muted-foreground/60 hover:text-foreground"
            )}
            title="Standard Spacing"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
export default BrandFilters;
