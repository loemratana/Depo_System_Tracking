import { useQuery } from "@tanstack/react-query";
import { Employee } from "../types/employee.types";
import axiosClient from "../../../api/axios-client";

interface UseEmployeesParams {
  page: number; // 1‑based page number
  limit: number;
  search?: string;
  department?: string;
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
  const { data, isLoading, error, refetch } = useQuery<EmployeesResponse>({
    queryKey: ["employees", params],
    queryFn: async () => {
      const response = await axiosClient.get("/employees", { params });
      // Adjust according to your actual API response structure
      return {
        employees: response.data.employees || response.data.data || [],
        pagination: response.data.pagination || {
          page: params.page,
          limit: params.limit,
          total: 0,
          pages: 0,
        },
      };
    },
  });

  return {
    employees: data?.employees ?? [],
    loading: isLoading,
    error: error?.message || null,
    total: data?.pagination.total ?? 0,
    totalPages: data?.pagination.pages ?? 0,
    refetch,
  };
};
