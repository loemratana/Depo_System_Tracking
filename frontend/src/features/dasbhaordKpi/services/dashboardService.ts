// services/dashboardService.ts
import {
    ApiResponse,
    DashboardData,
    AssignmentTrendItem,
    BrandDistributionData,
} from '@/features/dasbhaordKpi/types/dashboard';
import axiosClient from '../../../api/axios-client';

export async function fetchDashboardData(): Promise<DashboardData> {
    const response = await axiosClient.get(`/report/dashboard`);
    const json: ApiResponse<DashboardData> = await response.data;
    if (!json.success) {
        throw new Error('API returned success: false');
    }
    return json.data;
}

export async function fetchAssignmentTrend(): Promise<AssignmentTrendItem[]> {
    const response = await axiosClient.get(`/report/assignment-trend`);
    const json: ApiResponse<AssignmentTrendItem[]> = response.data;
    if (!json.success) throw new Error('API returned success: false');
    return json.data;
}

export async function fetchBrandDistribution(
    year: number,
    month: number
): Promise<BrandDistributionData> {
    const response = await axiosClient.get(`/report/brand-distribution`, {
        params: { year, month },
    });
    const json: ApiResponse<BrandDistributionData> = response.data;
    if (!json.success) throw new Error('API returned success: false');
    return json.data;
}
