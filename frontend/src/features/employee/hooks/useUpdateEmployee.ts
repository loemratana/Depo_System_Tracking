import { useState } from 'react';
import { Employee } from '../types/employee.types';
import { employeeApi } from '../services/employee.api';
import axios from 'axios';

export const useUpdateEmployee = () => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateEmployee = async (id: number, data: Partial<Employee>): Promise<Employee | null> => {
        try {
            setIsUpdating(true);
            setError(null);
            const updatedEmployee = await employeeApi.update(id, data);
            return updatedEmployee;
        } catch (err: any) {
            let errorMessage = 'Failed to update employee';
            if (axios.isAxiosError(err)) {
                errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || errorMessage;
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            console.error(err);
            return null;
        } finally {
            setIsUpdating(false);
        }
    };

    return { updateEmployee, isUpdating, error };
};