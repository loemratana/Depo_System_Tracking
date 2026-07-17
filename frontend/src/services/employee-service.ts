import axiosClient from "@/api/axios-client";

export const employeeService = {
  getEmployees: async (params?: any) => {
    const { pageSize, ...rest } = params || {};
    const response = await axiosClient.get("/employees", {
      params: { ...rest, limit: pageSize ?? 1000 },
    });
    return response.data;
  },

  getEmployeeById: async (id: number | string) => {
    const response = await axiosClient.get(`/employees/${id}`);
    return response.data.data ?? response.data;
  },

  updateEmployee: async (id: number | string, data: any) => {
    const response = await axiosClient.put(`/employees/${id}`, data);
    return response.data.data ?? response.data;
  },

  /** Assign employee to a depot (sets depot.employeeId) */
  assignDepot: async (employeeId: number | string, depotId: number) => {
    const response = await axiosClient.patch(`/depots/${depotId}`, {
      employeeId: Number(employeeId),
    });
    return response.data.data ?? response.data;
  },

  /** Remove employee from a depot */
  unassignDepot: async (depotId: number) => {
    const response = await axiosClient.patch(`/depots/${depotId}`, {
      employeeId: null,
    });
    return response.data.data ?? response.data;
  },
};
