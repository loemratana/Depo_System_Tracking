// src/features/geography/province/province.hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { provinceApi } from './province.api';
import type { Province, ProvinceCreateInput, ProvinceUpdateInput } from './province.types';

export const provinceKeys = {
  all: ['provinces'] as const,
  lists: () => [...provinceKeys.all, 'list'] as const,
  list: (filters?: { search?: string }) => [...provinceKeys.lists(), filters] as const,
  details: () => [...provinceKeys.all, 'detail'] as const,
  detail: (id: string) => [...provinceKeys.details(), id] as const,
};

export const useProvinces = (filters?: { search?: string }) => {
  return useQuery({
    queryKey: provinceKeys.list(filters),
    queryFn: async () => {
      const provinces = await provinceApi.getAll() as Province[];
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        return provinces.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            p.code.toLowerCase().includes(searchLower)
        );
      }
      return provinces;
    },
  });
};

export const useCreateProvince = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ProvinceCreateInput) => provinceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: provinceKeys.lists() });
    },
  });
};

export const useUpdateProvince = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProvinceUpdateInput }) =>
      provinceApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: provinceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: provinceKeys.detail(variables.id) });
    },
  });
};

export const useDeleteProvince = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => provinceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: provinceKeys.lists() });
    },
  });
};