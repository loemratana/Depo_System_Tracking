import { createFileRoute } from "@tanstack/react-router";
import { ProductAnalyticsPage } from "@/features/product-analytics/pages/ProductAnalyticsPage";

export const Route = createFileRoute("/product-analytics")({
  validateSearch: (search: Record<string, unknown>) => ({
    brandId: search.brandId as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Product Performance — Brand Depot" },
      { name: "description", content: "Monthly product performance, sales, revenue, and trends." },
    ],
  }),
  component: ProductAnalyticsRoute,
});

function ProductAnalyticsRoute() {
  const { brandId } = Route.useSearch();
  return <ProductAnalyticsPage brandId={brandId} />;
}
