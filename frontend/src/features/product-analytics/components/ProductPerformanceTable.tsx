import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  X,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AnalyticsRow {
  id: string;
  productName: string;
  productSku: string;
  employeeName: string;
  depotName: string;
  quantitySold: number;
  previousQuantity?: number;
  growth: number;
}

interface ProductPerformanceTableProps {
  data: AnalyticsRow[];
  pageSizeOptions?: number[];
  defaultPageSize?: number;
}

const ColumnFilterPopover = ({
  columnId,
  value,
  onChange,
  placeholder = "Filter...",
}: {
  columnId: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) => {
  const [localValue, setLocalValue] = useState(value);

  const handleApply = () => {
    onChange(localValue);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/60"
        >
          <Filter className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Filter {columnId.replace(/([A-Z])/g, " $1").trim()}
          </p>
          <Input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={placeholder}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
          <div className="flex justify-between gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleClear}>
              Clear
            </Button>
            <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const ProductPerformanceTable: React.FC<ProductPerformanceTableProps> = ({
  data,
  pageSizeOptions = [5, 10, 20, 50],
  defaultPageSize = 10,
}) => {
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  const [sorting, setSorting] = useState<any[]>([]);

  // ── Filtered data (client‑side) ──
  const filteredData = useMemo(() => {
    let result = data;

    // Global search
    if (globalFilter) {
      const lower = globalFilter.toLowerCase();
      result = result.filter(
        (row) =>
          row.productName.toLowerCase().includes(lower) ||
          row.productSku.toLowerCase().includes(lower) ||
          row.employeeName.toLowerCase().includes(lower) ||
          row.depotName.toLowerCase().includes(lower)
      );
    }

    // Column filters
    Object.entries(columnFilters).forEach(([key, value]) => {
      if (!value) return;
      const lower = value.toLowerCase();
      result = result.filter((row) =>
        String(row[key as keyof AnalyticsRow]).toLowerCase().includes(lower)
      );
    });

    return result;
  }, [data, globalFilter, columnFilters]);

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const clearAllFilters = () => {
    setGlobalFilter("");
    setColumnFilters({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // ── Table columns ──
  const columns: ColumnDef<AnalyticsRow>[] = [
    {
      accessorKey: "productName",
      header: ({ column }) => (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Product</span>
          <ColumnFilterPopover
            columnId="productName"
            value={columnFilters.productName || ""}
            onChange={(val) => handleColumnFilterChange("productName", val)}
            placeholder="e.g. Cola"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.original.productName}</span>
          <span className="text-[10px] font-mono text-muted-foreground/70">
            {row.original.productSku}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "employeeName",
      header: ({ column }) => (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Employee</span>
          <ColumnFilterPopover
            columnId="employeeName"
            value={columnFilters.employeeName || ""}
            onChange={(val) => handleColumnFilterChange("employeeName", val)}
            placeholder="e.g. Sok"
          />
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground">{row.original.employeeName}</span>
      ),
    },
    {
      accessorKey: "depotName",
      header: ({ column }) => (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Depot</span>
          <ColumnFilterPopover
            columnId="depotName"
            value={columnFilters.depotName || ""}
            onChange={(val) => handleColumnFilterChange("depotName", val)}
            placeholder="e.g. Central"
          />
        </div>
      ),
      cell: ({ row }) => (
        <span className="inline-flex rounded-full bg-sky-600 px-2.5 py-0.5 text-xs font-medium text-white">
          {row.original.depotName}
        </span>
      ),
    },
    {
      accessorKey: "quantitySold",
      header: ({ column }) => (
        <div className="flex items-center justify-end gap-1">
          <span className="text-muted-foreground">Qty Sold</span>
          <ColumnFilterPopover
            columnId="quantitySold"
            value={columnFilters.quantitySold || ""}
            onChange={(val) => handleColumnFilterChange("quantitySold", val)}
            placeholder="e.g. 100"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums font-medium text-foreground">
          {row.original.quantitySold.toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "growth",
      header: () => (
        <div className="text-right text-muted-foreground">Trend</div>
      ),
      cell: ({ row }) => {
        const g = row.original.growth;
        const prev = row.original.previousQuantity;
        const isNew = (prev ?? 0) === 0 && row.original.quantitySold > 0;
        const isPos = g > 0;
        const isNeg = g < 0;
        const Icon = isPos ? TrendingUp : isNeg ? TrendingDown : Minus;
        return (
          <div className="flex flex-col items-end gap-0.5">
            {isNew ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-xs font-semibold text-white">
                <TrendingUp className="h-3.5 w-3.5" />
                New
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums text-white",
                  isPos && "bg-emerald-600",
                  isNeg && "bg-rose-600",
                  !isPos && !isNeg && "bg-slate-500",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {isPos ? "+" : ""}
                {g}%
              </span>
            )}
            {prev !== undefined && !isNew && (
              <span className="text-[10px] tabular-nums text-muted-foreground">
                prev {prev.toLocaleString()} → now {row.original.quantitySold.toLocaleString()}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  // ── TanStack table ──
  const table = useReactTable({
    data: filteredData,
    columns,
    state: { pagination, sorting, globalFilter },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
    pageCount: Math.ceil(filteredData.length / pagination.pageSize),
  });

  // ── Pagination helpers ──
  const totalRows = filteredData.length;
  const firstRow = pagination.pageIndex * pagination.pageSize + 1;
  const lastRow = Math.min(
    (pagination.pageIndex + 1) * pagination.pageSize,
    totalRows
  );
  const currentPage = pagination.pageIndex + 1;
  const totalPages = table.getPageCount();

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No performance data found for the selected period.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearAllFilters} className="h-8 gap-1.5 text-xs">
            <X className="h-3.5 w-3.5" />
            Clear Filters
          </Button>
          {Object.values(columnFilters).some(Boolean) && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white">
              {Object.values(columnFilters).filter(Boolean).length} active
            </span>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Global search..."
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="h-8 w-48 pl-8 text-xs"
          />
          {globalFilter && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setGlobalFilter("");
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-border/60 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="border-b border-border/40 last:border-0"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-2">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            Showing {totalRows === 0 ? 0 : firstRow}–{lastRow} of {totalRows} entries
          </span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px] text-xs">
              <SelectValue placeholder={pagination.pageSize} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 px-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-8 w-8 text-xs",
                  currentPage === page && "bg-blue-600 hover:bg-blue-700",
                )}
                onClick={() => table.setPageIndex(page - 1)}
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(totalPages - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};