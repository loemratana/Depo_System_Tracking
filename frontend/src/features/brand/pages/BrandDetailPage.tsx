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
import {
  Building2,
  Package,
  Warehouse,
  Clock,
  ArrowLeft,
  Edit,
  FileText,
  CalendarDays,
  Tag,
  Box,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useBrandDepotCount, useBrands } from "@/features/brand/hooks/useBrands.ts";

// Mock data – replace with real API calls later
const mockProducts = [
  { id: 1, sku: "SKU001", name: "Coca-Cola 1.5L", price: 1.2, quantity: 1200, status: "available" },
  { id: 2, sku: "SKU002", name: "Sprite 1L", price: 0.9, quantity: 850, status: "low" },
];
const mockDepots = [
  { id: 1, name: "Phnom Penh Central", code: "PPC", district: "Daun Penh", region: "Phnom Penh" },
  { id: 2, name: "Siem Reap Hub", code: "SRH", district: "Siem Reap City", region: "Siem Reap" },
];
const mockActivityLogs = [
  {
    id: "act1",
    action: "Brand created",
    performedBy: "admin@example.com",
    timestamp: new Date().toISOString(),
    details: "Initial registration",
  },
  {
    id: "act2",
    action: "Products updated",
    performedBy: "manager@example.com",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    details: "Added 2 new SKUs",
  },
];

export default function BrandDetailPage() {
  const { id } = useParams({ from: "/brands_/$id" });

  const brandId = Number(id);

  // depot count hook
  const { data: depotCount, isLoading: depotLoading } = useBrandDepotCount(brandId);
  const { data: brands, isLoading: brandsLoading, error: brandsError } = useBrands();
  // brand detail query
  const {
    data: brand,
    isLoading: brandLoading,
    error,
  } = useQuery({
    queryKey: ["brand", id],
    queryFn: () => brandService.getById(Number(id)),
    enabled: !!id,
  });
  const isLoading = brandLoading || depotLoading;

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

  if (error || !brand) {
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
  return (
    <div className="min-h-screen bg-muted/20">
      {/* Top action bar (sticky) */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 backdrop-blur px-6 py-3">
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
          <Button variant="outline" size="sm" className="gap-2 h-8">
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-8">
            <FileText className="h-3.5 w-3.5" /> Report
          </Button>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* Brand header card */}
        <div className="bg-card border border-border rounded-lg p-5 ">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
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

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border ">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Products
                </p>
                <p className="text-2xl font-bold text-foreground">{brand?.products?.length ?? 0}</p>
              </div>
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border ">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Depots
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {depotCount?.total_depots ?? 0}
                </p>
              </div>
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Warehouse className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border ">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Coverage
                </p>
                <p className="text-2xl font-bold text-foreground">88%</p>
              </div>
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="border-b border-border">
            <TabsList className="bg-transparent h-auto p-0 gap-6 rounded-none">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="products"
                className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Products ({mockProducts.length})
              </TabsTrigger>
              <TabsTrigger
                value="depots"
                className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Depots ({mockDepots.length})
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Activity
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
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

              <Card className="border-border ">
                <CardHeader className="pb-2 border-b border-border/60">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Box className="h-4 w-4 text-muted-foreground" />
                    Activity Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last activity</span>
                    <span>
                      {mockActivityLogs[0]
                        ? format(new Date(mockActivityLogs[0].timestamp), "dd MMM yyyy")
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total events</span>
                    <span>{mockActivityLogs.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-4">
            <Card className="border-border ">
              <CardContent className="p-0">
                {mockProducts.length === 0 ? (
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
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Price
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
                        {mockProducts.map((product) => (
                          <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-xs">{product.sku}</td>
                            <td className="px-4 py-2.5 font-medium">{product.name}</td>
                            <td className="px-4 py-2.5 text-right">${product.price.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right">{product.quantity}</td>
                            <td className="px-4 py-2.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "capitalize text-[10px]",
                                  product.status === "available" &&
                                    "border-success/50 text-success",
                                  product.status === "low" && "border-warning/50 text-warning",
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

          {/* Depots Tab */}
          <TabsContent value="depots" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockDepots.length === 0 ? (
                <Card className="border-border  col-span-2">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No depots assigned to this brand.
                  </CardContent>
                </Card>
              ) : (
                mockDepots.map((depot) => (
                  <Card key={depot.id} className="border-border hover:shadow-md transition-all">
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
                          <Link to={`/depos/${depot.id}`}>
                            View <ArrowLeft className="h-3 w-3 ml-1 rotate-180" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-4">
            <Card className="border-border ">
              <CardContent className="p-5">
                {mockActivityLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No activity recorded for this brand.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {mockActivityLogs.map((log, idx) => (
                      <div key={log.id} className="flex gap-4">
                        <div className="relative">
                          <div className="p-2 rounded-full bg-primary/10 border border-primary/20">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                          </div>
                          {idx !== mockActivityLogs.length - 1 && (
                            <div className="absolute left-1/2 top-10 h-full w-px -translate-x-1/2 bg-border" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5 pb-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">
                              {log.action}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(log.timestamp), "dd MMM yyyy, HH:mm")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{log.details}</p>
                          <p className="text-[10px] text-muted-foreground/70">
                            by {log.performedBy}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
