import api from "@/api/axios-client";
import { Brand, BrandDepotCount, CreateBrandInput, UpdateBrandInput } from "../types/brand.types";

export const brandService = {
  getAll: (params?: { search?: string; status?: string }) =>
    api.get<Brand[]>("/brands", { params }).then((res) => res.data),
  getAllFilter: (params?: { search?: string; status?: string }) =>
    api.get("/brands", { params }).then((res) => res.data.data),

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
};

