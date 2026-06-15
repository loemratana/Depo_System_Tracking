import { createFileRoute } from "@tanstack/react-router";
import { ProductDetailPage } from "@/features/products/pages/ProductDetailPage";

export const Route = createFileRoute("/products_/$id")({
  head: () => ({
    meta: [
      { title: "Product Details — Brand Depot" },
    ],
  }),
  component: ProductDetailPage,
});
