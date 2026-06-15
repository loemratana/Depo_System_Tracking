import React, { useState } from "react";
import { PageHeader, Surface } from "@/components/ui-kit";
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
import { Loader2, Package, AlertTriangle, DollarSign } from "lucide-react";

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

  // const updateStock = useUpdateStock();
  const recordSale = useRecordSale();
   // add this

  const handleAdjustStock = (
    productId: number,
    type: "ADD" | "REMOVE",
    amount: number,
    reason: string,
    employeeId?: number,
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    // If it's a sale (REMOVE + reason === "sale")
    if (type === "REMOVE" && reason === "sale" && employeeId) {
      recordSale.mutate({
        productId,
        employeeId,
        quantitySold: amount,
        saleDate: new Date().toISOString(),
      });
    } else {
      // Generic stock update for restock, damage, adjustment
      const newQuantity =
        type === "ADD" ? product.quantity + amount : Math.max(0, product.quantity - amount);
      updateStock.mutate({
        id: productId,
        quantity: newQuantity,
        reason: reason as any,
        employeeId,
      });
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

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage product distribution, stock levels, and assignments across your depot network."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Surface className="p-4 flex items-center gap-4 bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/20 shadow-sm transition-all hover:shadow-md">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Products</p>
            <h3 className="text-2xl font-bold tracking-tight">{pagination?.total ?? 0}</h3>
          </div>
        </Surface>

        <Surface className="p-4 flex items-center gap-4 bg-gradient-to-br from-amber-500/5 to-amber-500/10 border border-amber-500/20 shadow-sm transition-all hover:shadow-md">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Low Stock Alerts</p>
            <h3 className="text-2xl font-bold tracking-tight">{lowStockCount}</h3>
          </div>
        </Surface>

        <Surface className="p-4 flex items-center gap-4 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20 shadow-sm transition-all hover:shadow-md">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Est. Page Value</p>
            <h3 className="text-2xl font-bold tracking-tight">
              $
              {products
                .reduce((acc, p) => acc + (Number(p.price) || 0) * (p.quantity || 0), 0)
                .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </Surface>
      </div>

      <Surface className="mt-6 shadow-sm border-border/50 overflow-hidden" padded>
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
            <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading products…</span>
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
            <div className="flex items-center justify-between pt-4 px-1">
              <p className="text-xs text-muted-foreground">
                Showing {products.length} of {pagination.total} products
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="text-xs text-muted-foreground font-medium">
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
    </>
  );
};
