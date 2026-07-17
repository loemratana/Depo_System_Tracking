import React from "react";
import { useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { brandService } from "../services/brandService.ts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui-kit";
import { KpiSummaryGrid } from "@/features/kpi/components/KpiSummaryGrid";
import {
  Building2,
  Package,
  Warehouse,
  ArrowLeft,
  Edit,
  FileText,
  CalendarDays,
  Tag,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Users,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useBrandProducts,
  useDepotsByBrand,
} from "@/features/brand/hooks/useBrands.ts";
import { useBrandKpiSummary } from "@/features/kpi/hooks/useKpiSummary";

const productStatusTone = (status: string) => {
  if (status === "OK") return "bg-green-600 text-white border-green-600";
  if (status === "LOW") return "bg-amber-500 text-white border-amber-500";
  return "bg-red-600 text-white border-red-600";
};

export default function BrandDetailPage() {
  const { id } = useParams({ from: "/brands_/$id" });
  const brandId = Number(id);

  const { data: summary, isLoading: summaryLoading } = useBrandKpiSummary(brandId);
  const { data: productsResponse, isLoading: productsLoading } = useBrandProducts(brandId);
  const {
    data: depotsData,
    isLoading: depotsLoading,
    isError: depotsError,
  } = useDepotsByBrand(brandId);

  const {
    data: brand,
    isLoading: brandLoading,
    error: brandError,
  } = useQuery({
    queryKey: ["brand", id],
    queryFn: () => brandService.getById(Number(id)),
    enabled: !!id,
  });

  const isLoading = brandLoading || summaryLoading;
  const depots = Array.isArray(depotsData) ? depotsData : [];
  const products = productsResponse?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            Loading brand profile...
          </span>
        </div>
      </div>
    );
  }

  if (brandError || !brand) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-[13px] text-muted-foreground">
          Failed to load brand details. Please try again.
        </div>
      </div>
    );
  }

  const formatDate = (date?: string) => {
    if (!date) return "—";
    return format(new Date(date), "dd MMM yyyy");
  };

  const kpiCards = [
    {
      id: "depots",
      label: "Total Depots",
      value: summary?.depots.total ?? 0,
      icon: Warehouse,
      hint: `${summary?.depots.active ?? 0} active`,
      accent: "primary" as const,
    },
    {
      id: "products",
      label: "Total Products",
      value: summary?.products.total ?? 0,
      icon: Package,
      hint: `${summary?.products.lowStock ?? 0} low stock`,
      accent: "info" as const,
    },
    {
      id: "coverage",
      label: "Active Coverage",
      value: `${summary?.coveragePercent ?? 0}%`,
      icon: TrendingUp,
      hint: "Active depots / total",
      trend: "up" as const,
      accent: "warning" as const,
    },
    {
      id: "sales",
      label: "Monthly Revenue",
      value: summary ? `$${summary.sales.revenue.toLocaleString()}` : "$0",
      icon: BarChart3,
      hint: summary
        ? `${summary.sales.growthPercent >= 0 ? "+" : ""}${summary.sales.growthPercent}% vs last month`
        : "This month",
      trend:
        (summary?.sales.growthPercent ?? 0) >= 0
          ? ("up" as const)
          : ("down" as const),
      accent: "danger" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border/70 bg-background/80 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to="/brands">
              <ArrowLeft className="h-4 w-4" /> Back to Brands
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-sm font-medium">Brand Name: {brand?.name ?? "—"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-8" asChild>
            <Link to="/product-analytics" search={{ brandId: String(brandId) }}>
              <BarChart3 className="h-3.5 w-3.5" /> View Analytics
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-8" asChild>
            <Link to="/depos" search={{ brandName: brand.name, provinceName: undefined }}>
              <Building2 className="h-3.5 w-3.5" /> View Depots
            </Link>
          </Button>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">{brand.name}</h1>
                  <StatusBadge tone={brand.status === "active" ? "success" : "muted"}>
                    {brand.status?.toUpperCase() || "ACTIVE"}
                  </StatusBadge>
                  {brand.code && (
                    <span className="font-mono text-[10px] bg-muted/50 px-1.5 py-0.5 rounded border">
                      {brand.code}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    <span>Created {formatDate(brand.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {brand.description && (
            <p className="text-sm text-muted-foreground border-t border-border/60 pt-3 mt-3">
              {brand.description}
            </p>
          )}
        </div>

        <KpiSummaryGrid cards={kpiCards} columns={4} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Vacancy
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {summary?.depots.vacancy ?? 0}
                </p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Expiring Soon
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {summary?.depots.expiringSoon ?? 0}
                </p>
              </div>
              <AlertTriangle className="h-5 w-5 text-warning" />
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Expired Licenses
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {summary?.depots.expired ?? 0}
                </p>
              </div>
              <XCircle className="h-5 w-5 text-destructive" />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <div className="border-b border-border">
            <TabsList className="bg-transparent h-auto p-0 gap-6 rounded-none">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="products"
                className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Products ({summary?.products.total ?? products.length})
              </TabsTrigger>
              <TabsTrigger
                value="depots"
                className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Depots ({summary?.depots.total ?? depots.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border">
                <CardHeader className="pb-2 border-b border-border/60">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    Brand Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brand Name</span>
                    <span className="font-medium">{brand.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brand Code</span>
                    <span className="font-mono text-xs">{brand.code || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge tone={brand.status === "active" ? "success" : "muted"}>
                      {brand.status || "active"}
                    </StatusBadge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created Date</span>
                    <span>{formatDate(brand.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-2 border-b border-border/60">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Inventory Snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total SKUs</span>
                    <span className="font-medium">{summary?.products.total ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Low Stock</span>
                    <span className="font-medium text-warning">
                      {summary?.products.lowStock ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Out of Stock</span>
                    <span className="font-medium text-destructive">
                      {summary?.products.outOfStock ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Units Sold (MTD)</span>
                    <span className="font-medium">{summary?.sales.unitsSold ?? 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="mt-4">
            <Card className="border-border">
              <CardContent className="p-0">
                {productsLoading ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    Loading products...
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No products assigned to this brand.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            SKU
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Depot
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Stock
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {products.map((product: any) => (
                          <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-xs">{product.sku || "—"}</td>
                            <td className="px-4 py-2.5 font-medium">
                              <Link
                                to="/products/$id"
                                params={{ id: String(product.id) }}
                                className="hover:text-primary hover:underline"
                              >
                                {product.name}
                              </Link>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {product.depotName || "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right">{product.quantity}</td>
                            <td className="px-4 py-2.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full border text-[10px] font-semibold uppercase shadow-sm",
                                  productStatusTone(product.status),
                                )}
                              >
                                {product.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="depots" className="mt-4">
            {depotsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="border-border">
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : depotsError ? (
              <Card className="border-border col-span-2">
                <CardContent className="py-12 text-center text-destructive text-sm">
                  Failed to load depots. Please try again.
                </CardContent>
              </Card>
            ) : depots.length === 0 ? (
              <Card className="border-border col-span-2">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No depots assigned to this brand.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {depots.map((depot) => (
                  <Card key={depot.id} className="border-border hover:shadow-sm transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-foreground">{depot.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono">{depot.code}</p>
                          <p className="text-xs text-muted-foreground">
                            {depot.district}, {depot.region}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                          <Link to="/depos/$id" params={{ id: String(depot.id) }}>
                            View <ArrowLeft className="h-3 w-3 ml-1 rotate-180" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
