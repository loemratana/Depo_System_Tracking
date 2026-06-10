// types/depot.types.ts
export interface Depot {
  id: string;
  name: string;
  code?: string;
  // ... other fields as per your API
}
// types/depot.types.ts
export interface Depot {
  id: number;
  code: string;
  name: string;
  provinceName: string;
  districtName: string;
  employeeName?: string;
  ownerId?: number;
  phone?: string;
  address?: string;
  homeNumber?: string;
  street?: string;
  village?: string;
  commune?: string;
  expiryDate?: string; // ISO date string
  status?: string;
  brandId?: number | null;  
  brandName?: string;
}
