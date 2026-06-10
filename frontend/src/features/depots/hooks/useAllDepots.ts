import { useQuery } from "@tanstack/react-query";
import { depotService } from "@/services/depot-service";

export const useAllDepots = () => {
  return useQuery({
    queryKey: ["depots", "all"],
    queryFn: () => depotService.getDepots({ page: 1, pageSize: 10000 }), // adjust limit as needed
    staleTime: 5 * 60 * 1000, // consider data fresh for 5 minutes
  });
};
