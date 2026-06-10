import React, { useEffect } from "react";
import { X } from "lucide-react";
import { EmployeeForm } from "../EmployeeForm";
import { useUpdateEmployee } from "../../hooks/useUpdateEmployee";
import { Employee, CreateEmployeeInput } from "../../types/employee.types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface UpdateEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: Employee;
}

export const UpdateEmployeeDialog: React.FC<UpdateEmployeeDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employee,
}) => {
  const { updateEmployee, isUpdating, error } = useUpdateEmployee();

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleFormSubmit = async (data: CreateEmployeeInput) => {
    const result = await updateEmployee(employee.id, data);
    if (result) {
      toast.success("Employee updated successfully");
      onClose();
      onSuccess();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
            className="relative z-10 flex flex-col w-full max-w-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div>
                <h2 className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100">
                  Update Employee
                </h2>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Edit employee profile information
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-[6px] border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-[12px] text-destructive mb-2">
                  <X className="mt-px h-3.5 w-3.5 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                </div>
              )}
              <EmployeeForm
                initialData={employee}
                onSubmit={handleFormSubmit}
                onCancel={onClose}
                submitLabel="Update Employee"
                isSubmitting={isUpdating}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
