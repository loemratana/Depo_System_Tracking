import React, { useState, useMemo } from "react";
import { PageHeader, Surface } from "@/components/ui-kit";
import { KpiSummaryGrid } from "@/features/kpi/components/KpiSummaryGrid";
import { ProductHeader } from "../components/ProductHeader";
import { ProductFilterBar, ProductFilterState } from "../components/ProductFilterBar";
import { ProductTable } from "../components/ProductTable";
import { ProductFormDialog } from "../components/ProductFormDialog";
import { AdjustStockDialog } from "../components/AdjustStockDialog";
import { DeleteProductDialog } from "../components/DeleteProductDialog";
import { useNavigate } from "@tanstack/react-router";
import {
  useProducts,
  useLowStockProducts,
  useCreateProduct,
  useUpdateStock,
  useDeleteProduct,
  useRecordSale,
} from "../hooks/useProducts";
import type { Product } from "../types/product.types";
import type { CreateProductInput } from "../types/product.types";
import { Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Filter state (UI) ─────────────────────────────
const DEFAULT_FILTERS: ProductFilterState = {
  brandId: "all",
  depotId: "all",
  status: "all",
  minStock: "",
  maxStock: "",
  fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0],
  toDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString()
    .split("T")[0],
};

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();

  // ── UI state ──────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [filters, setFilters] = useState<ProductFilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [adjustStockProduct, setAdjustStockProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  // API query params ──────────────────────────────
  const queryParams = {
    page,
    limit: 10,
    search: searchQuery || undefined,
    depotId: filters.depotId !== "all" ? filters.depotId : undefined,
    brandId: filters.brandId !== "all" ? filters.brandId : undefined,
    status: filters.status !== "all" ? filters.status : undefined,
    minStockAlert: showLowStockOnly || undefined,
  };

  // ── Hooks
  const { data, isLoading, isError } = useProducts(queryParams);
  const { data: lowStockItems } = useLowStockProducts();
  const createProduct = useCreateProduct();
  const updateStock = useUpdateStock();
  const deleteProductMutation = useDeleteProduct();

  const products = data?.data ?? [];
  const pagination = data?.pagination;
  const lowStockCount = lowStockItems?.length ?? 0;

  // Handlers
  const handleFilterChange = (key: keyof ProductFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // reset to page 1 on filter change
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery("");
    setShowLowStockOnly(false);
    setPage(1);
  };

  const handleToggleLowStock = () => {
    setShowLowStockOnly((prev) => !prev);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleCreateOrUpdate = (formData: Partial<Product>) => {
    if (editProduct) {
      // future: useUpdateProduct mutation
      console.log("Update product (not implemented yet)", formData);
    } else {
      createProduct.mutate(formData as CreateProductInput);
    }
    setFormOpen(false);
    setEditProduct(null);
  };

  const recordSale = useRecordSale();

  const handleAdjustStock = (
    productId: number,
    type: "ADD" | "REMOVE",
    amount: number,
    reason: string,
    employeeId?: number,
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (type === "REMOVE" && reason === "sale") {
      // Call the sale endpoint – employeeId is optional (auto‑assign if omitted)
      recordSale.mutate({
        productId,
        employeeId, // may be undefined
        quantitySold: amount,
        saleDate: new Date().toISOString(),
      });
    } else {
      // Generic stock update (restock, damage, adjustment, etc.)
      const newQuantity =
        type === "ADD" ? product.quantity + amount : Math.max(0, product.quantity - amount);
      updateStock.mutate({ id: productId, quantity: newQuantity, employeeId });
    }
  };

  const handleDelete = (id: number) => {
    deleteProductMutation.mutate(id);
  };

  const handleEdit = (id: number) => {
    const p = products.find((x) => x.id === id) ?? null;
    setEditProduct(p);
    setFormOpen(true);
  };

  const productKpiCards = useMemo(
    () => [
      {
        id: "total",
        label: "Total Products",
        value: pagination?.total ?? 0,
        icon: Package,
        hint: "Across all depots",
        accent: "primary" as const,
      },
      {
        id: "low-stock",
        label: "Low Stock Alerts",
        value: lowStockCount,
        icon: AlertTriangle,
        hint: lowStockCount > 0 ? "Needs attention" : "All stock levels OK",
        accent: "warning" as const,
        selected: showLowStockOnly,
        onClick: () => {
          setShowLowStockOnly((prev) => !prev);
          setPage(1);
        },
      },
    ],
    [pagination?.total, lowStockCount, showLowStockOnly],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description="Manage product distribution, stock levels, and assignments across your depot network."
      />

      <KpiSummaryGrid cards={productKpiCards} columns={2} isLoading={isLoading} />

      <Surface padded={false} className="overflow-hidden">
        <div className="p-4">
          <ProductHeader
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          showLowStockOnly={showLowStockOnly}
          onToggleLowStock={handleToggleLowStock}
          lowStockCount={lowStockCount}
          onAddProduct={() => {
            setEditProduct(null);
            setFormOpen(true);
          }}
        />

        <div className="mt-4">
          <ProductFilterBar
            isVisible={showFilters}
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          {/* Loading state */}
          {isLoading && (
            <div className="space-y-2 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          )}

          {/* Error state */}
          {isError && !isLoading && (
            <div className="flex items-center justify-center h-48 text-destructive text-sm">
              Failed to load products. Please check your connection and try again.
            </div>
          )}

          {/* Table */}
          {!isLoading && !isError && (
            <ProductTable
              data={products}
              onView={(id) => navigate({ to: `/products/${id}` })}
              onEdit={handleEdit}
              onAdjustStock={(id) => {
                const p = products.find((x) => x.id === id) ?? null;
                setAdjustStockProduct(p);
              }}
              onDelete={(id) => {
                const p = products.find((x) => x.id === id) ?? null;
                setDeleteProduct(p);
              }}
            />
          )}

          {/* Server-side pagination controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/70 bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {products.length} of {pagination.total} products
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="px-2 text-xs tabular-nums text-muted-foreground">
                  Page {page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
        </div>
      </Surface>

      {/* Create / Edit Dialog */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditProduct(null);
        }}
        product={editProduct as any}
        onSave={handleCreateOrUpdate}
      />

      {/* Adjust Stock Dialog */}
      <AdjustStockDialog
        open={!!adjustStockProduct}
        onOpenChange={(open) => {
          if (!open) setAdjustStockProduct(null);
        }}
        product={adjustStockProduct as any}
        onSave={handleAdjustStock}
        isSaving={updateStock.isPending || recordSale.isPending} // show loading while saving
      />

      {/* Delete Confirmation Dialog */}
      <DeleteProductDialog
        open={!!deleteProduct}
        onOpenChange={(open) => {
          if (!open) setDeleteProduct(null);
        }}
        product={deleteProduct as any}
        onConfirm={handleDelete}
      />
    </div>
  );
};
