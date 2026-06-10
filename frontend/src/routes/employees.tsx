// src/routes/EmployeePage.tsx
import { createFileRoute } from "@tanstack/react-router";
import { EmployeePage } from "../features/employee/pages/EmployeePage";

export const Route = createFileRoute("/employees")({
  component: EmployeeComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      provinceId: search.provinceId as string | undefined,
    };
  },
});

function EmployeeComponent() {
  return <EmployeePage />;
}
