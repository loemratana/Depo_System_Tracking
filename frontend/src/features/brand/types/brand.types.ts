export type BrandStatus = "active" | "inactive" | "archived";

export interface Brand {
  id: number;
  name: string;
  code: string;
  description: string;
  status: BrandStatus;
  createdAt: string;
  logoUrl?: string;
}

export interface CreateBrandInput {
  name: string;
  code: string;
  description: string;
  status: BrandStatus;
  logoUrl?: string;
}

export interface UpdateBrandInput {
  id: number;
  name?: string;
  code?: string;
  description?: string;
  status?: BrandStatus;
  logoUrl?: string;
}

export interface AssignedProduct {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  status: "available" | "out_of_stock" | "discontinued";
}

export interface AssignedDepot {
  id: number;
  name: string;
  code: string;
  region: string;
  district: string;
  status: "active" | "inactive";
}

export interface BrandActivityLog {
  id: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details?: string;
}


export interface BrandDepotCount {
  brand_id: number;
  brand_name: string;
  total_depots: number;
}


export interface AssignedDepot {
  id: number;
  name: string;
  code: string;
  region: string;
  district: string;
  status: "active" | "inactive";
}