// hooks/useDashboard.ts
import { useEffect, useState } from 'react';
import { DashboardData, AssignmentTrendItem } from '../types/dashboard';
import { fetchDashboardData, fetchAssignmentTrend } from '../services/dashboardService';

interface UseDashboardResult {
    data: DashboardData | null;
    assignmentTrend: AssignmentTrendItem[];
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

export function useDashboard(): UseDashboardResult {
    const [data, setData] = useState<DashboardData | null>(null);
    const [assignmentTrend, setAssignmentTrend] = useState<AssignmentTrendItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [kpiResult, trendResult] = await Promise.all([
                fetchDashboardData(),
                fetchAssignmentTrend(),
            ]);
            setData(kpiResult);
            setAssignmentTrend(trendResult);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return { data, assignmentTrend, loading, error, refetch: fetchData };
}