import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/features/products/pages/ProductsPage";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — Brand Depot" },
      { name: "description", content: "Product catalog and depot coverage tracking." },
    ],
  }),
  component: ProductsPage,
});
