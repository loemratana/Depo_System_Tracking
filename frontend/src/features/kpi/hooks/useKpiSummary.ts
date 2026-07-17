import { useQuery } from "@tanstack/react-query";
import { kpiService } from "../services/kpiService";

export const useDepotKpiSummary = (params?: {
  brandId?: number;
  brandIds?: number[];
  enabled?: boolean;
}) => {
  const hasBrandFilter = !!(params?.brandId || params?.brandIds?.length);

  return useQuery({
    queryKey: ["kpi", "depot-summary", params?.brandId, params?.brandIds],
    queryFn: () =>
      hasBrandFilter
        ? kpiService.getDepotSummary({
            brandId: params?.brandId,
            brandIds: params?.brandIds,
          })
        : kpiService.getDepotCounts(),
    staleTime: 5 * 60 * 1000,
    enabled: params?.enabled !== false,
  });
};

export const useBrandKpiSummary = (brandId?: number) => {
  return useQuery({
    queryKey: ["kpi", "brand-summary", brandId],
    queryFn: () => kpiService.getBrandSummary(brandId!),
    enabled: !!brandId,
    staleTime: 5 * 60 * 1000,
  });
};
