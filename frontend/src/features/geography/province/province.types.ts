// src/features/geography/province/province.types.ts
export interface Province {
    id: string;
    name: string;
    code: string;
    districtCount: number;
    depotCount: number;
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt?: string;
}

export interface ProvinceCreateInput {
    name: string;
    code: string;
    status: 'active' | 'inactive';
}

export interface ProvinceUpdateInput {
    id: string;
    name?: string;
    code?: string;
    status?: 'active' | 'inactive';
}

export interface ProvinceFilters {
    search?: string;
    status?: 'active' | 'inactive' | 'all';
}