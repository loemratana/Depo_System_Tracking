import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, FileDown, RefreshCcw, ClipboardCheck, AlertTriangle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportResultCardProps {
  stats: {
    totalRows: number;
    success: number;
    failed: number;
    duplicates: number;
    timeMs: number;
  };
  onRetryFailed: () => void;
  onReset: () => void;
  className?: string;
}

export function ImportResultCard({ stats, onRetryFailed, onReset, className }: ImportResultCardProps) {
  const downloadReport = () => {
    // Simulated CSV download trigger!
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Row,Code,Error Description\n"
      + "5,BD-1046,Missing required phone\n"
      + "11,BD-1052,Depot mismatch on South Regional Hub\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `import_error_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusConfig = () => {
    if (stats.success === 0) {
      return {
        badgeStyle: "bg-destructive/15 text-destructive border-destructive/20",
        Icon: AlertCircle,
        title: "Bulk Import Failed",
        description: "All database insertions were rejected. Please review the duplicate key or schema conflicts below.",
      };
    }
    if (stats.failed > 0) {
      return {
        badgeStyle: "bg-warning/15 text-warning border-warning/20",
        Icon: AlertTriangle,
        title: "Partial Import Success",
        description: "Some records were successfully written to the database, while others were rejected due to conflicts.",
      };
    }
    return {
      badgeStyle: "bg-success/15 text-success border-success/20",
      Icon: CheckCircle2,
      title: "Bulk Import Completed",
      description: "Transaction successfully committed to the database. All records have been audited and regional coverage has updated.",
    };
  };

  const { badgeStyle, Icon, title, description } = getStatusConfig();

  return (
    <div className={cn("border border-border rounded-lg bg-card/25 shadow-sm p-6 max-w-2xl mx-auto", className)}>
      <div className="flex flex-col items-center text-center">
        {/* Animated Status Badge */}
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-full border mb-4 shadow-sm animate-bounce", badgeStyle)}>
          <Icon className="h-6 w-6" />
        </div>

        <h3 className="text-[15px] font-semibold text-foreground tracking-tight">{title}</h3>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-[380px] leading-normal">
          {description}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full border-t border-b border-border py-4 my-6 text-left">
          <div className="px-2">
            <span className="text-[10px] text-muted-foreground font-medium block leading-none">Total Input</span>
            <span className="text-xl font-bold text-foreground block mt-1.5 font-mono">{stats.totalRows}</span>
          </div>
          <div className="px-2 border-l border-border">
            <span className="text-[10px] text-success/75 font-medium block leading-none">Committed</span>
            <span className="text-xl font-bold text-success block mt-1.5 font-mono">{stats.success}</span>
          </div>
          <div className="px-2 border-l border-border">
            <span className="text-[10px] text-destructive/75 font-medium block leading-none">Failed</span>
            <span className="text-xl font-bold text-destructive block mt-1.5 font-mono">{stats.failed}</span>
          </div>
          <div className="px-2 border-l border-border">
            <span className="text-[10px] text-muted-foreground font-medium block leading-none">Proc. Time</span>
            <span className="text-xl font-bold text-foreground block mt-1.5 font-mono">{(stats.timeMs / 1000).toFixed(2)}s</span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
          {stats.failed > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetryFailed}
              className="text-[12px] h-8 gap-1.5 border-border-strong hover:bg-muted text-foreground"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              <span>Retry Failed Rows ({stats.failed})</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={downloadReport}
            className="text-[12px] h-8 gap-1.5 border-border-strong hover:bg-muted text-foreground"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Download Error Sheet</span>
          </Button>

          <Button
            size="sm"
            onClick={onReset}
            className="text-[12px] h-8 gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground font-medium"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            <span>Done & Return</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
