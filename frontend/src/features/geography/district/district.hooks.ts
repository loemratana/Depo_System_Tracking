// src/features/geography/district/district.hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { districtApi } from './district.api.ts';
import type { District, DistrictCreateInput, DistrictUpdateInput } from './district.types';

export const districtKeys = {
  all: ['districts'] as const,
  lists: () => [...districtKeys.all, 'list'] as const,
  list: (provinceId?: string) => [...districtKeys.lists(), provinceId] as const,
  details: () => [...districtKeys.all, 'detail'] as const,
  detail: (id: string) => [...districtKeys.details(), id] as const,
};

export const useDistricts = (provinceId?: string, filters?: { search?: string; status?: 'all' | 'active' | 'inactive' }) => {
  return useQuery({
    queryKey: districtKeys.list(provinceId),
    queryFn: async () => {
      const response = await districtApi.getAll({ provinceId });

      const districts = response.map((d: any) => ({
        ...d,
        provinceName: d.provinceName || d.province?.name || '-',
        depotCount: d._count?.depots || 0
      })) as District[];

      let filtered = districts;

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.name.toLowerCase().includes(searchLower) ||
            d.code.toLowerCase().includes(searchLower)
        );
      }

      if (filters?.status && filters.status !== 'all') {
        filtered = filtered.filter((d) => d.status === filters.status);
      }

      return filtered;
    },
  });
};

export const useCreateDistrict = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DistrictCreateInput) => districtApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: districtKeys.list(variables.provinceId) });
      queryClient.invalidateQueries({ queryKey: ['provinces'] }); // Update district count
    },
  });
};

export const useUpdateDistrict = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DistrictUpdateInput }) =>
      districtApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: districtKeys.lists() });
      queryClient.invalidateQueries({ queryKey: districtKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
    },
  });
};

export const useDeleteDistrict = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, provinceId }: { id: string; provinceId: string }) =>
      districtApi.delete(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: districtKeys.list(variables.provinceId) });
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
    },
  });
};