import { useState, useEffect } from "react";
import { Employee } from "../types/employee.types";
import { employeeApi } from "../services/employee.api";

export const useEmployees = (id: string | number) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [handledDepots, setHandledDepots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const [employeeData, depotData] = await Promise.all([
        employeeApi.getById(Number(id)),
        employeeApi.getDepotDetails(Number(id)),
      ]);
      setEmployee(employeeData);
      setHandledDepots(depotData);
      setError(null);
    } catch (err) {
      setError("Failed to load employee details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchEmployee();
    }
  }, [id]);

  return { employee, handledDepots, loading, error, refetch: fetchEmployee };
};
