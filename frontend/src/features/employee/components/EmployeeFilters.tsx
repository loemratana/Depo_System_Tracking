import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface EmployeeFiltersProps {
  onSearch: (query: string) => void;
  onDepartmentFilter: (dept: string) => void;
  departments: string[];
  total: number;
  filtered: number;
  fromDate: string;
  toDate: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
}

export const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({
  onSearch,
  onDepartmentFilter,
  departments,
  total,
  filtered,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search name or ID…"
          onChange={e => onSearch(e.target.value)}
          className="
            w-full h-9 pl-9 pr-3 text-[13px] rounded-md border
            bg-white dark:bg-zinc-900
            border-zinc-200 dark:border-zinc-700
            text-zinc-800 dark:text-zinc-200
            placeholder-zinc-400 dark:placeholder-zinc-600
            focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500
            transition-shadow
          "
        />
      </div>

      {/* Department filter */}
      {departments.length > 0 && (
        <div className="relative">
          <SlidersHorizontal className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <select
            onChange={e => onDepartmentFilter(e.target.value)}
            className="
              h-9 pl-9 pr-8 text-[13px] rounded-md border appearance-none cursor-pointer
              bg-white dark:bg-zinc-900
              border-zinc-200 dark:border-zinc-700
              text-zinc-700 dark:text-zinc-300
              focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500
              transition-shadow
            "
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-1.5 h-9">
        <span className="text-[12px] font-medium text-zinc-500">From:</span>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => onFromDateChange(e.target.value)}
          className="w-[110px] text-[13px] bg-transparent border-0 p-0 text-zinc-700 dark:text-zinc-300 focus:ring-0"
        />
        <span className="text-[12px] font-medium text-zinc-500 ml-1">To:</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => onToDateChange(e.target.value)}
          className="w-[110px] text-[13px] bg-transparent border-0 p-0 text-zinc-700 dark:text-zinc-300 focus:ring-0"
        />
      </div>

      {/* Count */}
      <span className="ml-auto text-[12px] font-medium text-zinc-400 dark:text-zinc-500 whitespace-nowrap hidden md:block">
        Showing {filtered} of {total} employees
      </span>
    </div>
  );
};