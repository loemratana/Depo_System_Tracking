// src/features/geography/district/district.types.ts
export interface District {
  id: string;
  name: string;
  code: string;
  provinceId: string;
  provinceName: string;
  depotCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}

export interface DistrictCreateInput {
  name: string;
  code: string;
  provinceId: string;
  status: 'active' | 'inactive';
}

export interface DistrictUpdateInput extends Partial<DistrictCreateInput> {
  id: string;
}