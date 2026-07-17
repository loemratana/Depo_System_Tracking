import api from "@/api/axios-client";
import type {
  Product,
  PaginatedProducts,
  ProductQueryParams,
  CreateProductInput,
  UpdateStockInput,
  UpdateMinStockInput,
  LowStockProduct,
  ProductPerformance,
  RecordSaleInput,       // you may need to define this type
  RecordSaleResponse,    // optional
} from "../types/product.types";

export const productService = {
  // ─────────────────────────────────────────────
  // POST /api/products — Create a new product
  // ─────────────────────────────────────────────
  create: (data: CreateProductInput): Promise<Product> =>
    api.post<{ data: Product }>("/products", data).then((res) => res.data.data ?? res.data),

  // ─────────────────────────────────────────────
  // GET /api/products — List all (paginated + filtered)
  // ─────────────────────────────────────────────
  getAll: (params?: ProductQueryParams): Promise<PaginatedProducts> =>
    api
      .get<PaginatedProducts>("/products", {
        params: params
          ? {
              ...params,
              minStockAlert: params.minStockAlert ? "true" : undefined,
            }
          : undefined,
      })
      .then((res) => res.data),

  // ─────────────────────────────────────────────
  // GET /api/products/{id} — Single product detail
  // ─────────────────────────────────────────────
  getById: (id: number): Promise<Product> =>
    api.get<{ data: Product }>(`/products/${id}`).then((res) => res.data.data ?? res.data),

  // ─────────────────────────────────────────────
  // PATCH /api/products/{id}/stock — Update quantity (restock, damage, adjustment)
  // ─────────────────────────────────────────────
  updateStock: ({ id, ...payload }: UpdateStockInput): Promise<Product> =>
    api
      .patch<{ data: Product }>(`/products/${id}/stock`, payload)
      .then((res) => res.data.data ?? res.data),

  // ─────────────────────────────────────────────
  // POST /api/products/sales — Record a sale (employee‑specific)
  // ─────────────────────────────────────────────
  // services/productService.ts

recordSale: (data: { 
  productId: number; 
  employeeId?: number;  // ← make optional
  quantitySold: number; 
  saleDate?: string 
}): Promise<{ product: Product; performance: any }> =>
  api.post("/products/sales", data).then((res) => res.data.data ?? res.data),

  // ─────────────────────────────────────────────
  // PATCH /api/products/{id}/min-stock — Update minimum stock threshold
  // ─────────────────────────────────────────────
  updateMinStock: ({ id, minStock }: UpdateMinStockInput): Promise<Product> =>
    api
      .patch<{ data: Product }>(`/products/${id}/min-stock`, { minStock })
      .then((res) => res.data.data ?? res.data),

  // ─────────────────────────────────────────────
  // GET /api/products/low-stock — Products below minimum stock
  // ─────────────────────────────────────────────
  getLowStock: (depotId?: number): Promise<LowStockProduct[]> =>
    api
      .get<{ data: LowStockProduct[] }>("/products/low-stock", {
        params: depotId ? { depotId } : undefined,
      })
      .then((res) => res.data.data ?? res.data),

  // ─────────────────────────────────────────────
  // GET /api/products/{id}/performance — Monthly performance data
  // ─────────────────────────────────────────────
  getPerformance: (
    id: number,
    year?: number,
    month?: number
  ): Promise<ProductPerformance> => {
    const now = new Date();
    return api
      .get<{ data: ProductPerformance }>(`/products/${id}/performance`, {
        params: {
          year: year ?? now.getFullYear(),
          month: month ?? now.getMonth() + 1,
        },
      })
      .then((res) => res.data.data ?? res.data);
  },

  // ─────────────────────────────────────────────
  // DELETE /api/products/{id} — Soft delete
  // ─────────────────────────────────────────────
  delete: (id: number): Promise<void> =>
    api.delete(`/products/${id}`).then(() => undefined),
};