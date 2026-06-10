import React from 'react';
import { Employee } from '../types/employee.types';
import { Pencil, Eye, Trash2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface EmployeeCardProps {
  employee: Employee;
  onEdit: (emp: Employee) => void;
  onDelete: (id: string) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onEdit, onDelete }) => {
  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {employee.images ? (
            <img src={employee.images} alt="" className="h-10 w-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {(employee.englishName || employee.khmerName || employee.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <Link 
              to="/employees/$id" 
              params={{ id: String(employee.id) }} 
              className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100 leading-tight hover:text-blue-600 dark:hover:text-blue-400"
            >
              {employee.khmerName || employee.englishName || employee.email || 'Unnamed Employee'}
            </Link>
            <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">
              {employee.employeeCode || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link 
            to="/employees/$id" 
            params={{ id: String(employee.id) }} 
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <Eye className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => onEdit(employee)}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(String(employee.id))}
            className="p-1.5 rounded text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Dept</p>
          <p className="text-[12px] text-zinc-700 dark:text-zinc-300">{employee.department || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Position</p>
          <p className="text-[12px] text-zinc-700 dark:text-zinc-300">{employee.position || '—'}</p>
        </div>
        {employee.phone && (
          <div className="col-span-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Phone</p>
            <p className="text-[12px] text-zinc-700 dark:text-zinc-300">{employee.phone}</p>
          </div>
        )}
      </div>
    </div>
  );
};
