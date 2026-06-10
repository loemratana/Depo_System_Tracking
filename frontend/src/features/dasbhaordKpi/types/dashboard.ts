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