import axiosClient from '../../../api/axios-client';
import { Employee, CreateEmployeeInput } from '../types/employee.types';

export const employeeApi = {
    // In employee.api.ts
async getAll(params?: { page?: number; limit?: number }): Promise<Employee[]> {
    const response = await axiosClient.get('/employees', { params });
    return response.data.employees || [];
},
    async getById(id: string | number): Promise<Employee> {
        const response = await axiosClient.get(`/employees/${id}`);
        return response.data.data;
    },

    async getDepotDetails(id: string | number): Promise<any[]> {
        const response = await axiosClient.get(`/employees/${id}/employeeDepotDetails`);
        return response.data.data;
    },

    async create(data: CreateEmployeeInput): Promise<Employee> {
        const response = await axiosClient.post('/employees', data);
        return response.data.data;
    },

    async update(id: number, data: Partial<Employee>): Promise<Employee> {
        const response = await axiosClient.put(`/employees/${id}`, data);
        return response.data.data;
    },

    async delete(id: number): Promise<void> {
        await axiosClient.delete(`/employees/${id}`);
    },

    async getDepartments(): Promise<string[]> {
        const response = await axiosClient.get('/employees/departments');
        return response.data.data;
    },

    async uploadProfileImage(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('image', file);
        const response = await axiosClient.post('/upload/profile', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.url;
    }
};