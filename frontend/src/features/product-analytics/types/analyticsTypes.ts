// types/analyticsTypes.ts

export interface OptionItem {
    id: number;
    name: string;
    districtName?: string | null;
    provinceName?: string | null;
  }
  
  export interface AnalyticsRow {
    id: string;
    productName: string;
    productSku: string;
    employeeName: string;
    depotName: string;
    quantitySold: number;
    previousQuantity?: number;
    revenue?: number;
    growth: number;
  }