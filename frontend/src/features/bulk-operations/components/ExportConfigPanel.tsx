import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Columns, Calendar, ShieldAlert, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportConfig, OperationType } from "../types";

interface ExportConfigPanelProps {
  onExportStart: (config: ExportConfig, modelType: string) => void;
  className?: string;
}

const AVAILABLE_COLUMNS: Record<string, string[]> = {
  Employees: ["Employee Name", "Employee Code", "Phone", "Email", "Province", "District", "Depot", "Hire Date", "Status"],
  Depots: ["Depot Name", "Depot Code", "District", "Region", "Active Handlers", "Monthly Visits", "Status"],
  Visits: ["Depot Name", "Field Handler", "Status", "Started At", "Duration", "GPS Verified", "Region"],
  "Assignment Logs": ["Employee Name", "Depot Assigned", "Assignment Type", "Start Date", "End Date", "Status"],
};

export function ExportConfigPanel({ onExportStart, className }: ExportConfigPanelProps) {
  const [modelType, setModelType] = useState<string>("Employees");
  const [selectedColumns, setSelectedColumns] = useState<string[]>(AVAILABLE_COLUMNS.Employees);
  const [format, setFormat] = useState<"CSV" | "XLSX" | "PDF">("XLSX");
  const [region, setRegion] = useState<string>("All Regions");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);

  const handleModelChange = (val: string) => {
    setModelType(val);
    setSelectedColumns(AVAILABLE_COLUMNS[val] || []);
  };

  const toggleColumn = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleGenerate = () => {
    onExportStart(
      {
        columns: selectedColumns,
        dateRange: null,
        format,
        includeArchived,
        includeInactive,
        region,
      },
      modelType
    );
  };

  return (
    <div className={cn("border border-border rounded-lg bg-card/25 shadow-sm p-5", className)}>
      <div className="flex items-center gap-2 mb-4 border-b border-border/60 pb-3">
        <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-[13px] font-semibold text-foreground tracking-tight">Data Stream Settings</h3>
      </div>

      <div className="space-y-4">
        {/* Dataset selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground font-medium">Operations Dataset</Label>
            <Select value={modelType} onValueChange={handleModelChange}>
              <SelectTrigger className="h-8 text-[12px] bg-background border-border-strong text-foreground font-medium">
                <SelectValue placeholder="Select dataset type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border text-[12px]">
                <SelectItem value="Employees">Employee Directory</SelectItem>
                <SelectItem value="Depots">Brand Depots</SelectItem>
                <SelectItem value="Visits">Visit Operations</SelectItem>
                <SelectItem value="Assignment Logs">Depot Assignments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground font-medium">Regional Coverage</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="h-8 text-[12px] bg-background border-border-strong text-foreground font-medium">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border text-[12px]">
                <SelectItem value="All Regions">All Regions</SelectItem>
                <SelectItem value="Central">Central Region</SelectItem>
                <SelectItem value="North">North Region</SelectItem>
                <SelectItem value="South">South Region</SelectItem>
                <SelectItem value="East">East Region</SelectItem>
                <SelectItem value="West">West Region</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Format & Toggle selectors */}
        <div className="space-y-2">
          <Label className="text-[11px] text-muted-foreground font-medium block">Export Format</Label>
          <div className="flex gap-2 select-none">
            {["XLSX", "CSV", "PDF"].map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f as any)}
                className={cn(
                  "px-3 py-1 rounded border text-[11px] font-semibold transition-all duration-150",
                  format === f
                    ? "bg-primary border-primary text-primary-foreground font-bold shadow-[0_1px_4px_rgba(var(--primary),0.1)]"
                    : "bg-background border-border hover:border-border-strong text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Switches */}
        <div className="space-y-3 border-t border-border/60 pt-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="inactive" className="text-[12px] text-foreground font-medium block">Include Inactive Staff</Label>
              <span className="text-[10px] text-muted-foreground leading-none">Export records for employees marked offline or suspended.</span>
            </div>
            <Switch id="inactive" checked={includeInactive} onCheckedChange={setIncludeInactive} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="archived" className="text-[12px] text-foreground font-medium block">Include Historical Logs</Label>
              <span className="text-[10px] text-muted-foreground leading-none">Export soft-deleted depots and archived visit paths.</span>
            </div>
            <Switch id="archived" checked={includeArchived} onCheckedChange={setIncludeArchived} />
          </div>
        </div>

        {/* Column selectors */}
        <div className="border-t border-border/60 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Columns className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-[11px] text-muted-foreground font-medium">Select Data Fields ({selectedColumns.length})</Label>
          </div>
          <div className="flex flex-wrap gap-1.5 select-none">
            {AVAILABLE_COLUMNS[modelType]?.map((col) => {
              const active = selectedColumns.includes(col);
              return (
                <Badge
                  key={col}
                  onClick={() => toggleColumn(col)}
                  className={cn(
                    "cursor-pointer text-[10px] font-medium tracking-tight rounded-md border px-2 py-0.5 transition-all select-none shadow-none",
                    active
                      ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15"
                      : "bg-background border-border text-muted-foreground hover:bg-muted/30"
                  )}
                >
                  {active && <Check className="h-2.5 w-2.5 shrink-0 mr-1 inline" />}
                  <span>{col}</span>
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Action button */}
        <div className="border-t border-border/60 pt-3">
          <Button
            onClick={handleGenerate}
            disabled={selectedColumns.length === 0}
            className="w-full h-8 text-[12px] font-medium bg-primary text-primary-foreground hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5"
          >
            Generate {format} Stream
          </Button>
        </div>
      </div>
    </div>
  );
}
