// types/analyticsTypes.ts

export interface OptionItem {
    id: number;
    name: string;
  }
  
  export interface AnalyticsRow {
    id: string;
    productName: string;
    productSku: string;
    employeeName: string;
    depotName: string;
    quantitySold: number;
    revenue: number;
    growth: number;
  }