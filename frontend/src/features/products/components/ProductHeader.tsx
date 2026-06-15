import React from "react";
import { Search, Plus, Download, Upload, AlertTriangle, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b border-border">
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU..."
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          className="h-9 gap-2"
          onClick={onToggleFilters}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
        <Button
          variant={showLowStockOnly ? "destructive" : "outline"}
          size="sm"
          className={cn("h-9 gap-2", showLowStockOnly ? "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive border-transparent" : "")}
          onClick={onToggleLowStock}
        >
          <AlertTriangle className="h-4 w-4" />
          Low Stock
          {lowStockCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-background">
              {lowStockCount}
            </Badge>
          )}
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Upload className="h-4 w-4" />
          Import
        </Button>
        <Button size="sm" className="h-9 gap-2" onClick={onAddProduct}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>
    </div>
  );
};
