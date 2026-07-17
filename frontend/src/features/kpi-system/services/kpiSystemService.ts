import axiosClient from "@/api/axios-client";
import type {
  KpiFilterOptions,
  KpiMatrixData,
  KpiQueryParams,
  KpiRankingRow,
  KpiSummaryData,
  SetKpiTargetInput,
} from "../types/kpi-system.types";

function buildParams(params: KpiQueryParams) {
  const query: Record<string, string> = {
    fromDate: params.fromDate,
    toDate: params.toDate,
  };
  if (params.search?.trim()) query.search = params.search.trim();
  if (params.depotId && params.depotId !== "all") query.depotId = params.depotId;
  if (params.productId && params.productId !== "all") query.productId = params.productId;
  return query;
}

export const kpiSystemService = {
  getRankings: async (params: KpiQueryParams) => {
    const res = await axiosClient.get<{ success: boolean; data: KpiRankingRow[] }>("/kpis", {
      params: buildParams(params),
    });
    return res.data.data;
  },

  getSummary: async (params: KpiQueryParams) => {
    const res = await axiosClient.get<{ success: boolean; data: KpiSummaryData }>("/kpis/summary", {
      params: buildParams(params),
    });
    return res.data.data;
  },

  getMatrix: async (params: KpiQueryParams) => {
    const res = await axiosClient.get<{ success: boolean; data: KpiMatrixData }>("/kpis/matrix", {
      params: buildParams(params),
    });
    return res.data.data;
  },

  getFilterOptions: async () => {
    const res = await axiosClient.get<{ success: boolean; data: KpiFilterOptions }>("/kpis/options");
    return res.data.data;
  },

  setTarget: async (payload: SetKpiTargetInput) => {
    const res = await axiosClient.post("/kpis/targets", payload);
    return res.data;
  },
};
