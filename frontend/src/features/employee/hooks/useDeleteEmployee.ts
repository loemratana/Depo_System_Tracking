import { useState } from 'react';
import { employeeApi } from '../services/employee.api';

export const useDeleteEmployee = () => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteEmployee = async (id: number): Promise<boolean> => {
        try {
            setIsDeleting(true);
            setError(null);
            await employeeApi.delete(id);
            return true;
        } catch (err) {
            setError('Failed to delete employee');
            console.error(err);
            return false;
        } finally {
            setIsDeleting(false);
        }
    };

    return { deleteEmployee, isDeleting, error };
};
