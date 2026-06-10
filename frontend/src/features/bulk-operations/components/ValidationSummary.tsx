import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles } from "lucide-react";
import { ValidationSummaryStats } from "../types";

interface ValidationSummaryProps {
  stats: ValidationSummaryStats;
  issueCounts: {
    duplicates: number;
    missingFields: number;
    invalidPhones: number;
    locationMismatch: number;
  };
  className?: string;
}

export function ValidationSummary({ stats, issueCounts, className }: ValidationSummaryProps) {
  const getReadinessColor = (score: number) => {
    if (score >= 90) return "text-success border-success/20 bg-success/5";
    if (score >= 70) return "text-warning border-warning/20 bg-warning/5";
    return "text-destructive border-destructive/20 bg-destructive/5";
  };

  const totalIssues = Object.values(issueCounts).reduce((a, b) => a + b, 0);

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-4 gap-4", className)}>
      {/* Readiness Score Card */}
      <div className="md:col-span-1 border border-border rounded-lg p-4 bg-card/30 flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Validation Health
          </span>
          <h4 className="text-[13px] font-semibold text-foreground mt-1">Readiness Score</h4>
        </div>
        <div className="flex items-baseline gap-2 mt-4">
          <span className="text-4xl font-semibold tracking-tight">{stats.readinessScore}%</span>
          <span className="text-[11px] text-muted-foreground">fit for write</span>
        </div>
        <div className="mt-3">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500 ease-out",
                stats.readinessScore >= 90
                  ? "bg-success"
                  : stats.readinessScore >= 70
                  ? "bg-warning"
                  : "bg-destructive"
              )}
              style={{ width: `${stats.readinessScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metrics breakdown */}
      <div className="md:col-span-3 border border-border rounded-lg p-4 bg-card/30 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Row Distribution
            </span>
            <h4 className="text-[13px] font-semibold text-foreground mt-1">Consistency Check</h4>
          </div>
          {stats.readinessScore === 100 && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
              <Sparkles className="h-3 w-3" />
              <span>Perfect Schema</span>
            </div>
          )}
        </div>

        {/* Counts Grid */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="border border-border/60 rounded px-3 py-2 bg-card/10">
            <span className="text-[10px] text-muted-foreground font-medium block">Total Rows</span>
            <span className="text-lg font-semibold text-foreground block mt-0.5">{stats.totalRows}</span>
          </div>
          <div className="border border-border/60 rounded px-3 py-2 bg-card/10">
            <span className="text-[10px] text-success-foreground/75 font-medium block">Fully Valid</span>
            <span className="text-lg font-semibold text-success-foreground block mt-0.5">{stats.validRows}</span>
          </div>
          <div className="border border-border/60 rounded px-3 py-2 bg-card/10">
            <span className="text-[10px] text-warning-foreground/75 font-medium block">Warnings</span>
            <span className="text-lg font-semibold text-warning-foreground block mt-0.5">{stats.warningRows}</span>
          </div>
          <div className="border border-border/60 rounded px-3 py-2 bg-card/10">
            <span className="text-[10px] text-destructive/75 font-medium block">Critical Errors</span>
            <span className="text-lg font-semibold text-destructive block mt-0.5">{stats.errorRows}</span>
          </div>
        </div>

        {/* Diagnosis list */}
        {totalIssues > 0 && (
          <div className="mt-4 border-t border-border/60 pt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground shrink-0">Diagnosis:</span>
            {issueCounts.duplicates > 0 && (
              <div className="flex items-center gap-1 text-warning-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{issueCounts.duplicates} Duplicate Employee Codes</span>
              </div>
            )}
            {issueCounts.missingFields > 0 && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{issueCounts.missingFields} Missing Required Fields</span>
              </div>
            )}
            {issueCounts.invalidPhones > 0 && (
              <div className="flex items-center gap-1 text-warning-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{issueCounts.invalidPhones} Invalid Phone Formats</span>
              </div>
            )}
            {issueCounts.locationMismatch > 0 && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{issueCounts.locationMismatch} Depot/District Mismatches</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
