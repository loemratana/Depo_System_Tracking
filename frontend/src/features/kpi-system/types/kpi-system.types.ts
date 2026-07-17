export interface KpiSystemSearch {
  search: string;
  depotId: string;
  productId: string;
  fromDate: string;
  toDate: string;
  view: "list" | "matrix";
}

export interface KpiRankingRow {
  id: string;
  employeeId: number;
  employeeName: string;
  targetQty: number;
  actualQty: number;
  actualRevenue: number;
  kpiPercent: number;
  rank: number;
  depotNames?: string[];
}

export interface KpiSummaryData {
  averageKpi: number;
  topPerformer: string;
  employeesAssessed: number;
  aboveTarget: number;
  belowThreshold: number;
}

export interface KpiMatrixRow {
  depotName: string;
  products: Record<string, number>;
}

export interface KpiMatrixData {
  productNames: string[];
  rows: KpiMatrixRow[];
}

export interface KpiFilterOptions {
  depots: {
    id: number;
    name: string;
    districtName?: string | null;
    provinceName?: string | null;
  }[];
  products: { id: number; name: string; sku?: string | null }[];
}

export interface SetKpiTargetInput {
  employeeId: number;
  depotId: number;
  month: string;
  targetQty: number;
}

export interface KpiQueryParams {
  fromDate: string;
  toDate: string;
  search?: string;
  depotId?: string;
  productId?: string;
}
