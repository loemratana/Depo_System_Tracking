import { createFileRoute } from "@tanstack/react-router";
import { ProductAnalyticsPage } from "@/features/product-analytics/pages/ProductAnalyticsPage";

export const Route = createFileRoute("/product-analytics")({
  head: () => ({
    meta: [
      { title: "Product Performance — Brand Depot" },
      { name: "description", content: "Monthly product performance, sales, revenue, and trends." },
    ],
  }),
  component: ProductAnalyticsPage,
});
