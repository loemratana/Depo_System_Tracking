// types/product.types.ts

// ─────────────────────────────────────────────
// ENUMS / STATUS
// ─────────────────────────────────────────────
export type ProductStatus = "ok" | "low" | "out_of_stock" | "discontinued";

// ─────────────────────────────────────────────
// RELATIONS (embedded in product responses)
// ─────────────────────────────────────────────
export interface ProductBrand {
  id: number;
  name: string;
  code: string;
}

export interface ProductDepot {
  id: number;
  name: string;
  code: string;
}

// ─────────────────────────────────────────────
// CORE PRODUCT MODEL
// ─────────────────────────────────────────────
export interface Product {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  minStock: number;
  status: ProductStatus;
  depotId: number;
  brandId: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  brand: ProductBrand;
  depot: ProductDepot;
}

// ─────────────────────────────────────────────
// PRODUCT PERFORMANCE
// ─────────────────────────────────────────────
export interface PerformanceByEmployee {
  employeeId: number;
  employeeName: string;
  quantitySold: number;
  revenue: number;
}

export interface ProductPerformance {
  product: {
    id: number;
    name: string;
    sku: string;
    minStock: number;
    currentStock: number;
  };
  depot: {
    id: number;
    name: string;
  };
  period: {
    year: number;
    month: number;
    monthName: string;
  };
  sales: {
    quantitySold: number;
    revenue: number;
    averagePrice: number;
    byEmployee: PerformanceByEmployee[];
  };
  stock: {
    startOfMonth: number;
    endOfMonth: number;
    soldDuringMonth: number;
  };
}

// ─────────────────────────────────────────────
// LOW STOCK
// ─────────────────────────────────────────────
export interface LowStockProduct {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  minStock: number;
  deficit: number;
  status: ProductStatus;
  depot: ProductDepot;
  brand: Pick<ProductBrand, "id" | "name">;
}

// ─────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedProducts {
  data: Product[];
  pagination: PaginationMeta;
}

// ─────────────────────────────────────────────
// QUERY / FILTER PARAMS
// ─────────────────────────────────────────────
export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  depotId?: number | string;
  brandId?: number | string;
  status?: ProductStatus | string;
  minStockAlert?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─────────────────────────────────────────────
// MUTATIONS – CREATE / UPDATE
// ─────────────────────────────────────────────
export interface CreateProductInput {
  name: string;
  sku?: string;
  quantity?: number;
  minStock?: number;
  depotId: number;
  brandId: number;
  description?: string;
}

export interface UpdateStockInput {
  id: number;
  quantity: number;
  // Must match the backend validator: sale | restock | damage | adjustment | manual
  reason?: "manual" | "sale" | "restock" | "damage" | "adjustment";
  employeeId?: number;
}

export interface UpdateMinStockInput {
  id: number;
  minStock: number;
}


export interface RecordSaleInput {
  productId: number;
  employeeId?: number; // omitted → backend assigns the depot owner
  quantitySold: number;
  saleDate?: string; // ISO date string
  revenue?: number; // total sale amount for KPI revenue tracking
}

export interface RecordSaleResponse {
  product: Product;
  performance: {
    productId: number;
    employeeId: number;
    month: string;
    quantitySold: number;
    revenue: number;
  };
}