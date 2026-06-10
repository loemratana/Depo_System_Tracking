import React from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ExportConfigPanel } from "./ExportConfigPanel";
import { ExportConfig } from "../types";

interface ExportCenterProps {
  className?: string;
}

export function ExportCenter({ className }: ExportCenterProps) {
  const handleStartExport = (config: ExportConfig, modelType: string) => {
    const formatExt = config.format.toLowerCase();
    const cleanModel = modelType.toLowerCase().replace(/\s+/g, "_");
    const fileName = `${cleanModel}_export_${new Date().toISOString().slice(0, 10)}.${formatExt}`;
    
    // Trigger premium Toast pipeline
    const toastId = toast.loading(`Assembling ${modelType} dataset schema...`, {
      description: "Acquiring database locks and parsing regional coverage.",
    });

    setTimeout(() => {
      toast.loading(`Serializing columns to ${config.format} stream...`, {
        id: toastId,
      });
    }, 1000);

    setTimeout(() => {
      toast.success("Data Stream Generated!", {
        id: toastId,
        description: `Successfully packaged ${modelType} records. Download started.`,
      });
      
      // Auto-initiate download
      handleDownload(fileName);
    }, 2200);
  };

  const handleDownload = (fileName: string) => {
    const csvContent = "data:text/csv;charset=utf-8,Mock export data for " + fileName + "\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn("max-w-2xl mx-auto py-4", className)}>
      <ExportConfigPanel onExportStart={handleStartExport} />
    </div>
  );
}
