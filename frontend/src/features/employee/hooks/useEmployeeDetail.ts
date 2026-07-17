import { useQuery } from "@tanstack/react-query";
import axiosClient from "../../../api/axios-client";
import { Employee, HandledDepot } from "../types/employee.types";

interface EmployeeDetailResponse {
  employee: Employee;
  handledDepots: HandledDepot[];
}

export const useEmployeeDetail = (id?: string) => {
  return useQuery<EmployeeDetailResponse>({
    queryKey: ["employee", id],
    queryFn: async () => {
      if (!id) throw new Error("Employee ID is required");

      const employeeRes = await axiosClient.get(`/employees/${id}`);
      const employee = employeeRes.data.data ?? employeeRes.data;

      const depotsRes = await axiosClient.get(`/employees/${id}/employeeDepotDetails`);
      const rawDepots = depotsRes.data.data ?? depotsRes.data ?? [];

      const handledDepots: HandledDepot[] = (Array.isArray(rawDepots) ? rawDepots : [])
        .filter((d: any) => d?.id != null)
        .map((d: any) => ({
          id: Number(d.id),
          name: d.name ?? "—",
          code: d.code ?? null,
          khmerName: d.khmerName ?? null,
          address: d.address ?? null,
          phone: d.phone ?? null,
          status: d.status ?? "active",
          province: d.province ?? null,
          district: d.district ?? null,
          brandName: d.brandName ?? null,
          brandCode: d.brandCode ?? null,
          assignmentStatus: d.assignmentStatus ?? "assigned",
          coverageStatus: d.coverageStatus ?? "full",
          visitFrequency: d.visitFrequency ?? "—",
          lastVisit: d.lastVisit ?? "—",
          productsManaged: Number(d.productsManaged ?? 0),
          staffCount: Number(d.staffCount ?? 0),
          activeTasks: Number(d.activeTasks ?? 0),
          assignedAt: d.assignedAt ?? null,
          expiryDate: d.expiryDate ?? null,
        }));

      return { employee, handledDepots };
    },
    enabled: !!id,
  });
};
