// hooks/useUpdateDepot.ts
import { useState } from 'react';
import axios from '@/api/axios-client';
import { Depot } from '@/types/depot.types';

export function useUpdateDepot() {
    const [isUpdating, setIsUpdating] = useState(false);

    const updateDepot = async (id: number, data: Partial<Depot>): Promise<boolean> => {
        setIsUpdating(true);
        try {
            await axios.patch(`/depots/${id}`, data);
            return true;
        } catch (error) {
            console.error('Failed to update depot:', error);
            return false;
        } finally {
            setIsUpdating(false);
        }
    };

    return { updateDepot, isUpdating };
}