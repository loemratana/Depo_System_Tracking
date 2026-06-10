import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, HelpCircle, CornerDownRight, FileSpreadsheet, RefreshCcw } from "lucide-react";
import { ImportRow } from "../types";
import { Button } from "@/components/ui/button";

interface ErrorReviewTableProps {
  failedRows: ImportRow[];
  onRowCorrected: (correctedRow: ImportRow) => void;
  onBulkRetry: () => void;
  className?: string;
}

export function ErrorReviewTable({ failedRows, onRowCorrected, onBulkRetry, className }: ErrorReviewTableProps) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  const getSuggestedFix = (field: string, errorMsg: string): string => {
    if (field === "phone") return "Change to 9-10 numeric digits, e.g., '0961234567'";
    if (field === "employeeCode") return "Must be 'BD-' followed by 4 digits, e.g., 'BD-1042'";
    if (field === "employeeName") return "Enter the complete English or Khmer name";
    if (field === "province") return "Choose an existing operational region (e.g., Central, North, South)";
    return `Correct the value to satisfy: ${errorMsg}`;
  };

  const handleStartEdit = (row: ImportRow, field: string) => {
    setEditingRowId(row.id);
    setEditingField(field);
    setInputValue((row[field as keyof ImportRow] as string) || "");
  };

  const handleSaveEdit = (row: ImportRow, field: string) => {
    const updatedRow = { ...row, [field]: inputValue };
    const errors = { ...row.errors };

    // Simple instant validation
    if (field === "employeeName") {
      if (inputValue.trim()) delete errors.employeeName;
    }
    if (field === "employeeCode") {
      if (/^BD-\d{4}$/.test(inputValue)) delete errors.employeeCode;
    }
    if (field === "phone") {
      if (/^\+?\d{8,12}$/.test(inputValue.replace(/\s+/g, ""))) delete errors.phone;
    }
    if (field === "province") {
      if (inputValue.trim()) delete errors.province;
    }

    updatedRow.errors = errors;
    updatedRow.isValid = Object.keys(errors).length === 0;

    onRowCorrected(updatedRow);
    setEditingRowId(null);
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: ImportRow, field: string) => {
    if (e.key === "Enter") {
      handleSaveEdit(row, field);
    } else if (e.key === "Escape") {
      setEditingRowId(null);
      setEditingField(null);
    }
  };

  if (failedRows.length === 0) {
    return (
      <div className="border border-border rounded-lg p-8 bg-card/25 text-center flex flex-col items-center justify-center">
        <div className="h-9 w-9 rounded-full bg-success/15 border border-success/20 text-success flex items-center justify-center mb-3">
          <Check className="h-4.5 w-4.5" />
        </div>
        <h4 className="text-[13px] font-semibold text-foreground">All Errors Resolved</h4>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px]">
          No remaining validation errors found. You can safely complete the bulk write operation.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
            Troubleshooting Hub
          </span>
          <h4 className="text-[13px] font-semibold text-foreground mt-0.5">
            Resolve {failedRows.length} Validation Errors
          </h4>
        </div>
        <Button
          size="sm"
          onClick={onBulkRetry}
          disabled={failedRows.some((row) => !row.isValid)}
          className="text-[11px] h-7 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95"
        >
          <RefreshCcw className="h-3 w-3" />
          <span>Apply Corrections</span>
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card/20 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-card/80 border-b border-border">
              <tr>
                <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-12 text-center">Row</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[160px]">Field / Error</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[180px]">Original Input</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[260px]">Correction Field</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[240px]">Suggested Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {failedRows.map((row, idx) => {
                const errorFields = Object.keys(row.errors);
                
                return errorFields.map((field, fIdx) => {
                  const errorMsg = row.errors[field];
                  const value = row[field as keyof ImportRow] as string;
                  const isEditing = editingRowId === row.id && editingField === field;

                  return (
                    <tr key={`${row.id}-${field}`} className="hover:bg-muted/10 transition-colors">
                      {fIdx === 0 && (
                        <td
                          rowSpan={errorFields.length}
                          className="px-2 py-2 text-center text-[10px] font-mono text-muted-foreground font-semibold bg-card/10 border-r border-border align-middle"
                        >
                          {idx + 1}
                        </td>
                      )}
                      
                      {/* Field and error text */}
                      <td className="px-3 py-2 text-[11px] align-middle">
                        <span className="font-semibold text-foreground capitalize">{field}</span>
                        <div className="flex items-center gap-1 text-destructive text-[10px] mt-0.5">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span className="truncate">{errorMsg}</span>
                        </div>
                      </td>

                      {/* Original value */}
                      <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground truncate align-middle">
                        {value || <span className="italic text-muted-foreground/45">(empty)</span>}
                      </td>

                      {/* Correction column */}
                      <td className="px-3 py-2 text-[11px] align-middle">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              className="w-full px-2 py-1 text-[11px] bg-background border border-primary rounded font-mono focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                              value={inputValue}
                              onChange={(e) => setInputValue(e.target.value)}
                              onBlur={() => handleSaveEdit(row, field)}
                              onKeyDown={(e) => handleKeyDown(e, row, field)}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => handleStartEdit(row, field)}
                            className="w-full px-2.5 py-1 rounded bg-background border border-border hover:border-border-strong cursor-text text-foreground font-mono truncate text-[11px] flex justify-between items-center group/edit"
                          >
                            <span>{value || <span className="text-muted-foreground/35 italic">Type fix...</span>}</span>
                            <span className="text-[10px] text-muted-foreground/40 group-hover/edit:text-primary transition-colors">Double-click</span>
                          </div>
                        )}
                      </td>

                      {/* Suggestion action */}
                      <td className="px-3 py-2 text-[10px] text-muted-foreground align-middle leading-normal">
                        <div className="flex items-start gap-1">
                          <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 mt-0.5" />
                          <span>{getSuggestedFix(field, errorMsg)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
