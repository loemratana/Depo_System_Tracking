// hooks/useAnalyticsPerformance.ts
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../service/analyticsServices";

export const useAnalyticsPerformance = (filters: {
  fromDate: string;
  toDate: string;
  depotId?: string;
  brandId?: string;
  employeeId?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: ["analytics", "performance", filters],
    queryFn: () => analyticsService.getPerformance(filters),
    staleTime: 5 * 60 * 1000,
    enabled: !!filters.fromDate && !!filters.toDate,
  });
};

export const useAnalyticsOptions = () => {
    const depotsQuery = useQuery({
      queryKey: ["analytics", "depots"],
      queryFn: analyticsService.getDepots,
      staleTime: 5 * 60 * 1000,
    });
  
    const employeesQuery = useQuery({
      queryKey: ["analytics", "employees"],
      queryFn: analyticsService.getEmployees,
      staleTime: 5 * 60 * 1000,
    });
  
    return {
      depotOptions: depotsQuery.data ?? [],
      employeeOptions: employeesQuery.data ?? [],
  
      isLoading:
        depotsQuery.isLoading ||
        employeesQuery.isLoading,
  
      isError:
        depotsQuery.isError ||
        employeesQuery.isError,
  
      error:
        depotsQuery.error ||
        employeesQuery.error,
    };
  };