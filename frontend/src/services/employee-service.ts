import axiosClient from "@/api/axios-client";

export const employeeService = {
  getEmployees: async (params?: any) => {
    const { pageSize, ...rest } = params || {};
    const response = await axiosClient.get("/employees", { 
      params: { ...rest, limit: pageSize ?? 1000 }
    });
    return response.data;
  },
};
