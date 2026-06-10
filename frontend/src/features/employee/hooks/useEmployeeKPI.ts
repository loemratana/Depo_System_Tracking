import axios from "../../../api/axios-client.ts";
import { useQuery } from "@tanstack/react-query";
export const useEmployeeKPI = (id?: number) => {
  return useQuery({
    queryKey: ["employee-kpi", id],
    enabled: !!id,
    queryFn: async () => {
      const token = localStorage.getItem("token");

      const res = await axios.get(`/employees/${id}/summary-depots`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return res.data;
    },
  });
};
