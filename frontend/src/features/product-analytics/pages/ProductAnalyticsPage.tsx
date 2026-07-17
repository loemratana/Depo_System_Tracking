import React, { useState, useMemo } from "react";
import { PageHeader, Surface, SectionTitle } from "@/components/ui-kit";
import { KpiSummaryGrid } from "@/features/kpi/components/KpiSummaryGrid";
import { ProductPerformanceTable } from "../components/ProductPerformanceTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, RotateCcw, DollarSign, Package, TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAnalyticsOptions, useAnalyticsPerformance } from "../hook/useAnalyticsOptions";

export const ProductAnalyticsPage: React.FC<{ brandId?: string }> = ({ brandId }) => {
  const [fromDate, setFromDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
  });

  const [search, setSearch] = useState("");
  const [selectedDepot, setSelectedDepot] = useState("all-depots");
  const [selectedEmployee, setSelectedEmployee] = useState("all-employees");

  const { depotOptions, employeeOptions, isLoading: optionsLoading } = useAnalyticsOptions();

  const {
    data = [],
    isLoading: performanceLoading,
    isError: performanceError,
    error,
  } = useAnalyticsPerformance({
    fromDate,
    toDate,
    depotId: selectedDepot === "all-depots" ? undefined : selectedDepot,
    brandId: brandId || undefined,
    employeeId: selectedEmployee === "all-employees" ? undefined : selectedEmployee,
    search: search || undefined,
  });

  const handleReset = () => {
    setSearch("");
    setSelectedDepot("all-depots");
    setSelectedEmployee("all-employees");
    const today = new Date();
    setFromDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]);
    setToDate(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0]);
  };

  if (performanceError) {
    toast.error(error?.message || "Failed to load performance data");
  }

  const isLoading = optionsLoading || performanceLoading;

  const analyticsKpiCards = useMemo(() => {
    const totalRevenue = data.reduce((sum, row) => sum + row.revenue, 0);
    const totalUnits = data.reduce((sum, row) => sum + row.quantitySold, 0);
    const avgGrowth =
      data.length > 0 ? data.reduce((sum, row) => sum + row.growth, 0) / data.length : 0;

    return [
      {
        id: "revenue",
        label: "Total Revenue",
        value: `$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        icon: DollarSign,
        hint: "For selected period",
        accent: "primary" as const,
      },
      {
        id: "units",
        label: "Units Sold",
        value: totalUnits.toLocaleString(),
        icon: Package,
        hint: `${data.length} records`,
        accent: "info" as const,
      },
      {
        id: "growth",
        label: "Avg Growth",
        value: `${avgGrowth >= 0 ? "+" : ""}${avgGrowth.toFixed(1)}%`,
        icon: TrendingUp,
        hint: "Month over month",
        accent: avgGrowth >= 0 ? ("info" as const) : ("warning" as const),
      },
      {
        id: "records",
        label: "Performance Rows",
        value: data.length,
        icon: BarChart3,
        hint: "Filtered results",
        accent: "muted" as const,
      },
    ];
  }, [data]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Product Performance"
        description={
          brandId
            ? "Performance analytics filtered by brand."
            : "Monthly product performance analytics tracking sales, revenue, and growth trends."
        }
      />

      <KpiSummaryGrid cards={analyticsKpiCards} columns={4} isLoading={isLoading} />

      <Surface padded={false} className="overflow-hidden">
        <div className="border-b border-border/70 bg-muted/20 p-4 backdrop-blur-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products or employees..."
                  className="h-9 rounded-lg border-border/70 bg-background pl-9 shadow-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select value={selectedDepot} onValueChange={setSelectedDepot}>
                <SelectTrigger className="h-9 w-[160px] rounded-lg">
                  <SelectValue placeholder="All Depots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-depots">All Depots</SelectItem>
                  {depotOptions.map((depot) => (
                    <SelectItem key={depot.id} value={depot.id.toString()}>
                      {depot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="h-9 w-[160px] rounded-lg">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-employees">All Employees</SelectItem>
                  {employeeOptions.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-1.5 shadow-sm">
                <span className="text-xs font-medium text-muted-foreground">From</span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-7 w-32 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
                />
                <span className="text-xs font-medium text-muted-foreground">To</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-7 w-32 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
                />
              </div>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <SectionTitle
            title="Performance Breakdown"
            meta={`${new Date(fromDate).toLocaleDateString()} – ${new Date(toDate).toLocaleDateString()}`}
          />
          <div className="mt-4">
            {isLoading ? (
              <div className="space-y-2 py-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />
                ))}
              </div>
            ) : (
              <ProductPerformanceTable data={data} />
            )}
          </div>
        </div>
      </Surface>
    </div>
  );
};
