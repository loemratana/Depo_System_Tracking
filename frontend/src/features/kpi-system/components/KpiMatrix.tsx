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
  if (percent >= 100) return "bg-emerald-600 text-white";
  if (percent >= 80) return "bg-amber-500 text-white";
  return "bg-rose-600 text-white";
};

export const KpiMatrix: React.FC<KpiMatrixProps> = ({ data, productNames }) => {
  return (
    <div className="overflow-x-auto overflow-hidden rounded-xl border border-border/70 bg-card">
      <Table>
        <TableHeader className="border-b border-border/80 bg-muted/40">
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className="sticky left-0 z-20 min-w-[200px] w-[200px] border-r border-border/40 bg-muted/60 font-semibold text-muted-foreground">
              Depot
            </TableHead>
            {productNames.map((name) => (
              <TableHead
                key={name}
                className="h-10 min-w-[120px] border-r border-border/40 bg-transparent text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground last:border-0"
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
                className="border-b border-border/40 last:border-0"
              >
                <TableCell className="sticky left-0 z-10 border-r border-border/40 bg-card py-2.5 font-medium text-foreground">
                  {row.depotName}
                </TableCell>
                {productNames.map((name) => {
                  const percent = row.products[name];
                  const hasData = percent !== undefined;
                  return (
                    <TableCell 
                      key={name} 
                      className={`border-r border-border/40 py-2 text-center last:border-0 ${hasData ? getCellColor(percent) : "bg-transparent"}`}
                    >
                      {hasData ? (
                        <span className="text-sm font-semibold tabular-nums">
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
