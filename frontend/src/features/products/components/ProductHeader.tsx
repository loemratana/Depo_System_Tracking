import { Search, Plus, Download, Upload, AlertTriangle, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ProductHeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  showLowStockOnly: boolean;
  onToggleLowStock: () => void;
  onToggleFilters: () => void;
  showFilters: boolean;
  lowStockCount?: number;
  onAddProduct?: () => void;
}

export const ProductHeader: React.FC<ProductHeaderProps> = ({
  searchQuery,
  onSearchChange,
  showLowStockOnly,
  onToggleLowStock,
  onToggleFilters,
  showFilters,
  lowStockCount = 0,
  onAddProduct,
}) => {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU..."
            className="h-9 rounded-lg border-border/70 bg-background pl-9 shadow-sm"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 rounded-lg",
            showFilters && "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:text-white",
          )}
          onClick={onToggleFilters}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 rounded-lg",
            showLowStockOnly
              ? "border-amber-500 bg-amber-500 text-white hover:bg-amber-600 hover:text-white"
              : "",
          )}
          onClick={onToggleLowStock}
        >
          <AlertTriangle className="h-4 w-4" />
          Low Stock
          {lowStockCount > 0 && (
            <span
              className={cn(
                "ml-0.5 rounded-full px-1.5 py-0 text-[10px] font-semibold",
                showLowStockOnly ? "bg-white/20 text-white" : "bg-amber-500 text-white",
              )}
            >
              {lowStockCount}
            </span>
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-9 gap-2 rounded-lg">
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-2 rounded-lg">
          <Upload className="h-4 w-4" />
          Import
        </Button>
        <Button size="sm" className="h-9 gap-2 rounded-lg bg-blue-600 hover:bg-blue-700" onClick={onAddProduct}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>
    </div>
  );
};
