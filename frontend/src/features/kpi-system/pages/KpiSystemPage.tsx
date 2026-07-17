import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PageHeader, Surface, SectionTitle } from "@/components/ui-kit";
import { KpiSummaryGrid } from "@/features/kpi/components/KpiSummaryGrid";
import { KpiTable } from "../components/KpiTable";
import { KpiMatrix } from "../components/KpiMatrix";
import { SetTargetDialog } from "../components/SetTargetDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Target, LayoutGrid, List, Star, Users, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Route } from "@/routes/kpi-system";
import type { KpiSystemSearch } from "../types/kpi-system.types";
import {
  useKpiFilterOptions,
  useKpiMatrix,
  useKpiRankings,
  useKpiSummary,
  useSetKpiTarget,
} from "../hooks/useKpiSystem";
import { useState } from "react";

export function KpiSystemPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);

  const updateSearch = (patch: Partial<KpiSystemSearch>) => {
    navigate({
      to: "/kpi-system",
      search: { ...search, ...patch },
    });
  };

  const queryParams = useMemo(
    () => ({
      fromDate: search.fromDate,
      toDate: search.toDate,
      search: search.search || undefined,
      depotId: search.depotId !== "all" ? search.depotId : undefined,
      productId: search.productId !== "all" ? search.productId : undefined,
    }),
    [search],
  );

  const { data: options } = useKpiFilterOptions();
  const { data: summary, isLoading: summaryLoading } = useKpiSummary(queryParams);
  const { data: rankings = [], isLoading: rankingsLoading } = useKpiRankings(
    queryParams,
    search.view === "list",
  );
  const { data: matrix, isLoading: matrixLoading } = useKpiMatrix(
    queryParams,
    search.view === "matrix",
  );
  const setTarget = useSetKpiTarget();

  const isLoading = summaryLoading || (search.view === "list" ? rankingsLoading : matrixLoading);

  const kpiCards = useMemo(
    () => [
      {
        id: "avg",
        label: "Average KPI Score",
        value: `${(summary?.averageKpi ?? 0).toFixed(1)}%`,
        icon: Target,
        hint: "Team average this period",
        accent: "primary" as const,
      },
      {
        id: "top",
        label: "Top Performer",
        value: summary?.topPerformer || "N/A",
        icon: Star,
        hint: "Highest KPI %",
        accent: "info" as const,
      },
      {
        id: "employees",
        label: "Employees Assessed",
        value: summary?.employeesAssessed ?? 0,
        icon: Users,
        hint: `${summary?.aboveTarget ?? 0} above target`,
        accent: "info" as const,
      },
    ],
    [summary],
  );

  const handleReset = () => {
    const today = new Date();
    updateSearch({
      search: "",
      depotId: "all",
      productId: "all",
      fromDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0],
      toDate: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0],
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="KPI Management"
        description="Track employee and depot performance against monthly targets."
        actions={
          <Button
            className="gap-2 rounded-lg bg-blue-600 hover:bg-blue-700"
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
        onSave={async (data) => {
          await setTarget.mutateAsync(data);
          setIsTargetDialogOpen(false);
        }}
      />

      <KpiSummaryGrid cards={kpiCards} columns={3} isLoading={summaryLoading} />

      <Surface padded={false} className="overflow-hidden">
        <div className="border-b border-border/70 bg-muted/20 p-4 backdrop-blur-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search employees or depots..."
                  className="h-9 rounded-lg border-border/70 bg-background pl-9 shadow-sm"
                  value={search.search}
                  onChange={(e) => updateSearch({ search: e.target.value })}
                />
              </div>

              <Select
                value={search.depotId}
                onValueChange={(value) => updateSearch({ depotId: value })}
              >
                <SelectTrigger className="h-9 w-[160px] rounded-lg">
                  <SelectValue placeholder="All Depots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depots</SelectItem>
                  {options?.depots.map((depot) => (
                    <SelectItem key={depot.id} value={String(depot.id)}>
                      {depot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={search.productId}
                onValueChange={(value) => updateSearch({ productId: value })}
              >
                <SelectTrigger className="h-9 w-[160px] rounded-lg">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {options?.products.map((product) => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-border/70 bg-background p-1 shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 gap-1 rounded-md px-2.5 text-xs",
                    search.view === "list" &&
                      "bg-blue-600 text-white hover:bg-blue-700 hover:text-white",
                  )}
                  onClick={() => updateSearch({ view: "list" })}
                >
                  <List className="h-3.5 w-3.5" />
                  List
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 gap-1 rounded-md px-2.5 text-xs",
                    search.view === "matrix" &&
                      "bg-blue-600 text-white hover:bg-blue-700 hover:text-white",
                  )}
                  onClick={() => updateSearch({ view: "matrix" })}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Matrix
                </Button>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-1.5 shadow-sm">
                <span className="text-xs font-medium text-muted-foreground">From</span>
                <Input
                  type="date"
                  value={search.fromDate}
                  onChange={(e) => updateSearch({ fromDate: e.target.value })}
                  className="h-7 w-32 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
                />
                <span className="text-xs font-medium text-muted-foreground">To</span>
                <Input
                  type="date"
                  value={search.toDate}
                  onChange={(e) => updateSearch({ toDate: e.target.value })}
                  className="h-7 w-32 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg"
                onClick={handleReset}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <SectionTitle
            title={search.view === "list" ? "Employee Ranking" : "Depot vs Product KPI Matrix"}
            meta={`${new Date(search.fromDate).toLocaleDateString()} – ${new Date(search.toDate).toLocaleDateString()}`}
          />
          <div className="mt-4">
            {isLoading ? (
              <div className="space-y-2 py-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />
                ))}
              </div>
            ) : search.view === "list" ? (
              <KpiTable data={rankings} />
            ) : (
              <KpiMatrix
                data={matrix?.rows ?? []}
                productNames={matrix?.productNames ?? []}
              />
            )}
          </div>
        </div>
      </Surface>
    </div>
  );
}
