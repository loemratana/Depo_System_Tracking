// src/types/geography.ts
export interface Province {
    id: string;
    name: string;
    code: string;
    districtCount: number;
    depotCount: number;
    status: 'active' | 'inactive';
    createdAt: string;
}

export interface District {
    id: string;
    name: string;
    code: string;
    provinceId: string;
    provinceName: string;
    depotCount: number;
    status: 'active' | 'inactive';
    createdAt: string;
}