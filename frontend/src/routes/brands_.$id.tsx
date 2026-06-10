import { createFileRoute } from "@tanstack/react-router";
import BrandDetailPage from "../features/brand/pages/BrandDetailPage.tsx";
export const Route = createFileRoute("/brands_/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <BrandDetailPage />
    </div>
  );
}
