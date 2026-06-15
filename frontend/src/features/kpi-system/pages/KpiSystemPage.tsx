import React, { useState } from "react";
import { PageHeader, Surface, SectionTitle } from "@/components/ui-kit";
import { KpiTable, KpiRow } from "../components/KpiTable";
import { KpiMatrix } from "../components/KpiMatrix";
import { SetTargetDialog } from "../components/SetTargetDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter, Target, LayoutGrid, List, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock Data
const MOCK_KPI_DATA: KpiRow[] = [
  { id: "1", employeeName: "Employee 1", targetQty: 500, actualQty: 400, targetRevenue: 200, actualRevenue: 210, kpiPercent: 80, rank: 3 },
  { id: "2", employeeName: "Employee 2", targetQty: 450, actualQty: 450, targetRevenue: 180, actualRevenue: 180, kpiPercent: 100, rank: 1 },
  { id: "3", employeeName: "Employee 3", targetQty: 300, actualQty: 280, targetRevenue: 15000, actualRevenue: 10000, kpiPercent: 93, rank: 2 },
];

const MOCK_MATRIX_DATA = [
  {
    depotName: "Phnom Penh Central",
    products: { "Premium Oil": 110.5, "Brake Fluid": 95.2, "Coolant": 78.5 },
  },
  {
    depotName: "Siem Reap North",
    products: { "Premium Oil": 85.0, "Brake Fluid": 102.0, "Coolant": 88.0 },
  },
  {
    depotName: "Battambang Hub",
    products: { "Premium Oil": 92.5, "Brake Fluid": 75.0, "Coolant": 95.5 },
  },
];

const MATRIX_PRODUCTS = ["Premium Oil", "Brake Fluid", "Coolant"];

export const KpiSystemPage: React.FC = () => {
  const [fromDate, setFromDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "matrix">("list");
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);

  // Sort MOCK_KPI_DATA by kpiPercent descending to correct the ranks for display
  const sortedData = [...MOCK_KPI_DATA].sort((a, b) => b.kpiPercent - a.kpiPercent).map((item, index) => ({
    ...item,
    rank: index + 1
  }));

  const avgKpi = (sortedData.reduce((acc, row) => acc + row.kpiPercent, 0) / sortedData.length).toFixed(1);
  const topPerformer = sortedData[0]?.employeeName || "N/A";
  const totalEmployees = sortedData.length;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="KPI Management" 
        description="Track employee and depot performance against monthly targets."
        actions={
          <Button 
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md text-white border-0"
            onClick={() => setIsTargetDialogOpen(true)}
          >
            <Target className="h-4 w-4" />
            Set Target
          </Button>
        }
      />

      <SetTargetDialog 
        open={isTargetDialogOpen} 
        onOpenChange={setIsTargetDialogOpen} 
        onSave={(data) => {
          console.log("Saving KPI Target:", data);
          // TODO: Call API to save target
        }} 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Surface className="p-4 flex items-center gap-4 bg-gradient-to-br from-indigo-500/5 to-indigo-500/10 border border-indigo-500/20 shadow-sm transition-all hover:shadow-md">
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
             <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Average KPI Score</p>
            <h3 className="text-2xl font-bold tracking-tight">{avgKpi}%</h3>
          </div>
        </Surface>

        <Surface className="p-4 flex items-center gap-4 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20 shadow-sm transition-all hover:shadow-md">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
             <Star className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
            <h3 className="text-2xl font-bold tracking-tight">{topPerformer}</h3>
          </div>
        </Surface>

        <Surface className="p-4 flex items-center gap-4 bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/20 shadow-sm transition-all hover:shadow-md">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
             <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Employees Assessed</p>
            <h3 className="text-2xl font-bold tracking-tight">{totalEmployees}</h3>
          </div>
        </Surface>
      </div>

      <Surface padded className="space-y-4 shadow-sm border-border/50">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
          <div className="flex flex-1 gap-3 items-center w-full">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees or depots..."
                className="pl-9 bg-background/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Select defaultValue="all-depots">
              <SelectTrigger className="w-[140px] bg-background/50">
                <SelectValue placeholder="All Depots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-depots">All Depots</SelectItem>
                <SelectItem value="pp">Phnom Penh</SelectItem>
                <SelectItem value="sr">Siem Reap</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all-products">
              <SelectTrigger className="w-[140px] bg-background/50">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-products">All Products</SelectItem>
                <SelectItem value="oil">Premium Oil</SelectItem>
                <SelectItem value="brake">Brake Fluid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex bg-muted/50 p-1 rounded-md border border-border/50">
              <Button 
                variant={viewMode === "list" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-8 px-2"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4 mr-1" /> List
              </Button>
              <Button 
                variant={viewMode === "matrix" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-8 px-2"
                onClick={() => setViewMode("matrix")}
              >
                <LayoutGrid className="h-4 w-4 mr-1" /> Matrix
              </Button>
            </div>
            <div className="flex items-center gap-2 bg-background/50 p-1 rounded-md border border-border/50">
              <span className="text-xs font-medium text-muted-foreground ml-2">From:</span>
              <Input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-32 h-8 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
              />
              <span className="text-xs font-medium text-muted-foreground">To:</span>
              <Input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-32 h-8 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
              />
            </div>
            <Button variant="outline" size="icon" title="More Filters">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Data View */}
        <div className="pt-4 border-t border-border/50">
          <SectionTitle 
            title={viewMode === "list" ? "Employee Ranking" : "Depot vs Product KPI Matrix"} 
            meta={`Date Range: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`}
          />
          <div className="mt-4 shadow-sm">
            {viewMode === "list" ? (
              <KpiTable data={sortedData} />
            ) : (
              <KpiMatrix data={MOCK_MATRIX_DATA} productNames={MATRIX_PRODUCTS} />
            )}
          </div>
        </div>
      </Surface>
    </div>
  );
};
