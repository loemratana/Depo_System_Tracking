import { createFileRoute } from "@tanstack/react-router";
import { Box, Search, MoreHorizontal } from "lucide-react";
import { PageHeader, Surface, SectionTitle, StatusBadge, KpiCard } from "@/components/ui-kit";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — Brand Depot" },
      { name: "description", content: "Product catalog and depot coverage tracking." },
    ],
  }),
  component: ProductsPage,
});

const products = [
  { sku: "CR-100", name: "Core Roast 250g", line: "Core", coverage: 94, depots: 1208, status: "active" as const },
  { sku: "CR-200", name: "Core Roast 500g", line: "Core", coverage: 91, depots: 1180, status: "active" as const },
  { sku: "PR-410", name: "Premium Reserve", line: "Premium", coverage: 76, depots: 942, status: "active" as const },
  { sku: "PR-420", name: "Premium Cold Brew", line: "Premium", coverage: 68, depots: 821, status: "active" as const },
  { sku: "SS-301", name: "Seasonal Harvest", line: "Seasonal", coverage: 54, depots: 612, status: "watch" as const },
  { sku: "SS-302", name: "Seasonal Spice", line: "Seasonal", coverage: 41, depots: 488, status: "watch" as const },
  { sku: "AC-110", name: "Filter Pack 12ct", line: "Accessories", coverage: 88, depots: 1112, status: "active" as const },
];

function ProductsPage() {
  return (
    <>
      <PageHeader title="Products" description="Catalog SKUs and depot-level coverage signal." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="SKUs tracked" value={products.length} icon={Box} />
        <KpiCard label="Avg coverage" value={`${Math.round(products.reduce((s, p) => s + p.coverage, 0) / products.length)}%`} delta="+1.4pp" trend="up" />
        <KpiCard label="Premium uplift" value="+8%" delta="QoQ" trend="up" />
        <KpiCard label="Watch list" value={products.filter((p) => p.status === "watch").length} />
      </div>

      <Surface className="mt-3" padded={false}>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <SectionTitle title="Catalog" meta={`${products.length} SKUs`} />
          <div className="relative ml-auto w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search SKU, name…"
              className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-[12.5px] focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left font-medium">SKU</th>
              <th className="px-4 py-2 text-left font-medium">Product</th>
              <th className="px-4 py-2 text-left font-medium">Line</th>
              <th className="px-4 py-2 text-right font-medium">Depots</th>
              <th className="px-4 py-2 text-right font-medium">Coverage</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.sku} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{p.sku}</td>
                <td className="px-4 py-2.5 text-foreground">{p.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{p.line}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.depots.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${p.coverage}%` }} />
                    </div>
                    <span className="w-9 text-right tabular-nums text-muted-foreground">{p.coverage}%</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge tone={p.status === "active" ? "success" : "warning"} dot>{p.status}</StatusBadge>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>
    </>
  );
}
