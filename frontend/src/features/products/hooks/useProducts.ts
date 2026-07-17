// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { productService } from "../services/productService";
import type {
  ProductQueryParams,
  CreateProductInput,
  UpdateStockInput,
  UpdateMinStockInput,
} from "../types/product.types";

// ─────────────────────────────────────────────────────
// QUERY KEYS (centralised for easy invalidation)
// ─────────────────────────────────────────────────────
export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (params: ProductQueryParams) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: number) => [...productKeys.details(), id] as const,
  performance: (id: number, year?: number, month?: number) =>
    [...productKeys.detail(id), "performance", year, month] as const,
  lowStock: (depotId?: number) => [...productKeys.all, "low-stock", depotId] as const,
};

// ─────────────────────────────────────────────────────
// 1. GET ALL PRODUCTS  (paginated + filtered)
//
// curl "http://localhost:3000/api/products?page=1&limit=10"
// curl "http://localhost:3000/api/products?depotId=1"
// curl "http://localhost:3000/api/products?brandId=1"
// curl "http://localhost:3000/api/products?search=coca"
// curl "http://localhost:3000/api/products?minStockAlert=true"
// curl "http://localhost:3000/api/products?depotId=1&minStockAlert=true&page=1&limit=5"
// ─────────────────────────────────────────────────────
export const useProducts = (params: ProductQueryParams = {}) => {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productService.getAll(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (prev) => prev, // keep previous data while refetching (like keepPreviousData)
  });
};

// 2. GET PRODUCT BY ID
// GET /api/products/{id}
export const useProduct = (id: number) => {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productService.getById(id),
    enabled: !!id && id > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// ─────────────────────────────────────────────────────
// 3. GET LOW STOCK PRODUCTS
// GET /api/products/low-stock
// ─────────────────────────────────────────────────────
export const useLowStockProducts = (depotId?: number) => {
  return useQuery({
    queryKey: productKeys.lowStock(depotId),
    queryFn: () => productService.getLowStock(depotId),
    staleTime: 60 * 1000, // 1 minute — refresh more frequently as it's critical data
  });
};

// ─────────────────────────────────────────────────────
// 4. GET PRODUCT PERFORMANCE (monthly)
// GET /api/products/{id}/performance
// ─────────────────────────────────────────────────────
export const useProductPerformance = (
  id: number,
  year?: number,
  month?: number
) => {
  return useQuery({
    queryKey: productKeys.performance(id, year, month),
    queryFn: () => productService.getPerformance(id, year, month),
    enabled: !!id && id > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// ─────────────────────────────────────────────────────
// 5. CREATE PRODUCT
// POST /api/products
// ─────────────────────────────────────────────────────
export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductInput) => productService.create(data),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.lowStock() });
      toast.success(`Product "${product.name}" created successfully`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to create product"),
  });
};

// ─────────────────────────────────────────────────────
// 6. UPDATE STOCK
// PATCH /api/products/{id}/stock
// ─────────────────────────────────────────────────────
export const useUpdateStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateStockInput) => productService.updateStock(input),
    onSuccess: (product) => {
      // Refresh both list and the specific product detail
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(product.id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lowStock() });
      toast.success(`Stock updated — ${product.name}: ${product.quantity} units`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to update stock"),
  });
};

// ─────────────────────────────────────────────────────
// 7. UPDATE MIN STOCK THRESHOLD
// PATCH /api/products/{id}/min-stock
// ─────────────────────────────────────────────────────
export const useUpdateMinStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMinStockInput) => productService.updateMinStock(input),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(product.id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lowStock() });
      toast.success(`Min stock updated — ${product.name}: ${product.minStock} units`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to update min stock"),
  });
};

// ─────────────────────────────────────────────────────
// 9. DELETE PRODUCT (soft delete)
// DELETE /api/products/{id}
// ─────────────────────────────────────────────────────
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      toast.success("Product removed successfully");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to delete product"),
  });
};

export const useRecordSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productService.recordSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      // queryClient.invalidateQueries({ queryKey: ["low-stock-products"] });
    },
  });
};
