import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MatrixData {
  depotName: string;
  products: Record<string, number>; // productName -> kpiPercent
}

interface KpiMatrixProps {
  data: MatrixData[];
  productNames: string[];
}

const getCellColor = (percent: number) => {
  if (percent >= 100) return "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
  if (percent >= 80) return "bg-amber-100/50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
  return "bg-rose-100/50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400";
};

export const KpiMatrix: React.FC<KpiMatrixProps> = ({ data, productNames }) => {
  return (
    <div className="rounded-none border border-border bg-surface overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/50 border-b border-border/80">
          <TableRow className="hover:bg-transparent border-0">
            <TableHead className="font-bold text-muted-foreground border-r border-border/40 w-[200px] min-w-[200px] bg-muted/20 sticky left-0 z-20">
              Depot
            </TableHead>
            {productNames.map((name) => (
              <TableHead
                key={name}
                className="text-xs uppercase tracking-wider h-10 font-bold text-muted-foreground border-r border-border/40 last:border-0 bg-muted/20 text-center min-w-[120px]"
              >
                {name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length ? (
            data.map((row, index) => (
              <TableRow
                key={index}
                className="hover:bg-muted/40 transition-colors border-b border-border/40 last:border-0"
              >
                <TableCell className="font-medium text-foreground py-2.5 border-r border-border/40 sticky left-0 bg-surface z-10 shadow-[1px_0_0_0_var(--color-border)]">
                  {row.depotName}
                </TableCell>
                {productNames.map((name) => {
                  const percent = row.products[name];
                  const hasData = percent !== undefined;
                  return (
                    <TableCell 
                      key={name} 
                      className={`py-2 border-r border-border/40 last:border-0 text-center ${hasData ? getCellColor(percent) : 'bg-transparent'}`}
                    >
                      {hasData ? (
                        <span className="font-semibold tabular-nums text-sm">
                          {percent.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">—</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={productNames.length + 1}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No matrix data available.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
