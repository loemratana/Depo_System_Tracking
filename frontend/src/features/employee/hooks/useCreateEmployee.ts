import { useState } from 'react';
import { CreateEmployeeInput, Employee } from '../types/employee.types';
import { employeeApi } from '../services/employee.api';
import axios from 'axios';

export const useCreateEmployee = () => {
  const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createEmployee = async (data: CreateEmployeeInput): Promise<Employee | null> => {
    try {
            setIsCreating(true);
      setError(null);
            const newEmployee = await employeeApi.create(data);
            return newEmployee;
        } catch (err: any) {
            let errorMessage = 'Failed to create employee';
            if (axios.isAxiosError(err)) {
                errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || errorMessage;
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            console.error(err);
            return null;
        } finally {
            setIsCreating(false);
        }
    };

    return { createEmployee, isCreating, error };
};