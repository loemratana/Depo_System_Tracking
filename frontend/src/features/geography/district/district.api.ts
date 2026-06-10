import apiClient from '@/api/axios-client';

export const districtApi = {
  getAll: async (params?: { provinceId?: string; search?: string }) => {
    const response = await apiClient.get('/districts', { params });
    return response.data.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/districts/${id}`);
    return response.data.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/districts', data);
    return response.data.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/districts/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/districts/${id}`);
    return response.data;
  },
};