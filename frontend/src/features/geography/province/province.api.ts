// src/features/geography/province/province.api.ts
import apiClient from '@/api/axios-client';

export const provinceApi = {
    getAll: async () => {
        const response = await apiClient.get('/provinces');
        return response.data.data;
    },


    getById: async (id: string) => {
        const response = await apiClient.get(`/provinces/${id}`);
        return response.data;
    },

    create: async (data: any) => {
        const response = await apiClient.post('/provinces', data);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await apiClient.put(`/provinces/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete(`/provinces/${id}`);
        return response.data;
    },
};

// Mock implementation for now
export const mockProvinceApi = {
    getAll: async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return [
            { id: '1', name: 'Ontario', code: 'ON', districtCount: 42, depotCount: 18, status: 'active', createdAt: '2023-01-15' },
            { id: '2', name: 'Quebec', code: 'QC', districtCount: 35, depotCount: 12, status: 'active', createdAt: '2023-02-20' },
            { id: '3', name: 'British Columbia', code: 'BC', districtCount: 28, depotCount: 9, status: 'inactive', createdAt: '2023-03-10' },
            { id: '4', name: 'Alberta', code: 'AB', districtCount: 31, depotCount: 11, status: 'active', createdAt: '2023-04-05' },
            { id: '5', name: 'Manitoba', code: 'MB', districtCount: 19, depotCount: 5, status: 'inactive', createdAt: '2023-05-12' },
        ];
    },

    create: async (data: any) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            id: Math.random().toString(),
            ...data,
            districtCount: 0,
            depotCount: 0,
            createdAt: new Date().toISOString().split('T')[0],
        };
    },

    update: async (id: string, data: any) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { id, ...data, updatedAt: new Date().toISOString().split('T')[0] };
    },

    delete: async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true };
    },
};