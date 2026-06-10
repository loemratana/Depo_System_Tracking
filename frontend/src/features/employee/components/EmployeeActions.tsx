import React from 'react';
import { Plus, Layers, Download, FileText, FileSpreadsheet } from 'lucide-react';

interface EmployeeActionsProps {
  onAddClick: () => void;
  onBulkClick: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
}

export const EmployeeActions: React.FC<EmployeeActionsProps> = ({
  onAddClick,
  onBulkClick,
  onExportExcel,
  onExportPDF,
}) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onBulkClick}
        className="
          inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded-md
          border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900
          text-zinc-700 dark:text-zinc-300
          hover:bg-zinc-50 dark:hover:bg-zinc-800
          transition-colors shrink-0 cursor-pointer
        "
      >
        <Layers className="h-3.5 w-3.5 text-zinc-500" />
        Bulk Operations
      </button>

      <button
        onClick={onExportExcel}
        className="
          inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded-md
          border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900
          text-zinc-700 dark:text-zinc-300
          hover:bg-zinc-50 dark:hover:bg-zinc-800
          transition-colors shrink-0 cursor-pointer
        "
      >
        <FileSpreadsheet className="h-3.5 w-3.5 text-zinc-500" />
        Excel
      </button>

      <button
        onClick={onExportPDF}
        className="
          inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded-md
          border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900
          text-zinc-700 dark:text-zinc-300
          hover:bg-zinc-50 dark:hover:bg-zinc-800
          transition-colors shrink-0 cursor-pointer
        "
      >
        <FileText className="h-3.5 w-3.5 text-zinc-500" />
        PDF
      </button>

      <button
        onClick={onAddClick}
        className="
          inline-flex items-center gap-1.5 h-8 px-3.5 text-[12px] font-medium rounded-md
          bg-zinc-900 dark:bg-zinc-100
          text-white dark:text-zinc-900
          hover:bg-zinc-700 dark:hover:bg-zinc-300
          transition-colors shrink-0 cursor-pointer
        "
      >
        <Plus className="h-3.5 w-3.5" />
        Add Employee
      </button>
    </div>
  );
};