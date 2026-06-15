import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
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
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface AnalyticsRow {
  id: string;
  productName: string;
  productSku: string;
  employeeName: string;
  depotName: string;
  quantitySold: number;
  revenue: number;
  growth: number; // percentage e.g., 12.5 or -5.2
}

interface ProductPerformanceTableProps {
  data: AnalyticsRow[];
}

export const ProductPerformanceTable: React.FC<ProductPerformanceTableProps> = ({ data }) => {
  const columns: ColumnDef<AnalyticsRow>[] = [
    {
      accessorKey: "product",
      header: "Product",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.original.productName}</span>
          <span className="text-[11px] font-mono text-muted-foreground">
            {row.original.productSku}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "employee",
      header: "Employee",
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.employeeName}</span>
      ),
    },
    {
      accessorKey: "depot",
      header: "Depot",
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-normal text-xs">
          {row.original.depotName}
        </Badge>
      ),
    },
    {
      accessorKey: "quantitySold",
      header: () => <div className="text-right">Qty Sold</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums text-sm font-medium text-foreground">
          {row.original.quantitySold.toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "revenue",
      header: () => <div className="text-right">Revenue</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums text-sm font-medium text-foreground">
          ${row.original.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      accessorKey: "growth",
      header: () => <div className="text-right">Growth %</div>,
      cell: ({ row }) => {
        const growth = row.original.growth;
        const isPositive = growth > 0;
        const isNegative = growth < 0;
        
        return (
          <div className={`text-right tabular-nums text-sm font-medium ${isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-muted-foreground'}`}>
            {isPositive ? '+' : ''}{growth}%
          </div>
        );
      },
    },
    {
      id: "trend",
      header: () => <div className="text-center">Trend</div>,
      cell: ({ row }) => {
        const growth = row.original.growth;
        if (growth > 0) return <div className="flex justify-center"><TrendingUp className="h-4 w-4 text-emerald-600" /></div>;
        if (growth < 0) return <div className="flex justify-center"><TrendingDown className="h-4 w-4 text-rose-600" /></div>;
        return <div className="flex justify-center"><Minus className="h-4 w-4 text-muted-foreground" /></div>;
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border border-border bg-surface shadow-sm">
      <Table>
        <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-muted/30">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-border">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="text-xs uppercase tracking-wider h-11 font-semibold text-muted-foreground"
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
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="hover:bg-muted/40 transition-colors border-b-border/60"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-sm text-muted-foreground"
              >
                No performance data found for the selected period.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
