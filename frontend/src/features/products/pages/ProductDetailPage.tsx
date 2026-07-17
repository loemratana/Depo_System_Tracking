import React, { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { PageHeader, Surface, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Box,
  Building2,
  MapPin,
  TrendingUp,
  History,
  User,
  Loader2,
  PackageX,
} from "lucide-react";
import { ProductStockIndicator } from "../components/ProductStockIndicator";
import { AdjustStockDialog } from "../components/AdjustStockDialog";
import { useProduct, useProductPerformance, useUpdateStock, useRecordSale } from "../hooks/useProducts";
import type { ProductStatus } from "../types/product.types";

// ── Status → badge mapping ───────────────────────────────────────
const STATUS_MAP: Record<
  ProductStatus,
  { label: string; tone: "success" | "destructive" | "neutral" | "warning" }
> = {
  ok: { label: "Available", tone: "success" },
  low: { label: "Low Stock", tone: "warning" },
  out_of_stock: { label: "Out of Stock", tone: "destructive" },
  discontinued: { label: "Discontinued", tone: "neutral" },
};

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams({ strict: false });
  const productId = Number(id);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [perfYear, setPerfYear] = useState(new Date().getFullYear());
  const [perfMonth, setPerfMonth] = useState(new Date().getMonth() + 1);

  // ── Hooks ─────────────────────────────────────────────────────
  const { data: product, isLoading, isError } = useProduct(productId);
  const { data: performance, isLoading: perfLoading } = useProductPerformance(
    productId,
    perfYear,
    perfMonth,
  );
  const updateStock = useUpdateStock();
  const recordSale = useRecordSale();

  // ── Loading ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading product…</span>
      </div>
    );
  }

  // ── Error / Not found ──────────────────────────────────────────
  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <PackageX className="h-12 w-12 opacity-30" />
        <p className="text-sm">Product not found or could not be loaded.</p>
        <Button variant="outline" asChild>
          <Link to="/products">Back to Products</Link>
        </Button>
      </div>
    );
  }

  const { label: statusLabel, tone: statusTone } = STATUS_MAP[product.status as ProductStatus] ?? {
    label: product.status,
    tone: "neutral" as const,
  };

  const handleAdjustStock = (
    _productId: number,
    type: "ADD" | "REMOVE",
    amount: number,
    reason: "manual" | "sale" | "restock" | "damage" | "adjustment",
    employeeId?: number,
    revenue?: number,
  ) => {
    if (type === "REMOVE" && reason === "sale") {
      recordSale.mutate({
        productId: product.id,
        employeeId,
        quantitySold: amount,
        saleDate: new Date().toISOString(),
        revenue,
      });
    } else {
      const newQuantity =
        type === "ADD" ? product.quantity + amount : Math.max(0, product.quantity - amount);
      updateStock.mutate({ id: product.id, quantity: newQuantity, reason, employeeId });
    }
  };

  // Month selector options
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {product.name}
              <StatusBadge tone={statusTone} dot>
                {statusLabel}
              </StatusBadge>
            </h1>
            <p className="text-sm text-muted-foreground font-mono mt-1">{product.sku}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {}}>
            Edit Product
          </Button>
          <Button onClick={() => setAdjustOpen(true)}>Adjust Stock</Button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="md:col-span-1 space-y-6">
          <Card className="overflow-hidden border-border/60 bg-surface">
            <div className="aspect-square bg-muted/30 flex items-center justify-center p-6 border-b border-border/50">
              <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center">
                <Box className="h-16 w-16 text-primary/60" />
              </div>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Brand
                </div>
                <span className="font-medium">{product.brand?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Depot
                </div>
                <span className="font-medium">{product.depot?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Box className="h-4 w-4" />
                  Min Stock
                </div>
                <span className="font-medium tabular-nums">{product.minStock} units</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel – Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 h-auto rounded-none">
              {[
                { value: "overview", icon: TrendingUp, label: "Overview" },
                { value: "performance", icon: TrendingUp, label: "Performance" },
                { value: "assignment", icon: User, label: "Assignment" },
              ].map(({ value, icon: Icon, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Overview tab ──────────────────────────────────── */}
            <TabsContent value="overview" className="pt-6 outline-none">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-surface border-border/60">
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Current Stock Level
                    </p>
                    <ProductStockIndicator
                      currentStock={product.quantity}
                      minStock={product.minStock}
                    />
                    <p className="text-xs text-muted-foreground mt-4">
                      Minimum threshold is set to {product.minStock} units.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-surface border-border/60">
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Units on Hand
                    </p>
                    <p className="text-3xl font-semibold tabular-nums text-foreground">
                      {product.quantity.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Current quantity available in this depot
                    </p>
                  </CardContent>
                </Card>
                {/* Created / Updated */}
                <Card className="bg-surface border-border/60 col-span-2">
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Timestamps</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="font-medium">
                          {new Date(product.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {product.updatedAt && (
                        <div>
                          <p className="text-xs text-muted-foreground">Last Updated</p>
                          <p className="font-medium">
                            {new Date(product.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Performance tab ───────────────────────────────── */}
            <TabsContent value="performance" className="pt-6 outline-none space-y-4">
              {/* Month / Year selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  className="text-xs border border-border rounded px-2 py-1.5 bg-background text-foreground"
                  value={perfMonth}
                  onChange={(e) => setPerfMonth(Number(e.target.value))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  className="text-xs border border-border rounded px-2 py-1.5 bg-background text-foreground"
                  value={perfYear}
                  onChange={(e) => setPerfYear(Number(e.target.value))}
                >
                  {[2024, 2025, 2026].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {perfLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading performance data…
                </div>
              ) : performance ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Qty Sold", value: performance.sales.quantitySold.toLocaleString() },
                      { label: "Revenue", value: `$${performance.sales.revenue.toLocaleString()}` },
                      {
                        label: "Avg Price",
                        value: `$${performance.sales.averagePrice.toFixed(2)}`,
                      },
                    ].map(({ label, value }) => (
                      <Card key={label} className="bg-surface border-border/60">
                        <CardContent className="p-5">
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <p className="text-2xl font-semibold tabular-nums text-foreground">
                            {value}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Stock movement summary */}
                  <Card className="bg-surface border-border/60">
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-muted-foreground mb-3">
                        Stock Movement — {performance.period.monthName} {performance.period.year}
                      </p>
                      <div className="grid grid-cols-3 gap-4 text-sm text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Start of Month</p>
                          <p className="text-lg font-bold tabular-nums">
                            {performance.stock.startOfMonth}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Sold</p>
                          <p className="text-lg font-bold tabular-nums text-destructive">
                            −{performance.stock.soldDuringMonth}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">End of Month</p>
                          <p className="text-lg font-bold tabular-nums">
                            {performance.stock.endOfMonth}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Per-employee breakdown */}
                  {performance.sales.byEmployee.length > 0 && (
                    <Card className="bg-surface border-border/60">
                      <CardContent className="p-0">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground border-b border-border/50">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium">Employee</th>
                              <th className="px-4 py-3 text-right font-medium">Qty Sold</th>
                              <th className="px-4 py-3 text-right font-medium">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {performance.sales.byEmployee.map((emp) => (
                              <tr key={emp.employeeId} className="hover:bg-muted/20">
                                <td className="px-4 py-3 font-medium">{emp.employeeName}</td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                  {emp.quantitySold}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                  ${emp.revenue.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No performance data available for this period.
                </p>
              )}
            </TabsContent>

            {/* ── Assignment tab ────────────────────────────────── */}
            <TabsContent value="assignment" className="pt-6 outline-none">
              <Card className="bg-surface border-border/60">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-border/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">Depot</p>
                      <p className="text-xs text-muted-foreground">Assigned warehouse location</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary">{product.depot?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {product.depot?.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-foreground">Brand</p>
                      <p className="text-xs text-muted-foreground">Product brand association</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{product.brand?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {product.brand?.code}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Adjust Stock Dialog ──────────────────────────────────── */}
      <AdjustStockDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        product={product as any}
        onSave={handleAdjustStock}
        isSaving={updateStock.isPending || recordSale.isPending}
      />
    </>
  );
};
