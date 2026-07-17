import { useQuery } from "@tanstack/react-query";
import { depotService } from "@/services/depot-service";

export const useAllDepots = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["depots", "all"],
    queryFn: () => depotService.getDepots({ page: 1, pageSize: 10000 }),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
};
