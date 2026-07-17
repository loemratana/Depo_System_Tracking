import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { kpiSystemService } from "../services/kpiSystemService";
import type { KpiQueryParams, SetKpiTargetInput } from "../types/kpi-system.types";

export function useKpiFilterOptions() {
  return useQuery({
    queryKey: ["kpi-system", "options"],
    queryFn: () => kpiSystemService.getFilterOptions(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useKpiRankings(params: KpiQueryParams, enabled = true) {
  return useQuery({
    queryKey: ["kpi-system", "rankings", params],
    queryFn: () => kpiSystemService.getRankings(params),
    enabled: enabled && !!params.fromDate && !!params.toDate,
    staleTime: 60 * 1000,
  });
}

export function useKpiSummary(params: KpiQueryParams, enabled = true) {
  return useQuery({
    queryKey: ["kpi-system", "summary", params],
    queryFn: () => kpiSystemService.getSummary(params),
    enabled: enabled && !!params.fromDate && !!params.toDate,
    staleTime: 60 * 1000,
  });
}

export function useKpiMatrix(params: KpiQueryParams, enabled = true) {
  return useQuery({
    queryKey: ["kpi-system", "matrix", params],
    queryFn: () => kpiSystemService.getMatrix(params),
    enabled: enabled && !!params.fromDate && !!params.toDate,
    staleTime: 60 * 1000,
  });
}

export function useSetKpiTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SetKpiTargetInput) => kpiSystemService.setTarget(payload),
    onSuccess: () => {
      toast.success("KPI target saved");
      queryClient.invalidateQueries({ queryKey: ["kpi-system"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save KPI target");
    },
  });
}
