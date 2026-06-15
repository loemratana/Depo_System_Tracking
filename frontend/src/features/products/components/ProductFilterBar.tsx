import React from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface ProductFilterState {
  brandId: string;
  depotId: string;
  status: string;
  minStock: string;
  maxStock: string;
  fromDate: string;
  toDate: string;
}

interface ProductFilterBarProps {
  filters: ProductFilterState;
  onFilterChange: (key: keyof ProductFilterState, value: string) => void;
  onReset: () => void;
  isVisible: boolean;
}

export const ProductFilterBar: React.FC<ProductFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  isVisible
}) => {
  if (!isVisible) return null;

  return (
    <div className="bg-muted/30 border border-border rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Brand</Label>
        <Select value={filters.brandId} onValueChange={(val) => onFilterChange("brandId", val)}>
          <SelectTrigger className="h-8 text-xs bg-background">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            <SelectItem value="1">Coca-Cola</SelectItem>
            <SelectItem value="2">Pepsi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Depot</Label>
        <Select value={filters.depotId} onValueChange={(val) => onFilterChange("depotId", val)}>
          <SelectTrigger className="h-8 text-xs bg-background">
            <SelectValue placeholder="All Depots" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Depots</SelectItem>
            <SelectItem value="10">Depot Toul Kork</SelectItem>
            <SelectItem value="11">Depot Daun Penh</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select value={filters.status} onValueChange={(val) => onFilterChange("status", val)}>
          <SelectTrigger className="h-8 text-xs bg-background">
            <SelectValue placeholder="Any Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            <SelectItem value="discontinued">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Stock Range</Label>
        <div className="flex items-center space-x-2">
          <Input 
            placeholder="Min" 
            className="h-8 text-xs bg-background" 
            value={filters.minStock}
            onChange={(e) => onFilterChange("minStock", e.target.value)}
            type="number"
          />
          <span className="text-muted-foreground">-</span>
          <Input 
            placeholder="Max" 
            className="h-8 text-xs bg-background" 
            value={filters.maxStock}
            onChange={(e) => onFilterChange("maxStock", e.target.value)}
            type="number"
          />
        </div>
      </div>

      <div className="space-y-1.5 lg:col-span-2">
        <Label className="text-xs text-muted-foreground">Date Range</Label>
        <div className="flex items-center space-x-2">
          <Input 
            type="date"
            className="h-8 text-xs bg-background" 
            value={filters.fromDate}
            onChange={(e) => onFilterChange("fromDate", e.target.value)}
          />
          <span className="text-muted-foreground">-</span>
          <Input 
            type="date"
            className="h-8 text-xs bg-background" 
            value={filters.toDate}
            onChange={(e) => onFilterChange("toDate", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5 flex flex-col justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={onReset}
        >
          <X className="h-3.5 w-3.5 mr-2" />
          Reset Filters
        </Button>
      </div>
    </div>
  );
};
