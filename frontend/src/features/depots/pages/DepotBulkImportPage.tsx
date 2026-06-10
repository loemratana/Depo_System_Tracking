import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import axiosClient from "@/api/axios-client";
import { BulkImportDropzone } from "@/features/bulk-operations/components/BulkImportDropzone";
import { DepotImportPreviewTable } from "@/features/depots/components/DepotImportPreviewTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  buildValidationMap,
  parseCSV,
  type RowValidation,
} from "../utils/depot-import-utils";

type ImportStep = "upload" | "validate" | "preview" | "importing" | "complete";

const STEPS: { id: ImportStep | "fix" | "revalidate"; label: string }[] = [
  { id: "upload", label: "Upload File" },
  { id: "validate", label: "Validate Data" },
  { id: "preview", label: "Preview & Edit" },
  { id: "fix", label: "Fix Errors" },
  { id: "revalidate", label: "Revalidate" },
  { id: "importing", label: "Import" },
];

function stepIndex(step: ImportStep, hasErrors: boolean, needsRevalidate: boolean): number {
  if (step === "upload") return 0;
  if (step === "validate") return 1;
  if (needsRevalidate) return 4;
  if (hasErrors && step === "preview") return 3;
  if (step === "preview") return 2;
  if (step === "importing") return 5;
  if (step === "complete") return 5;
  return 0;
}

export function DepotBulkImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [validationMap, setValidationMap] = useState<Record<number, RowValidation>>({});
  const [needsRevalidate, setNeedsRevalidate] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; failed: number } | null>(
    null,
  );
  const [importErrors, setImportErrors] = useState<{ row: number; error: string }[]>([]);

  const errorCount = Object.values(validationMap).filter((v) => v.status === "error").length;
  const warningCount = Object.values(validationMap).filter((v) => v.status === "warning").length;
  const validCount = Object.values(validationMap).filter((v) => v.status === "valid").length;
  const readyCount = validCount + warningCount;
  const canImport = step === "preview" && !needsRevalidate && readyCount > 0 && errorCount === 0;

  const activeStepIdx = stepIndex(step, errorCount > 0, needsRevalidate);

  const runValidation = useCallback(async (currentRows: Record<string, string>[]) => {
    setStep("validate");
    try {
      const payload = currentRows.map(({ _originalIndex, ...rest }) => rest);
      const res = await axiosClient.post("/depots/validate-import", payload);
      const map = buildValidationMap(currentRows, res.data.checks ?? {});
      setValidationMap(map);
      setNeedsRevalidate(false);
      setStep("preview");

      const errors = Object.values(map).filter((v) => v.status === "error").length;
      if (errors > 0) {
        toast.error(`${errors} row(s) have errors — fix inline and revalidate`);
      } else {
        toast.success("All rows passed validation");
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Validation failed";
      toast.error(message);
      setStep("upload");
    }
  }, []);

  const handleFileAccepted = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx" && ext !== "tsv") {
      toast.error("Depot import requires a CSV or Excel file. Download the template to get started.");
      return;
    }

    setFileName(file.name);
    setImportResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as string[][];

      if (jsonData.length <= 1) {
        toast.error("File has no data rows");
        return;
      }

      const HEADER_MAP: Record<string, string> = {
        depotenglishsname: "name",
        depotskhmername: "khmerName",
        depotname: "name",
        depotcode: "code",
        depotphone: "phone",
        salesupervisorname: "employeeName",
        salesupervisoremail: "employeeEmail",
        salesupervisorphone: "employeePhone",
        salesupervisorkhmername: "employeeKhmerName",
      };

      const h = jsonData[0].map((header) => {
        const str = String(header).trim();
        const lower = str.toLowerCase();
        return HEADER_MAP[lower] || str;
      });

      const r = jsonData
        .slice(1)
        .filter((row) => row.some((cell) => String(cell).trim() !== ""))
        .map((row, idx) => {
          const rowData: Record<string, string> = {};
          h.forEach((header, i) => {
            // Only assign if the value exists, but don't overwrite with empty if already set (handles duplicate mapped keys)
            const val = row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : "";
            if (val !== "" || !rowData[header]) {
              rowData[header] = val;
            }
          });
          rowData._originalIndex = String(idx);
          return rowData;
        });

      if (r.length === 0) {
        toast.error("File has no data rows");
        return;
      }

      // Deduplicate headers (some template columns map to the same key e.g. name)
      const uniqueHeaders = [...new Set(h)];
      setHeaders(uniqueHeaders);
      setRows(r);
      await runValidation(r);
    } catch {
      toast.error("Failed to parse file. Please ensure it is a valid CSV or Excel file.");
      setStep("upload");
    }
  };

  const updateCell = (rowIdx: number, field: string, value: string) => {
    setRows((prev) => prev.map((row, i) => (i === rowIdx ? { ...row, [field]: value } : row)));
    setNeedsRevalidate(true);
  };

  const deleteRow = (idx: number) => {
    const newRows = rows.filter((_, i) => i !== idx);
    const newMap: Record<number, RowValidation> = {};
    newRows.forEach((_, i) => {
      const oldIdx = i < idx ? i : i + 1;
      newMap[i] = validationMap[oldIdx] ?? { status: "valid", issues: [], notes: [] };
    });
    setRows(newRows);
    setValidationMap(newMap);
    setNeedsRevalidate(true);
  };

  const removeAllErrors = () => {
    const validRows = rows.filter((_, idx) => validationMap[idx]?.status !== "error");
    const newMap: Record<number, RowValidation> = {};
    validRows.forEach((_, idx) => {
      const sourceIdx = rows.findIndex((r) => r === validRows[idx]);
      newMap[idx] = validationMap[sourceIdx] ?? { status: "valid", issues: [], notes: [] };
    });
    setRows(validRows);
    setValidationMap(newMap);
    setNeedsRevalidate(true);
  };

  const handleRevalidate = () => {
    if (rows.length === 0) return;
    runValidation(rows);
  };

  const handleImport = async () => {
    if (!canImport) return;

    const validRows = rows
      .filter((_, idx) => validationMap[idx]?.status !== "error")
      .map(({ _originalIndex, ...rest }) => rest); // strip internal key

    setStep("importing");
    setImportErrors([]);

    try {
      const res = await axiosClient.post("/depots/bulk-import-json", validRows, {
        timeout: 120000,
      });

      const created = res.data.summary?.created ?? res.data.data?.length ?? 0;
      const failed = res.data.summary?.failed ?? 0;
      const backendErrors: { row: number; error: string }[] = (res.data.errors ?? []).map(
        (e: { row: number; error: string }) => ({ row: e.row, error: e.error }),
      );

      setImportResult({ created, failed });
      setImportErrors(backendErrors);
      setStep("complete");
      queryClient.invalidateQueries({ queryKey: ["depots"] });

      if (failed > 0) {
        toast.warning(`Imported ${created} depot(s), ${failed} failed`);
      } else {
        toast.success(`Successfully imported ${created} depot(s)`);
      }
    } catch (err: unknown) {
      const e = err as {
        code?: string;
        response?: { status?: number; data?: { message?: string; detail?: string } };
      };
      if (e.code === "ECONNABORTED") {
        toast.error("Request timeout", {
          description: "Import took too long. Try a smaller file.",
        });
      } else if (e.response?.status === 401) {
        toast.error("Unauthorized", { description: "Please sign in again and retry." });
      } else {
        const msg = e.response?.data?.detail || e.response?.data?.message || "Import failed";
        toast.error(msg, { description: "Check the error details below." });
      }
      setStep("preview");
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await axiosClient.get("/depots/template", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "depot_import_template.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Template downloaded");
    } catch {
      toast.error("Failed to download template");
    }
  };

  const resetFlow = () => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setValidationMap({});
    setNeedsRevalidate(false);
    setImportResult(null);
  };

  const displayHeaders = useMemo(() => headers.filter((h) => h !== "_originalIndex"), [headers]);

  return (
    <div className="mx-auto min-h-screen space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to="/depos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Depots
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Bulk Import Depots
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Upload a CSV, validate against the database, fix issues inline, revalidate, then
              import.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          disabled={step === "importing"}
        >
          <Download className="mr-2 h-4 w-4" />
          Download CSV Template
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-8 rounded-lg border border-border/60 bg-muted/20 px-4 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {STEPS.map((s, i) => {
                const isComplete = i < activeStepIdx;
                const isActive =
                  i === activeStepIdx ||
                  (s.id === "fix" && step === "preview" && errorCount > 0) ||
                  (s.id === "revalidate" && needsRevalidate);
                return (
                  <div key={s.id} className="flex min-w-0 flex-1 items-center gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                        isComplete && "border-success/30 bg-success/10 text-success",
                        isActive && !isComplete && "border-primary bg-primary/10 text-primary",
                        !isComplete && !isActive && "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {isComplete ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <span
                      className={cn(
                        "hidden text-[11px] font-medium sm:block lg:text-xs",
                        isActive ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "mx-1 hidden h-px flex-1 sm:block",
                          isComplete ? "bg-success/40" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {step === "upload" && (
            <div className="space-y-4">
              <BulkImportDropzone onFileAccepted={handleFileAccepted} />
              <p className="text-center text-[11px] text-muted-foreground">
                Use the CSV template with columns: name, code, provinceName, districtName, employee
                fields, address, phone, status.
              </p>
            </div>
          )}

          {step === "validate" && (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Validating data…</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Checking {rows.length} row(s) against the database
                </p>
              </div>
            </div>
          )}

          {(step === "preview" || step === "importing") && rows.length > 0 && (
            <div className="space-y-5">
              {needsRevalidate && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-gradient-to-r from-warning/10 to-transparent px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/15">
                      <RefreshCw className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">Unsaved changes</p>
                      <p className="text-[11px] text-muted-foreground">
                        Revalidate to refresh row status before importing.
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={handleRevalidate} className="shrink-0">
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Revalidate now
                  </Button>
                </div>
              )}

              {errorCount > 0 && !needsRevalidate && (
                <div className="flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <p className="text-[12px] text-destructive">
                    {errorCount} row(s) need fixes — edit cells in the table below, then revalidate.
                  </p>
                </div>
              )}

              <DepotImportPreviewTable
                rows={rows}
                displayHeaders={displayHeaders}
                validationMap={validationMap}
                fileName={fileName}
                validCount={validCount}
                warningCount={warningCount}
                errorCount={errorCount}
                onUpdateCell={updateCell}
                onDeleteRow={deleteRow}
                onRemoveAllErrors={removeAllErrors}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <p className="text-[12px] text-muted-foreground">
                    {canImport ? (
                      <span>
                        <span className="font-semibold text-foreground">{readyCount}</span> row(s)
                        ready to import
                      </span>
                    ) : needsRevalidate ? (
                      "Revalidate after editing"
                    ) : errorCount > 0 ? (
                      "Fix or remove error rows before importing"
                    ) : (
                      "Nothing to import"
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={resetFlow}>
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    New file
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevalidate}
                    disabled={step === "importing" || rows.length === 0}
                  >
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Revalidate
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleImport}
                    disabled={!canImport || step === "importing"}
                  >
                    {step === "importing" ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Importing…
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-3.5 w-3.5" />
                        Import {readyCount} row(s)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === "complete" && importResult && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full ${importResult.failed > 0 ? "bg-warning/10" : "bg-success/10"}`}
              >
                {importResult.failed > 0 ? (
                  <AlertTriangle className="h-8 w-8 text-warning" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-success" />
                )}
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-foreground">Import complete</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-success">{importResult.created} depot(s) created</span>
                  {importResult.failed > 0 && (
                    <span className="ml-1 font-medium text-destructive">
                      · {importResult.failed} failed
                    </span>
                  )}
                </p>
              </div>

              {importErrors.length > 0 && (
                <div className="w-full max-w-2xl rounded-xl border border-destructive/25 bg-destructive/5 p-4">
                  <p className="mb-3 text-[12px] font-semibold text-destructive">
                    Failed rows — fix these in your file and re-import:
                  </p>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {importErrors.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-background px-3 py-2"
                      >
                        <span className="shrink-0 rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-destructive">
                          Row {e.row}
                        </span>
                        <span className="text-[11px] text-foreground/80">{e.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetFlow}>
                  Import another file
                </Button>
                <Button onClick={() => navigate({ to: "/depos" })}>Back to depot list</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
