import api from "@/api/axios-client";
import type { BrandSummary, DepotKpiCounts } from "../types/kpi.types";

export const kpiService = {
  getDepotSummary: (params?: { brandId?: number; brandIds?: number[] }) => {
    const query: Record<string, string> = {};
    if (params?.brandId) query.brandId = String(params.brandId);
    if (params?.brandIds?.length) query.brandIds = params.brandIds.join(",");
    return api
      .get<{ success: boolean; data: DepotKpiCounts }>("/depots/summary", { params: query })
      .then((res) => res.data.data);
  },

  getDepotCounts: () =>
    api
      .get<{ success: boolean; data: DepotKpiCounts }>("/depots/counts")
      .then((res) => res.data.data),

  getBrandSummary: (brandId: number) =>
    api
      .get<{ success: boolean; data: BrandSummary }>(`/brands/${brandId}/summary`)
      .then((res) => res.data.data),
};
