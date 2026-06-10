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

      // Fetch employee basic info
      const employeeRes = await axiosClient.get(`/employees/${id}`);
      const employee = employeeRes.data.data ?? employeeRes.data;

      // Fetch depots handled by this employee
      const depotsRes = await axiosClient.get(`/employees/${id}/employeeDepotDetails`);
      const rawDepots = depotsRes.data.data ?? depotsRes.data ?? [];

      // Map raw depot data to HandledDepot interface
      // Inside useEmployeeDetail.ts
      const handledDepots = rawDepots
        .filter((d: any) => d.depot_id != null) // 🔥 keep only valid IDs
        .map((d: any) => ({
          id: d.depot_id,
          name: d.depot_name ?? null,
          code: d.depot_code ?? null,
          province: d.depot_address ?? null,
          assignmentStatus: d.assignment_status === "active" ? "assigned" : "completed",
          visitFrequency: d.assignment_type ?? null,
          lastVisit: d.start_date ? new Date(d.start_date).toLocaleDateString() : null,
          coverageStatus: "full",
          productsManaged: 0,
          activeTasks: 0,
        }));

      return { employee, handledDepots };
    },
    enabled: !!id,
  });
};
