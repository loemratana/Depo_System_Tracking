import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { UploadCloud, FileSpreadsheet, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface BulkImportDropzoneProps {
  onFileAccepted: (file: File) => void;
  className?: string;
}

export function BulkImportDropzone({ onFileAccepted, className }: BulkImportDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    const validTypes = [
      "text/csv",
      "text/tab-separated-values",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    const extension = file.name.split(".").pop()?.toLowerCase();
    const isExtensionValid = ["csv", "xlsx", "tsv"].includes(extension || "");

    if (!validTypes.includes(file.type) && !isExtensionValid) {
      setErrorMsg("Unsupported file format. Please upload an Excel (.xlsx), CSV or TSV file.");
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File exceeds 10MB limit. For larger batches, partition your files.");
      return false;
    }

    setErrorMsg(null);
    return true;
  };

  const simulateUpload = (file: File) => {
    setIsUploading(true);
    setSelectedFile(file);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        const next = prev + 10;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            onFileAccepted(file);
          }, 0);
          return 100;
        }
        return next;
      });
    }, 120);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        simulateUpload(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        simulateUpload(file);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".csv, .xlsx, .tsv"
        onChange={handleChange}
      />

      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={cn(
              "flex flex-col items-center justify-center border border-dashed rounded-lg py-12 px-6 bg-card/20 cursor-pointer transition-all duration-200 select-none",
              isDragActive
                ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(var(--primary),0.05)]"
                : "border-border hover:border-border-strong hover:bg-card/45"
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted border border-border shadow-sm shrink-0 mb-4 transition-transform group-hover:scale-105">
              <UploadCloud className="h-5 w-5 text-muted-foreground" />
            </div>

            <h3 className="text-[13px] font-semibold text-foreground tracking-tight">
              Import dataset template
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px] text-center leading-normal">
              Drag & drop your file here, or <span className="text-primary font-medium">browse local files</span>
            </p>

            <div className="flex items-center gap-4 mt-6 text-[10px] text-muted-foreground/60">
              <span>CSV, TSV or Excel (.xlsx)</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>Max 10MB</span>
            </div>

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 flex items-center gap-2 rounded bg-destructive/10 dark:bg-destructive/5 px-3 py-1.5 text-[11px] text-destructive border border-destructive/20"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="border border-border rounded-lg p-5 bg-card/30 flex items-center gap-4 shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 border border-primary/20 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-[13px] font-semibold text-foreground truncate max-w-[320px]">
                    {selectedFile.name}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.name.split(".").pop()?.toUpperCase()} Document
                  </p>
                </div>
                {!isUploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFile}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Progress */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-150 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground w-8 text-right shrink-0">
                  {uploadProgress}%
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
