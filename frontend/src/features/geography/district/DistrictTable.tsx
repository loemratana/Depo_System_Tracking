import React, { useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  OnChangeFn,
  RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface District {
  id: string;
  name: string;
  provinceName: string;
  createdAt: string;
}

interface DistrictTableProps {
  districts: District[];
  isLoading: boolean;
  onEditDistrict: (district: District) => void;
  onDeleteDistrict: (district: District) => void;
  onBulkSelect?: (selectedIds: string[]) => void;
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const SkeletonRow: React.FC<{ hasBulkSelect: boolean }> = ({ hasBulkSelect }) => (
  <TableRow>
    {hasBulkSelect && (
      <TableCell className="w-12">
        <Skeleton className="h-4 w-4" />
      </TableCell>
    )}
    <TableCell className="py-3 px-4">
      <Skeleton className="h-4 w-32" />
    </TableCell>
    <TableCell className="py-3 px-4">
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell className="py-3 px-4">
      <Skeleton className="h-4 w-20" />
    </TableCell>
    <TableCell className="py-3 px-4 w-8" />
  </TableRow>
);

export const DistrictTable: React.FC<DistrictTableProps> = ({
  districts,
  isLoading,
  onEditDistrict,
  onDeleteDistrict,
  onBulkSelect,
  pageIndex,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}) => {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const endItem = Math.min((pageIndex + 1) * pageSize, totalCount);

  // Correctly typed row selection handler
  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    const newSelection = typeof updater === "function" ? updater(rowSelection) : updater;
    setRowSelection(newSelection);

    if (onBulkSelect) {
      const selectedIds = Object.keys(newSelection)
        .filter((key) => newSelection[key])
        .map((index) => districts[parseInt(index)]?.id)
        .filter(Boolean) as string[];
      onBulkSelect(selectedIds);
    }
  };

  const columns = useMemo<ColumnDef<District>[]>(() => {
    const cols: ColumnDef<District>[] = [];

    if (onBulkSelect) {
      cols.push({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      });
    }

    cols.push(
      {
        accessorKey: "name",
        header: "District Name",
        cell: ({ row }) => (
          <span className="text-[13px] font-semibold text-foreground tracking-tight">
            {row.getValue("name")}
          </span>
        ),
      },
      {
        accessorKey: "provinceName",
        header: "Province",
        cell: ({ row }) => {
          const provinceName = row.original.provinceName;
      
          return (
            <span className="text-[12px] text-muted-foreground group-hover:text-foreground transition-colors">
              {provinceName || "Not found"}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created Date",
        cell: ({ row }) => {
          const val = row.getValue("createdAt") as string;
          const dateString = val ? new Date(val).toLocaleDateString() : "-";
          return <span className="text-[11px] text-muted-foreground">{dateString}</span>;
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const district = row.original;
          return (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditDistrict(district)}
                className="h-8 px-2"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteDistrict(district)}
                className="h-8 px-2 text-destructive hover:text-destructive/80"
              >
                Delete
              </Button>
            </div>
          );
        },
      },
    );

    return cols;
  }, [onBulkSelect, onEditDistrict, onDeleteDistrict]);

  const table = useReactTable({
    data: districts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: handleRowSelectionChange,
    state: {
      rowSelection,
    },
    manualPagination: true,
  });

  // Reset selection when page changes
  React.useEffect(() => {
    setRowSelection({});
  }, [pageIndex, pageSize]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow>
              {onBulkSelect && <TableHead className="w-12" />}
              <TableHead>District Name</TableHead>
              <TableHead>Province</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: pageSize }).map((_, i) => (
              <SkeletonRow key={i} hasBulkSelect={!!onBulkSelect} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (districts.length === 0 && totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-5 border border-border/50 shadow-sm">
          <MapPin className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No districts found</h3>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-[250px] mx-auto">
          Add a district to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground first:rounded-tl-lg last:rounded-tr-lg"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(
                  "group transition-all border-b border-border/40",
                  row.getIsSelected() ? "bg-primary/5" : "hover:bg-muted/30",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No results on this page.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalPages > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/10">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{startItem}</span> to{" "}
              <span className="font-medium text-foreground">{endItem}</span> of{" "}
              <span className="font-medium text-foreground">{totalCount}</span> results
            </p>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pageIndex - 1)}
              disabled={pageIndex === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous</span>
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pageIndex < 2) {
                  pageNum = i + 1;
                } else if (pageIndex > totalPages - 3) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pageIndex - 1 + i;
                }
                if (pageNum < 1 || pageNum > totalPages) return null;
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pageIndex + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum - 1)}
                    className="h-8 w-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pageIndex + 1)}
              disabled={pageIndex + 1 >= totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
