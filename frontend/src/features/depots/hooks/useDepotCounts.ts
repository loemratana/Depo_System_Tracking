// src/features/depots/hooks/useDepotCounts.ts
import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../../api/axios-client';

interface DepotCounts {
  total: number;
  vacancy: number;
  active: number;
  expired: number;
  expiringSoon: number;
}

export const useDepotCounts = () => {
  return useQuery<DepotCounts>({
    queryKey: ['depotCounts'],
    queryFn: async () => {
      const response = await axiosClient.get('/depots/counts');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};