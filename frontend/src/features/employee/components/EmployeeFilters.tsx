import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface EmployeeFiltersProps {
  onSearch: (query: string) => void;
  onDepartmentFilter: (dept: string) => void;
  departments: string[];
  total: number;
  filtered: number;
}

export const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({
  onSearch,
  onDepartmentFilter,
  departments,
  total,
  filtered,
}) => {
  return (
    <div className="flex items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search name or ID…"
          onChange={e => onSearch(e.target.value)}
          className="
            w-full h-8 pl-8 pr-3 text-[12px] rounded-md border
            bg-white dark:bg-zinc-900
            border-zinc-200 dark:border-zinc-700
            text-zinc-800 dark:text-zinc-200
            placeholder-zinc-400 dark:placeholder-zinc-600
            focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500
            transition-shadow
          "
        />
      </div>

      {/* Department filter */}
      {departments.length > 0 && (
        <div className="relative">
          <SlidersHorizontal className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <select
            onChange={e => onDepartmentFilter(e.target.value)}
            className="
              h-8 pl-8 pr-8 text-[12px] rounded-md border appearance-none cursor-pointer
              bg-white dark:bg-zinc-900
              border-zinc-200 dark:border-zinc-700
              text-zinc-700 dark:text-zinc-300
              focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500
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

      {/* Count */}
      <span className="ml-auto text-[11px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
        {filtered} of {total}
      </span>
    </div>
  );
};