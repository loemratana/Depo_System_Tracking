// hooks/useBrands.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { brandService } from "../services/brandService.ts";
import { toast } from "sonner";
import type { CreateBrandInput, UpdateBrandInput } from "../types/brand.types";

// Query hook – fetches brands from backend
export const useBrands = (search?: string, status?: string) => {
  return useQuery({
    queryKey: ["brands", search, status],
    queryFn: async () => {
      const result = await brandService.getAll({ search, status });
      console.log("Brands API result:", result);
      return result;
    },
    staleTime:5 *60 *10000,
  });
};

// Mutation: create
export const useCreateBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBrandInput) => brandService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand created successfully");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to create brand"),
  });
};

// Mutation: update
export const useUpdateBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBrandInput) => brandService.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand updated successfully");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update brand"),
  });
};

// Mutation: delete
export const useDeleteBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => brandService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand deleted successfully");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to delete brand"),
  });
};

export const useArchiveBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number }) => brandService.update(id, { status: "inactive" }),

    onSuccess: (data) => {
      console.log("Archive success:", data);
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand archived");
    },

    onError: (error) => {
      console.error("Archive failed:", error);
      toast.error("Archive failed");
    },
  });
};

export const useBrandDepotCount = (brandId?: number) => {
  return useQuery({
    queryKey: ["brand-depot-count", brandId],
    queryFn: () => brandService.getDepotCountById(brandId!),
    enabled: !!brandId, // only run when id exists
  });
};
