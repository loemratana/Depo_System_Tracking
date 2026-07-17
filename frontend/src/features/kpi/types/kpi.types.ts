import type { ComponentType } from "react";
import type { KpiAccent } from "@/components/ui-kit";

export interface DepotKpiCounts {
  total: number;
  vacancy: number;
  active: number;
  expired: number;
  expiringSoon: number;
}

export interface BrandSummary {
  brandId: number;
  brandName: string;
  depots: DepotKpiCounts;
  products: {
    total: number;
    lowStock: number;
    outOfStock: number;
  };
  sales: {
    revenue: number;
    unitsSold: number;
    growthPercent: number;
  };
  coveragePercent: number;
}

export interface KpiCardConfig {
  id: string;
  label: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }>;
  hint?: string;
  trend?: "up" | "down" | "flat";
  delta?: string;
  accent?: KpiAccent;
  selected?: boolean;
  onClick?: () => void;
}
