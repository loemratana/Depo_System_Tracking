import { Fragment, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Info,
  Pencil,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { RowValidation } from "../utils/depot-import-utils";

const COLUMN_LABELS: Record<string, string> = {
  name: "Depot Name",
  code: "Code",
  provinceName: "Province",
  districtName: "District",
  employeeName: "Employee",
  employeeEmail: "Email",
  employeePhone: "Emp. Phone",
  employeeKhmerName: "Khmer Name",
  address: "Address",
  phone: "Phone",
  status: "Status",
};

type RowFilter = "all" | "error" | "warning" | "valid";

function formatHeader(key: string) {
  return COLUMN_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function RowStatusBadge({ status }: { status: RowValidation["status"] }) {
  const config = {
    valid: {
      icon: CheckCircle2,
      label: "Valid",
      className: "border-success/25 bg-success/10 text-success",
    },
    warning: {
      icon: Info,
      label: "Warning",
      className: "border-warning/30 bg-warning/10 text-warning",
    },
    error: {
      icon: XCircle,
      label: "Error",
      className: "border-destructive/25 bg-destructive/10 text-destructive",
    },
  }[status];

  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        config.className,
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function StatChip({
  label,
  count,
  tone,
  active,
  onClick,
}: {
  label: string;
  count: number;
  tone: "default" | "success" | "warning" | "danger";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all",
        active
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : "border-border/60 bg-card hover:border-border-strong hover:bg-muted/30",
      )}
    >
      <span className={cn("text-lg font-bold tabular-nums leading-none", tones[tone])}>
        {count}
      </span>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </button>
  );
}

type DepotImportPreviewTableProps = {
  rows: Record<string, string>[];
  displayHeaders: string[];
  validationMap: Record<number, RowValidation>;
  fileName: string;
  validCount: number;
  warningCount: number;
  errorCount: number;
  onUpdateCell: (rowIdx: number, field: string, value: string) => void;
  onDeleteRow: (idx: number) => void;
  onRemoveAllErrors: () => void;
};

export function DepotImportPreviewTable({
  rows,
  displayHeaders,
  validationMap,
  fileName,
  validCount,
  warningCount,
  errorCount,
  onUpdateCell,
  onDeleteRow,
  onRemoveAllErrors,
}: DepotImportPreviewTableProps) {
  const [search, setSearch] = useState("");
  const [rowFilter, setRowFilter] = useState<RowFilter>("all");
  const [focusedCell, setFocusedCell] = useState<string | null>(null);

  const filteredIndices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .map((row, idx) => ({ row, idx }))
      .filter(({ row, idx }) => {
        const v = validationMap[idx]?.status ?? "valid";
        if (rowFilter === "error" && v !== "error") return false;
        if (rowFilter === "warning" && v !== "warning") return false;
        if (rowFilter === "valid" && v !== "valid") return false;
        if (!q) return true;
        return displayHeaders.some((h) => (row[h] ?? "").toLowerCase().includes(q));
      });
  }, [rows, validationMap, search, rowFilter, displayHeaders]);

  return (
    <div className="space-y-4">
      {/* Stats + filters toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatChip
            label="Total rows"
            count={rows.length}
            tone="default"
            active={rowFilter === "all"}
            onClick={() => setRowFilter("all")}
          />
          <StatChip
            label="Valid"
            count={validCount}
            tone="success"
            active={rowFilter === "valid"}
            onClick={() => setRowFilter("valid")}
          />
          <StatChip
            label="Warnings"
            count={warningCount}
            tone="warning"
            active={rowFilter === "warning"}
            onClick={() => setRowFilter("warning")}
          />
          <StatChip
            label="Errors"
            count={errorCount}
            tone="danger"
            active={rowFilter === "error"}
            onClick={() => setRowFilter("error")}
          />
        </div>

        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rows…"
            className="h-9 pl-8 text-[12px]"
          />
        </div>
      </div>

      {/* Table shell */}
      <div className="overflow-hidden rounded-sm border border-border/80 bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/25 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Data preview</p>
              <p className="text-[11px] text-muted-foreground">
                {fileName} · {filteredIndices.length} of {rows.length} shown · click cells to edit
              </p>
            </div>
          </div>
          {errorCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemoveAllErrors}
              className="h-8 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Remove all error rows
            </Button>
          )}
        </div>

        <ScrollArea className="h-[min(56vh,560px)] w-full">
          <Table className="min-w-[960px] border-separate border-spacing-0">
            <TableHeader>
              <TableRow className="border-b border-border/80 hover:bg-transparent">
                <TableHead className="sticky left-0 z-20 h-10 w-12 border-r border-border/50 bg-muted/90 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                  #
                </TableHead>
                <TableHead className="sticky left-12 z-20 h-10 w-[88px] border-r border-border/50 bg-muted/90 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                  Status
                </TableHead>
                {displayHeaders.map((h) => (
                  <TableHead
                    key={h}
                    className="h-10 whitespace-nowrap px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {formatHeader(h)}
                  </TableHead>
                ))}
                <TableHead className="sticky right-0 z-20 h-10 w-12 bg-muted/90 backdrop-blur-sm" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIndices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={displayHeaders.length + 3}
                    className="h-32 text-center text-[13px] text-muted-foreground"
                  >
                    No rows match your filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredIndices.map(({ row, idx }) => {
                  const v = validationMap[idx] ?? {
                    status: "valid" as const,
                    issues: [],
                    notes: [],
                  };
                  const isError = v.status === "error";
                  const isWarning = v.status === "warning";
                  const rowAccent = isError
                    ? "border-l-[3px] border-l-destructive"
                    : isWarning
                      ? "border-l-[3px] border-l-warning"
                      : "border-l-[3px] border-l-success/50";

                  return (
                    <Fragment key={`preview-row-group-${idx}`}>
                      <TableRow
                        className={cn(
                          "group border-border/50 transition-colors",
                          (v.issues.length > 0 || v.notes.length > 0) ? "border-b-0" : "border-b",
                          rowAccent,
                          isError && "bg-destructive/[0.03] hover:bg-destructive/[0.06]",
                          isWarning && !isError && "bg-warning/[0.03] hover:bg-warning/[0.06]",
                          !isError && !isWarning && "hover:bg-muted/25",
                        )}
                      >
                      <TableCell className="sticky left-0 z-10 border-r border-border/40 bg-inherit px-3 py-2 font-mono text-[11px] text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="sticky left-12 z-10 border-r border-border/40 bg-inherit px-3 py-2">
                        <RowStatusBadge status={v.status} />
                      </TableCell>
                      {displayHeaders.map((h) => {
                        const cellKey = `${idx}-${h}`;
                        const isFocused = focusedCell === cellKey;
                        const isEmpty = !(row[h] ?? "").trim();
                        return (
                          <TableCell key={h} className="px-2 py-1.5">
                            <div
                              className={cn(
                                "relative rounded-md transition-all",
                                isFocused &&
                                  "ring-2 ring-primary/30 ring-offset-1 ring-offset-background",
                                !isFocused && "group-hover:bg-background/60",
                                isError && isEmpty && "bg-destructive/5",
                              )}
                            >
                              {!isFocused && (row[h] ?? "").length > 0 && (
                                <Pencil className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/0 transition-opacity group-hover:text-muted-foreground/40" />
                              )}
                              <input
                                value={row[h] ?? ""}
                                onChange={(e) => onUpdateCell(idx, h, e.target.value)}
                                onFocus={() => setFocusedCell(cellKey)}
                                onBlur={() => setFocusedCell(null)}
                                placeholder="—"
                                className={cn(
                                  "h-8 w-full min-w-[108px] rounded-md border bg-background/50 px-2.5 text-[12px] text-foreground outline-none transition-colors",
                                  "border-transparent placeholder:text-muted-foreground/40",
                                  "hover:border-border/80 focus:border-primary/50 focus:bg-background focus:shadow-sm",
                                  isError && "focus:ring-1 focus:ring-destructive/20",
                                )}
                              />
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="sticky right-0 z-10 bg-inherit px-2 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteRow(idx)}
                          className="h-8 w-8 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          title="Remove row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {(v.issues.length > 0 || v.notes.length > 0) && (
                      <TableRow className={cn("border-b border-border/50 bg-muted/5", rowAccent)}>
                        <TableCell colSpan={displayHeaders.length + 3} className="px-14 py-2 border-l-0">
                          <div className="flex flex-col gap-1.5 text-[12px] font-medium">
                            {v.issues.map((issue, i) => (
                              <div key={`issue-${i}`} className="flex items-center gap-1.5 text-destructive">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>{issue}</span>
                              </div>
                            ))}
                            {v.notes.map((note, i) => (
                              <div key={`note-${i}`} className="flex items-center gap-1.5 text-warning">
                                <Info className="h-3.5 w-3.5" />
                                <span>{note}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="border-t border-border/60 bg-muted/15 px-4 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            Tip: use stat chips to filter by status. Edit any cell, then revalidate before
            importing.
          </p>
        </div>
      </div>
    </div>
  );
}
