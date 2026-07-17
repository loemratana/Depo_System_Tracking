import React from "react";
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
import { StatusBadge } from "@/components/ui-kit";
import { Trophy } from "lucide-react";

export interface KpiRow {
  id: string;
  employeeName: string;
  targetQty: number;
  actualQty: number;
  actualRevenue: number;
  kpiPercent: number;
  rank: number;
}

interface KpiTableProps {
  data: KpiRow[];
}

const getKpiStatus = (percent: number) => {
  if (percent >= 100) return { label: "Excellent", tone: "success" as const };
  if (percent >= 90) return { label: "Good", tone: "warning" as const };
  return { label: "Needs Improvement", tone: "destructive" as const };
};

export const KpiTable: React.FC<KpiTableProps> = ({ data }) => {
  const columns: ColumnDef<KpiRow>[] = [
    {
      accessorKey: "rank",
      header: () => <div className="text-center w-12">Rank</div>,
      cell: ({ row }) => {
        const rank = row.original.rank;
        return (
          <div className="flex w-12 items-center justify-center">
            {rank === 1 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500">
                <Trophy className="h-3.5 w-3.5 text-white" />
              </span>
            )}
            {rank === 2 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-400">
                <Trophy className="h-3.5 w-3.5 text-white" />
              </span>
            )}
            {rank === 3 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-700">
                <Trophy className="h-3.5 w-3.5 text-white" />
              </span>
            )}
            {rank > 3 && <span className="font-mono text-xs font-semibold text-muted-foreground">#{rank}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.employeeName}</span>
      ),
    },
    {
      accessorKey: "targetQty",
      header: () => <div className="text-right">Target Qty</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums text-sm font-medium text-muted-foreground">
          {row.original.targetQty.toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "actualQty",
      header: () => <div className="text-right">Actual Qty</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums text-sm font-semibold text-foreground">
          {row.original.actualQty.toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "actualRevenue",
      header: () => <div className="text-right">Actual Rev ($)</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums text-sm font-semibold text-foreground">
          {row.original.actualRevenue.toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "kpiPercent",
      header: () => <div className="text-right">KPI %</div>,
      cell: ({ row }) => {
        const percent = row.original.kpiPercent;
        const { tone } = getKpiStatus(percent);
        
        const colorClass = 
          tone === "success" ? "text-emerald-600" : 
          tone === "warning" ? "text-amber-600" : 
          "text-rose-600";

        return (
          <div className={`text-right tabular-nums text-sm font-bold ${colorClass}`}>
            {percent.toFixed(0)}%
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const { label, tone } = getKpiStatus(row.original.kpiPercent);
        return (
          <StatusBadge tone={tone} dot>
            {label}
          </StatusBadge>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <Table>
        <TableHeader className="sticky top-0 z-10 border-b border-border/80 bg-muted/40 backdrop-blur">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-0 hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="h-10 border-r border-border/40 bg-transparent text-xs font-semibold uppercase tracking-wider text-muted-foreground last:border-0"
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
                className="border-b border-border/40 last:border-0"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="border-r border-border/40 bg-transparent py-2.5 last:border-0">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No KPI records found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
