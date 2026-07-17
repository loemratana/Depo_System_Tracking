import { createFileRoute } from "@tanstack/react-router";
import { KpiSystemPage } from "@/features/kpi-system/pages/KpiSystemPage";
import type { KpiSystemSearch } from "@/features/kpi-system/types/kpi-system.types";

function defaultMonthRange() {
  const today = new Date();
  return {
    fromDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0],
    toDate: new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0],
  };
}

export const Route = createFileRoute("/kpi-system")({
  validateSearch: (search: Record<string, unknown>): KpiSystemSearch => {
    const defaults = defaultMonthRange();
    return {
      search: typeof search.search === "string" ? search.search : "",
      depotId: typeof search.depotId === "string" ? search.depotId : "all",
      productId: typeof search.productId === "string" ? search.productId : "all",
      fromDate: typeof search.fromDate === "string" ? search.fromDate : defaults.fromDate,
      toDate: typeof search.toDate === "string" ? search.toDate : defaults.toDate,
      view: search.view === "matrix" ? "matrix" : "list",
    };
  },
  head: () => ({
    meta: [
      { title: "KPI Management — Brand Depot" },
      {
        name: "description",
        content: "Track employee and depot performance against monthly targets.",
      },
    ],
  }),
  component: KpiSystemPage,
});
