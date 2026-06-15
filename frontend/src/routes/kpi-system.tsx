import { createFileRoute } from "@tanstack/react-router";
import { KpiSystemPage } from "@/features/kpi-system/pages/KpiSystemPage";

export const Route = createFileRoute("/kpi-system")({
  head: () => ({
    meta: [
      { title: "KPI Management — Brand Depot" },
      { name: "description", content: "Track employee and depot performance against monthly targets." },
    ],
  }),
  component: KpiSystemPage,
});
