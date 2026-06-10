import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmployeePaginationProps {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const EmployeePagination: React.FC<EmployeePaginationProps> = ({
  pageIndex,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
}) => {
  const maxPagesToShow = 5;
  const startPage = Math.max(0, Math.min(pageIndex - 2, totalPages - maxPagesToShow));
  const endPage = Math.min(totalPages, startPage + maxPagesToShow);

  const pageNumbers = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);

  return (
    <div className="flex items-center justify-end gap-4">
      {/* Page Size Selector */}
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-zinc-500 dark:text-zinc-400">Show</span>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="w-16 h-8 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="30">30</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[12px] text-zinc-500 dark:text-zinc-400">per page</span>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={pageIndex === 0}
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`h-8 w-8 rounded text-[12px] font-medium transition-colors ${
              page === pageIndex
                ? "bg-blue-600 text-white"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
            aria-label={`Go to page ${page + 1}`}
            aria-current={page === pageIndex ? "page" : undefined}
          >
            {page + 1}
          </button>
        ))}

        <button
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={pageIndex >= totalPages - 1}
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
