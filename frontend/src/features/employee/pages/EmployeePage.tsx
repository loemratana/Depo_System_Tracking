import React, { useState, useMemo } from "react";
import { EmployeeTable } from "../components/EmployeeTable";
import { EmployeeCard } from "../components/EmployeeCard";
import { EmployeeFilters } from "../components/EmployeeFilters";
import { EmployeeActions } from "../components/EmployeeActions";
import { EmployeePagination } from "../components/EmployeePagination";
import { CreateEmployeeDialog } from "../components/dialogs/CreateEmployeeDialog";
import { UpdateEmployeeDialog } from "../components/dialogs/UpdateEmployeeDialog";
import { DeleteEmployeeDialog } from "../components/dialogs/DeleteEmployeeDialog";
import { useEmployees } from "../hooks/useEmployees";
import { Employee } from "../types/employee.types";
import { BulkOperationsPage } from "../../bulk-operations/pages/BulkOperationsPage";
import { exportEmployeesToExcel, exportEmployeesToPDF } from '@/utils/employeeExportUtils';
import { toast } from "sonner";
export const EmployeePage: React.FC = () => {
  const [showBulkOps, setShowBulkOps] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0); // 0‑based for UI
  const [pageSize, setPageSize] = useState(10);
  // Fetch current page from API
  const { employees, loading, error, total, totalPages, refetch } = useEmployees({
    page: pageIndex + 1, // convert to 1‑based for API
    limit: pageSize,
    search: searchQuery,
    department: departmentFilter,
  });
  // Departments (from current page – optional; you may want a separate endpoint)
  const departments = useMemo(() => {
    const depts = new Set(employees.map((emp) => emp.department).filter(Boolean));
    return Array.from(depts);
  }, [employees]);
  const handleEdit = (emp: Employee) => setEditingEmployee(emp);
  const handleDelete = (id: string) => {
    const emp = employees.find((e) => String(e.id) === id);
    if (emp) setDeletingEmployee(emp);
  };
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPageIndex(0);
  };
  const handleDepartmentFilter = (dept: string) => {
    setDepartmentFilter(dept);
    setPageIndex(0);
  };
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPageIndex(0);
  };
  const handleSuccess = () => {
    setPageIndex(0);
    refetch();
  };
  const handleExportExcel = () => {
    if (!employees.length) {
      toast.info('No employees to export');
      return;
    }
    exportEmployeesToExcel(employees, `employees_${new Date().toISOString().slice(0,19)}`);
    toast.success('Excel export started');
  };
  
  const handleExportPDF = () => {
    if (!employees.length) return;
    exportEmployeesToPDF(employees, 'Employees Report', false); // set true to group by department
    toast.success('PDF export started');
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800" />
          <p className="text-[12px] font-medium text-zinc-500">Loading records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
        <p className="text-[13px] text-red-500">{error}</p>
      </div>
    );
  }

  if (showBulkOps) {
    return (
      <BulkOperationsPage
        onBack={() => setShowBulkOps(false)}
        onImportSuccess={() => {
          handleSuccess();
          setShowBulkOps(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-zinc-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[16px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Employee Directory
            </h1>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wider font-medium">
              Field Operations Personnel
            </p>
          </div>
          <EmployeeActions
            onAddClick={() => setIsCreateDialogOpen(true)}
            onBulkClick={() => setShowBulkOps(true)}
            onExportExcel={() => exportEmployeesToExcel(employees)}
            onExportPDF={() => exportEmployeesToPDF(employees)}
          />
        </div>

        <div className="mt-6">
          <EmployeeFilters
            onSearch={handleSearch}
            onDepartmentFilter={handleDepartmentFilter}
            departments={departments}
            total={total}
            filtered={employees.length}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Desktop Table */}
        <div className="hidden md:block">
          <EmployeeTable employees={employees} onEdit={handleEdit} onDelete={handleDelete} />
        </div>

        {/* Mobile Cards */}
        <div className="grid grid-cols-1 gap-3 md:hidden pb-10">
          {employees.length > 0 ? (
            employees.map((emp) => (
              <EmployeeCard
                key={emp.id}
                employee={emp}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <div className="py-20 text-center border border-dashed rounded-lg">
              <p className="text-[13px] text-zinc-400">No records found matching filters.</p>
            </div>
          )}
        </div>

        {/* Pagination (only show if there is data) */}
        {total > 0 && (
          <div className="mt-6 flex items-center justify-between pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <div className="text-[12px] text-zinc-500 dark:text-zinc-400">
              Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, total)} of{" "}
              {total} results
            </div>
            <EmployeePagination
              pageIndex={pageIndex}
              pageSize={pageSize}
              totalCount={total}
              totalPages={totalPages}
              onPageChange={setPageIndex}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateEmployeeDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleSuccess}
      />
      {editingEmployee && (
        <UpdateEmployeeDialog
          isOpen={!!editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSuccess={handleSuccess}
          employee={editingEmployee}
        />
      )}
      {deletingEmployee && (
        <DeleteEmployeeDialog
          isOpen={!!deletingEmployee}
          onClose={() => setDeletingEmployee(null)}
          onSuccess={handleSuccess}
          employee={deletingEmployee}
        />
      )}
    </div>
  );
};
