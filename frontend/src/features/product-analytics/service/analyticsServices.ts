// services/analytics.service.ts
import axios from "../../../api/axios-client";
import { OptionItem, AnalyticsRow } from "../types/analyticsTypes";

export const analyticsService = {
  async getDepots(): Promise<OptionItem[]> {
    const response = await axios.get("analytics/depots");
    return response.data.data;
  },

  async getEmployees(): Promise<OptionItem[]> {
    const response = await axios.get("analytics/employees");
    return response.data.data;
  },

  async getPerformance(params: {
    fromDate: string;
    toDate: string;
    depotId?: string;
    brandId?: string;
    employeeId?: string;
    search?: string;
  }): Promise<AnalyticsRow[]> {
    const response = await axios.get("analytics/performance", { params });
    return response.data.data;
  },
};