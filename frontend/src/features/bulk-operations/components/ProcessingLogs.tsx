import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Terminal, Cpu, Database, CheckSquare, RefreshCw } from "lucide-react";
import { ProcessingLog, ImportRow } from "../types";
import axiosClient from "@/api/axios-client";

interface ProcessingLogsProps {
  totalRecords: number;
  rows: ImportRow[];
  onComplete: (result: any) => void;
  className?: string;
}

export function ProcessingLogs({ totalRecords, rows, onComplete, className }: ProcessingLogsProps) {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
  });

  const terminalEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, level: "info" | "success" | "warn" | "error" = "info") => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now
      .getMilliseconds()
      .toString()
      .padStart(3, "0")}`;
    setLogs((prev) => [...prev, { timestamp: timeStr, message, level }]);
  };

  useEffect(() => {
    const runImport = async () => {
      addLog("Starting bulk transaction pipeline...", "info");
      addLog("Preparing and mapping employee payload data...", "info");
      setProgress(15);

      const employeePayload = rows.map((r) => ({
        khmerName: r.khmerName || r.employeeName,
        englishName: r.englishName || r.khmerName || r.employeeName,
        employeeCode: r.employeeCode,
        phone: r.phone,
        email: r.email,
        province: r.province,
        district: r.district,
        depotName: r.depot,
        address: r.address,
        department: r.department,
        position: r.position,
        gender: r.gender,
        status: r.status,
      }));

      await new Promise((resolve) => setTimeout(resolve, 600));
      addLog("Acquiring database connection pool and regional locks...", "info");
      setProgress(30);

      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        addLog(`Sending ${employeePayload.length} records to bulk-import manager...`, "info");
        setProgress(50);

        const response = await axiosClient.post("/employees/bulk-import", {
          employees: employeePayload,
        });

        const result = response.data;
        setProgress(70);
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (result.success) {
          addLog(`Bulk Import Manager: Mapped ${result.successCount} database insertions successfully.`, "success");
          setProgress(85);
          await new Promise((resolve) => setTimeout(resolve, 600));
          
          // Print details for each inserted employee with smooth staggering
          if (result.data && Array.isArray(result.data)) {
            for (let index = 0; index < result.data.length; index++) {
              const emp = result.data[index];
              addLog(`Row #${index + 1} [${emp.khmerName}]: Successfully written to database (ID: ${emp.id}).`, "success");
              
              // Increment committed stats in real-time as lines print
              setStats((prev) => ({
                ...prev,
                processed: index + 1,
                success: prev.success + 1,
              }));
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          }

          // Print details for failed rows if any (partial success)
          if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
            for (let errIdx = 0; errIdx < result.errors.length; errIdx++) {
              const err = result.errors[errIdx];
              addLog(`Row #${err.row} [${err.name || "Unknown"}]: Error - ${err.error}`, "error");
              
              // Increment failed stats in real-time as lines print
              setStats((prev) => ({
                ...prev,
                processed: (result.data?.length || 0) + errIdx + 1,
                failed: prev.failed + 1,
              }));
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          }

          setStats({
            processed: result.total || employeePayload.length,
            success: result.successCount || 0,
            failed: result.failedCount || 0,
            skipped: 0,
          });

          setProgress(100);
          addLog(`Bulk Import committed. Total: ${result.total}, Success: ${result.successCount}, Failed: ${result.failedCount}`, "success");
          
          await new Promise((resolve) => setTimeout(resolve, 800));
          onComplete(result);
        } else {
          throw new Error(result.message || "Bulk import failed");
        }
      } catch (err: any) {
        console.error("Bulk Import execution error:", err);
        const errMsg = err.response?.data?.message || err.message;
        addLog(`Transaction Aborted: ${errMsg}`, "error");
        
        setStats({
          processed: employeePayload.length,
          success: 0,
          failed: employeePayload.length,
          skipped: 0,
        });
        setProgress(100);

        setTimeout(() => {
          onComplete({
            success: false,
            total: employeePayload.length,
            successCount: 0,
            failedCount: employeePayload.length,
            errors: [{ row: 0, name: "System", error: errMsg }],
            data: [],
          });
        }, 1200);
      }
    };

    runImport();
  }, [rows]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "success":
        return "text-success-foreground/90";
      case "warn":
        return "text-warning-foreground/90";
      case "error":
        return "text-destructive/90";
      default:
        return "text-muted-foreground";
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "success":
        return "[ OK ]";
      case "warn":
        return "[WARN]";
      case "error":
        return "[FAIL]";
      default:
        return "[INFO]";
    }
  };

  return (
    <div className={cn("border border-border rounded-lg bg-card/20 shadow-sm overflow-hidden flex flex-col", className)}>
      {/* Header operations bar */}
      <div className="border-b border-border px-4 py-3 bg-card/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-[13px] font-semibold text-foreground tracking-tight">Write Processing Stream</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tight">Active Engine</span>
        </div>
      </div>

      {/* Grid of indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-border divide-y sm:divide-y-0 divide-x divide-border bg-card/10 select-none">
        <div className="px-4 py-3 flex items-center gap-3">
          <RefreshCw className="h-4 w-4 text-primary animate-spin shrink-0" />
          <div>
            <span className="text-[10px] text-muted-foreground font-medium block leading-none">Processed</span>
            <span className="text-base font-semibold text-foreground block mt-1 font-mono">
              {stats.processed} / {totalRecords}
            </span>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <CheckSquare className="h-4 w-4 text-success shrink-0" />
          <div>
            <span className="text-[10px] text-muted-foreground font-medium block leading-none">Inserted</span>
            <span className="text-base font-semibold text-success-foreground block mt-1 font-mono">
              {stats.success}
            </span>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <Cpu className="h-4 w-4 text-destructive shrink-0" />
          <div>
            <span className="text-[10px] text-muted-foreground font-medium block leading-none">Failed Rows</span>
            <span className="text-base font-semibold text-destructive block mt-1 font-mono">
              {stats.failed}
            </span>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <Database className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <span className="text-[10px] text-muted-foreground font-medium block leading-none">API Connection</span>
            <span className="text-[12px] font-semibold text-success block mt-2 font-mono uppercase">
              Online
            </span>
          </div>
        </div>
      </div>

      {/* Terminal logs container */}
      <div className="bg-[#0e0f11] dark:bg-[#090a0c] p-4 h-[240px] overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col scrollbar-thin select-text">
        {logs.map((log, idx) => (
          <div key={idx} className="flex items-start gap-2.5 py-0.5">
            <span className="text-muted-foreground/35 shrink-0 select-none">{log.timestamp}</span>
            <span className={cn("font-medium shrink-0 select-none", getLevelColor(log.level))}>
              {getLevelBadge(log.level)}
            </span>
            <span className="text-zinc-300 dark:text-zinc-400 break-all">{log.message}</span>
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Progress container */}
      <div className="border-t border-border p-4 bg-card/30 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] font-medium">
          <span className="text-muted-foreground">Uploading transaction batch</span>
          <span className="font-mono text-foreground">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
