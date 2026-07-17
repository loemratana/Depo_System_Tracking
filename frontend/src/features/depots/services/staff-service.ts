import axiosClient from "@/api/axios-client";

export interface DepotStaff {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  depotId?: number;
}

export interface CreateStaffInput {
  name: string;
  email: string;
  phone?: string;
}

export const staffService = {
  listByDepot: async (depotId: string | number): Promise<DepotStaff[]> => {
    const res = await axiosClient.get(`/depots/${depotId}/staffs`);
    return res.data.data ?? res.data ?? [];
  },

  create: async (depotId: string | number, data: CreateStaffInput): Promise<DepotStaff> => {
    const res = await axiosClient.post(`/depots/${depotId}/staffs`, data);
    return res.data.data ?? res.data;
  },

  update: async (
    depotId: string | number,
    staffId: number,
    data: Partial<CreateStaffInput>,
  ): Promise<DepotStaff> => {
    const res = await axiosClient.patch(`/depots/${depotId}/staffs/${staffId}`, data);
    return res.data.data ?? res.data;
  },

  remove: async (depotId: string | number, staffId: number): Promise<void> => {
    await axiosClient.delete(`/depots/${depotId}/staffs/${staffId}`);
  },
};
