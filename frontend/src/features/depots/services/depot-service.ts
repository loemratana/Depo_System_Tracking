// services/depot-service.ts
import api from "@/api/axios-client";
import { Depot } from "@/features/depots/types/depot.types.ts"; // adjust path

export const depotService = {
  updateDepot: (id: number, data: Partial<Depot>) => api.patch(`/depots/${id}`, data),
  getUnassignment: () => api.get(`/unassigned`),
  getDepotReport: (params?: { fromDate?: string; toDate?: string; groupBy?: string }) =>
    api
      .get<{
        success: boolean;
        data?: Depot[];
        grouped?: Record<string, Depot[]>;
        summary: any;
      }>("/depots/report", { params })
      .then((res) => res.data),
  getDepots: (params?: { page?: number; pageSize?: number }) =>
    api.get("/depots", { params }).then((res) => res.data),
  exportDepotReport: (format: "pdf" | "excel", params?: { fromDate?: string; toDate?: string; status?: string }) =>
    api.get("/depots/report", {
      params: { ...params, format },
      responseType: "blob",
    }),
};
