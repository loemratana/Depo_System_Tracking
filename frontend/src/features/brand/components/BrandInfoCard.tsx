import React from "react";
import { Calendar, User, FileText, Activity, ShieldCheck } from "lucide-react";
import { Brand, BrandActivityLog } from "../types/brand.types";
import { BrandStatusBadge } from "./BrandStatusBadge";

interface BrandInfoCardProps {
  brand: Brand;
  logs: BrandActivityLog[];
  className?: string;
}

export function BrandInfoCard({ brand, logs, className }: BrandInfoCardProps) {
  return (
    <div className="space-y-6 select-none">
      {/* Property Sheet Card */}
      <div className="border border-border rounded-lg bg-card/15 overflow-hidden shadow-sm">
        <div className="border-b border-border/60 px-4 py-3 bg-card/35 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-[12px] font-semibold text-foreground tracking-tight">Core Registration Metadata</h3>
        </div>

        <div className="p-4 space-y-4 text-left select-text">
          {/* Description */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Description</span>
            <p className="text-[12px] text-foreground leading-relaxed">
              {brand.description || "No operational description provided for this brand partnership registry."}
            </p>
          </div>

          {/* Properties Table */}
          <div className="border-t border-border/40 pt-4 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Status</span>
              <div className="pt-0.5">
                <BrandStatusBadge status={brand.status} />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">System Key</span>
              <p className="text-[12px] font-mono font-semibold text-foreground pt-0.5">
                {brand.code}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Created On</span>
              <p className="text-[11px] font-mono text-muted-foreground pt-0.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {brand.createdAt}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Created By</span>
              <p className="text-[11px] text-muted-foreground pt-0.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                system_seeder
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SOC2 System Audit Log Stream */}
      <div className="border border-border rounded-lg bg-card/15 overflow-hidden shadow-sm">
        <div className="border-b border-border/60 px-4 py-3 bg-card/35 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary shrink-0" />
            <h3 className="text-[12px] font-semibold text-foreground tracking-tight">Security & Operation Logs</h3>
          </div>
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
            <ShieldCheck className="h-3 w-3" />
            SOC2 Compliant
          </span>
        </div>

        <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto text-left select-text">
          {logs.map((log, index) => (
            <div key={log.id} className="relative flex gap-3 pb-4 last:pb-0">
              {/* Vertical timeline connector */}
              {index !== logs.length - 1 && (
                <span className="absolute left-[7px] top-[14px] bottom-0 w-[1px] bg-border-strong" />
              )}
              
              {/* Bullet circle */}
              <span className="mt-1 h-3.5 w-3.5 rounded-full border border-border-strong bg-background flex items-center justify-center shrink-0 z-10">
                <span className="h-1 w-1 rounded-full bg-primary" />
              </span>

              {/* Log details */}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-[11.5px] font-semibold text-foreground">{log.action}</h4>
                  <span className="text-[10px] text-muted-foreground/60 font-mono whitespace-nowrap">{log.timestamp}</span>
                </div>
                <p className="text-[10.5px] text-muted-foreground leading-normal">{log.details}</p>
                <div className="text-[9px] text-muted-foreground/50 font-medium">
                  Triggered by: <span className="font-semibold text-foreground/60">{log.performedBy}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default BrandInfoCard;
