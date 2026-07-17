// types/dashboard.ts
export interface DashboardData {
    brandDepots: number;
    handlers: number;
    expiredDepots: number;
    user: number;
}
export interface AssignmentTrendItem {
    month: string;   // "Jan", "Feb", ...
    count: number;   // total assignments for that month
}
export interface ApiResponse<T> {
    success: boolean;
    data: T;
}

export interface BrandStat {
    name: string;
    value: number;
}

export interface BrandDistributionItem {
    brandId: number;
    name: string;
    depotCount: number;
    newDepotsMonth: number;
    productQuantity: number;
    stockQuantity: number;
}

export interface BrandDistributionData {
    year: number;
    month: number;
    from: string;
    to: string;
    brands: BrandDistributionItem[];
}