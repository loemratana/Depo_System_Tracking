import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ImportRow } from "../types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ImportPreviewTableProps {
  rows: ImportRow[];
  onRowUpdate: (updatedRow: ImportRow) => void;
  className?: string;
}

export function ImportPreviewTable({ rows, onRowUpdate, className }: ImportPreviewTableProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: keyof ImportRow } | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEditing = (rowId: string, field: keyof ImportRow, currentValue: string) => {
    setEditingCell({ rowId, field });
    setEditValue(currentValue);
  };

  const saveEdit = (row: ImportRow, field: keyof ImportRow) => {
    if (!editingCell) return;

    const updatedRow = { ...row, [field]: editValue };
    const errors = { ...row.errors };
    const warnings = { ...row.warnings };

    // Validation rules per field (based on template columns)
    switch (field) {
      case "khmerName":
        if (!editValue.trim()) {
          errors.khmerName = "Khmer name is required";
        } else {
          delete errors.khmerName;
        }
        break;

      case "englishName":
        // optional – no strict validation
        delete errors.englishName;
        delete warnings.englishName;
        break;

      case "employeeCode":
        if (editValue.trim() && !/^BD-\d{4}$/.test(editValue)) {
          warnings.employeeCode = "Code usually matches BD-XXXX format";
          delete errors.employeeCode;
        } else if (!editValue.trim()) {
          // optional field
          delete errors.employeeCode;
          delete warnings.employeeCode;
        } else {
          delete errors.employeeCode;
          delete warnings.employeeCode;
        }
        break;

      case "images":
        // optional
        delete errors.images;
        delete warnings.images;
        break;

      case "dateOfBirth":
        if (editValue.trim()) {
          const parsed = new Date(editValue);
          if (isNaN(parsed.getTime())) {
            warnings.dateOfBirth = "Invalid date format (use YYYY-MM-DD)";
          } else {
            delete warnings.dateOfBirth;
          }
        } else {
          delete warnings.dateOfBirth;
        }
        delete errors.dateOfBirth;
        break;

      case "gender":
        if (editValue.trim() && !["MALE", "FEMALE", "OTHER"].includes(editValue.toUpperCase())) {
          warnings.gender = "Gender must be MALE, FEMALE, or OTHER";
        } else {
          delete warnings.gender;
        }
        delete errors.gender;
        break;

      case "address":
        delete errors.address;
        delete warnings.address;
        break;

      case "department":
        delete errors.department;
        delete warnings.department;
        break;

      case "position":
        delete errors.position;
        delete warnings.position;
        break;

      case "phone":
        if (editValue.trim()) {
          const phoneClean = editValue.replace(/\s+/g, "");
          if (!/^\+?\d{8,12}$/.test(phoneClean)) {
            warnings.phone = "Phone number should be 8–12 digits, optionally starting with +";
          } else {
            delete warnings.phone;
          }
        } else {
          delete warnings.phone;
        }
        delete errors.phone;
        break;

      case "email":
        if (!editValue.trim()) {
          errors.email = "Email is required";
        } else if (!/^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/.test(editValue)) {
          errors.email = "Invalid email format";
        } else {
          delete errors.email;
        }
        break;

      case "hireDate":
        if (editValue.trim()) {
          const parsed = new Date(editValue);
          if (isNaN(parsed.getTime())) {
            warnings.hireDate = "Invalid date format (use YYYY-MM-DD)";
          } else {
            delete warnings.hireDate;
          }
        } else {
          delete warnings.hireDate;
        }
        delete errors.hireDate;
        break;

      case "status":
        const statusVal = editValue.trim().toLowerCase();
        if (statusVal && !["active", "inactive"].includes(statusVal)) {
          errors.status = "Status must be 'active' or 'inactive'";
        } else {
          delete errors.status;
        }
        break;

      case "depotCode":
        if (!editValue.trim()) {
          errors.depotCode = "Depot code is required";
        } else {
          delete errors.depotCode;
        }
        break;

      default:
        break;
    }

    updatedRow.errors = errors;
    updatedRow.warnings = warnings;
    updatedRow.isValid = Object.keys(updatedRow.errors).length === 0;

    onRowUpdate(updatedRow);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: ImportRow, field: keyof ImportRow) => {
    if (e.key === "Enter") {
      saveEdit(row, field);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const renderCell = (row: ImportRow, field: keyof ImportRow, label: string) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;
    const value = (row[field] as string) || "";
    const cellError = row.errors[field];
    const cellWarning = row.warnings[field];

    return (
      <td
        className={cn(
          "px-3 py-1.5 text-[12px] font-normal border-r border-border transition-all duration-150 cursor-pointer relative select-none group min-w-[120px] max-w-[200px]",
          cellError
            ? "bg-destructive/5 hover:bg-destructive/10"
            : cellWarning
              ? "bg-warning/5 hover:bg-warning/10"
              : "hover:bg-accent/40",
          isEditing ? "p-0 bg-background z-10" : ""
        )}
        onDoubleClick={() => startEditing(row.id, field, value)}
      >
        {isEditing ? (
          <input
            type="text"
            className="w-full h-[27px] px-2 py-0.5 text-[12px] bg-background border-none focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background rounded-none text-foreground"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => saveEdit(row, field)}
            onKeyDown={(e) => handleKeyDown(e, row, field)}
            autoFocus
          />
        ) : (
          <div className="flex items-center justify-between gap-1.5 h-[17px] truncate">
            <span className={cn("truncate", !value ? "text-muted-foreground/45 italic" : "text-foreground font-mono")}>
              {value || "(empty)"}
            </span>

            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="shrink-0 flex items-center">
                    {cellError ? (
                      <AlertCircle className="h-3.5 w-3.5 text-destructive cursor-help animate-pulse" />
                    ) : cellWarning ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-warning cursor-help" />
                    ) : null}
                  </div>
                </TooltipTrigger>
                {(cellError || cellWarning) && (
                  <TooltipContent side="top" className="bg-popover border border-border text-[11px] text-popover-foreground py-1 px-2.5 max-w-xs shadow-md">
                    <p className="font-semibold text-[11px] mb-0.5">{cellError ? "Error" : "Warning"}</p>
                    <p className="text-muted-foreground leading-normal">{cellError || cellWarning}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </td>
    );
  };

  // Table columns in order matching the template
  const columns = [
    { key: "khmerName", label: "Khmer Name *", required: true },
    { key: "englishName", label: "English Name", required: false },
    { key: "employeeCode", label: "Employee Code", required: false },
    { key: "images", label: "Images URL", required: false },
    { key: "dateOfBirth", label: "Date of Birth", required: false },
    { key: "gender", label: "Gender", required: false },
    { key: "address", label: "Address", required: false },
    { key: "department", label: "Department", required: false },
    { key: "position", label: "Position", required: false },
    { key: "phone", label: "Phone", required: false },
    { key: "email", label: "Email *", required: true },
    { key: "hireDate", label: "Hire Date", required: false },
    { key: "status", label: "Status", required: false },
    { key: "depotCode", label: "Depot Code *", required: true },
  ];

  return (
    <div className={cn("w-full border border-border rounded-lg overflow-hidden bg-card/25 shadow-sm", className)}>
      <div className="overflow-x-auto max-h-[360px] scrollbar-thin">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="sticky top-0 bg-card/95 backdrop-blur border-b border-border z-20 shadow-[0_1px_0_0_var(--color-border)]">
            <tr className="divide-x divide-border">
              <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-10 text-center">
                #
              </th>
              <th className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-16 text-center">
                Valid
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                  style={{ minWidth: col.key === "khmerName" ? "160px" : "120px" }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card/5">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="px-6 py-16 text-center"
                >
                  <p className="text-[13px] font-medium text-foreground">No rows to preview</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Upload an Excel file using the employee template, then verify again.
                  </p>
                </td>
              </tr>
            )}
            {rows.map((row, idx) => {
              const hasErrors = Object.keys(row.errors).length > 0;
              const hasWarnings = Object.keys(row.warnings).length > 0;

              return (
                <tr
                  key={row.id}
                  className={cn(
                    "divide-x divide-border hover:bg-muted/15 transition-all duration-150",
                    hasErrors ? "bg-destructive/[0.01]" : hasWarnings ? "bg-warning/[0.01]" : ""
                  )}
                >
                  <td className="px-2 py-1.5 text-[10px] font-mono text-muted-foreground text-center font-medium bg-card/10 select-none">
                    {idx + 1}
                  </td>
                  <td className="px-2 py-1.5 text-center bg-card/10 select-none">
                    <div className="flex items-center justify-center">
                      {hasErrors ? (
                        <div className="h-4 w-4 rounded-full bg-destructive/10 flex items-center justify-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        </div>
                      ) : hasWarnings ? (
                        <div className="h-4 w-4 rounded-full bg-warning/15 flex items-center justify-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                        </div>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      )}
                    </div>
                  </td>
                  {columns.map((col) => (
                    <React.Fragment key={col.key}>
                      {renderCell(row, col.key as keyof ImportRow, col.label)}
                    </React.Fragment>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border px-4 py-2 bg-card/40 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>💡 Double‑click any cell to edit inline and fix validation alerts immediately.</span>
        <span>Showing {rows.length} records</span>
      </div>
    </div>
  );
}