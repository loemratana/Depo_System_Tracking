import { createFileRoute } from "@tanstack/react-router";
import { BrandManagementPage } from "../features/brand/pages/BrandManagementPage";

export const Route = createFileRoute("/brands")({
  component: BrandManagementComponent,
});

function BrandManagementComponent() {
  return <BrandManagementPage />;
}
export default BrandManagementComponent;
