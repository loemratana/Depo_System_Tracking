import api from "@/api/axios-client";
import { AssignedDepot, Brand, BrandDepotCount, CreateBrandInput, UpdateBrandInput } from "../types/brand.types";

export const brandService = {
  getAll: (params?: { search?: string; status?: string }) =>
    api.get<Brand[]>("/brands", { params }).then((res) => res.data),
  getAllFilter: (params?: { search?: string; status?: string }) =>
    api.get("/brands", { params }).then((res) => res.data.data),


  getDepotsByBrand: async (brandId: number): Promise<AssignedDepot[]> => {
    const response = await api.get(`/brands/${brandId}/depotsByDepots`);
    // API returns { success: true, data: [...] }
    const rawData = response.data?.data ?? [];
    
    if (!Array.isArray(rawData)) return [];
    
    // Map to AssignedDepot interface (province → region)
    return rawData.map((item: any) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      district: item.district,
      region: item.province,   // ← province becomes region
      status: item.status ?? 'active', // default if missing
    }));
  },

  getById: (id: number) => api.get(`/brands/${id}`).then((res) => res.data.data),
  create: (data: CreateBrandInput) => api.post<Brand>("/brands", data).then((res) => res.data),

  update: (input: UpdateBrandInput) => {
    const { id, ...data } = input;
    if (!id || isNaN(Number(id))) {
      throw new Error("Invalid brand ID");
    }
    return api.patch<Brand>(`/brands/${Number(id)}`, data).then((res) => res.data);
  },

  delete: (id: number) => api.delete(`/brands/${id}`).then((res) => res.data),
  getDepotCountById: (id: number) =>
    api.get<BrandDepotCount>(`/brands/${id}/depots`).then((res) => res.data),

  // /** Fetch all depots assigned to a brand */
  // getDepotsByBrand: async (brandId: number): Promise<AssignedDepot[]> => {
  //   const response = await api.get(`/brands/${brandId}/depots`);
  //   // API returns { data: [...], total_depots: N, ... } — extract the depot array
  //   const payload = response.data;
  //   return payload.depots ?? payload.data ?? payload ?? [];
  // },
};
