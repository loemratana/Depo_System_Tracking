import axiosClient from "@/api/axios-client";

export const depotService = {
  getDepots: async (params?: any) => {
    const response = await axiosClient.get("/depots", { params });
    return response.data;
  },

  createDepot: async (data: any) => {
    const response = await axiosClient.post("/depots", data);
    return response.data;
  },

  getDepotById: async (id: string | number) => {
    const response = await axiosClient.get(`/depots/${id}`);
    return response.data;
  },

  updateDepot: async (id: string | number, data: any) => {
    const response = await axiosClient.put(`/depots/${id}`, data);
    return response.data;
  },

  deleteDepot: async (id: string | number) => {
    const response = await axiosClient.delete(`/depots/${id}`);
    return response.data;
  },

  getDepotReport: async (params?: any) => {
    const response = await axiosClient.get("/depots/report", { params });
    return response.data;
  },
};
