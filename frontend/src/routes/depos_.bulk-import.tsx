import { createFileRoute } from "@tanstack/react-router";
import { DepotBulkImportPage } from "@/features/depots/pages/DepotBulkImportPage";

export const Route = createFileRoute("/depos_/bulk-import")({
  head: () => ({
    meta: [{ title: "Bulk Import Depots — Brand Depot" }],
  }),
  component: DepotBulkImportPage,
});
