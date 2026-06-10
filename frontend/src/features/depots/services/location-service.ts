// src/services/location-service.ts
import api from "../../../api/axios-client";

export const locationService = {
  // Fetch all provinces
  getProvinces: async () => {
    const response = await api.get("/provinces", { params: { limit: 1000 } });
    return response.data;
  },

  // Fetch districts, optionally filtered by provinceId
  getDistricts: async (provinceId?: number) => {
    const params: Record<string, any> = { limit: 1000 };
    if (provinceId) params.provinceId = provinceId;
    const response = await api.get("/districts", { params });
    return response.data;
  },
};
