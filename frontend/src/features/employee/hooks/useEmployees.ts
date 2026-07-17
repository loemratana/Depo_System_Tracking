import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Employee } from "../types/employee.types";
import axiosClient from "../../../api/axios-client";

interface UseEmployeesParams {
  page: number; // 1‑based page number
  limit: number;
  search?: string;
  department?: string;
  enabled?: boolean;
}

interface EmployeesResponse {
  employees: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const useEmployees = (params: UseEmployeesParams) => {
  const { enabled = true, ...queryParams } = params;
  const { data, isLoading, isFetching, error, refetch } = useQuery<EmployeesResponse>({
    queryKey: ["employees", queryParams],
    queryFn: async () => {
      const response = await axiosClient.get("/employees", { params: queryParams });
      // Adjust according to your actual API response structure
      return {
        employees: response.data.employees || response.data.data || [],
        pagination: response.data.pagination || {
          page: queryParams.page,
          limit: queryParams.limit,
          total: 0,
          pages: 0,
        },
      };
    },
    enabled,
    placeholderData: keepPreviousData,
  });

  return {
    employees: data?.employees ?? [],
    loading: isLoading,
    isFetching,
    error: error?.message || null,
    total: data?.pagination.total ?? 0,
    totalPages: data?.pagination.pages ?? 0,
    refetch,
  };
};
