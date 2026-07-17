// types/depot.types.ts
export interface Depot {
  id: number;
  code: string;
  name: string;
  khmerName?: string;
  provinceName: string;
  districtName: string;
  employeeName?: string;
  ownerId?: number;
  phone?: string;
  dateOfbirth:string;
  sex?: 'male' | 'female' | 'other';
  address?: string;
  homeNumber?: string;
  street?: string;
  village?: string;
  commune?: string;
  expiryDate?: string; // ISO date string
  status?: string;
  brandId?: number | null;
  brandName?: string;
  note?: string | null;
}
