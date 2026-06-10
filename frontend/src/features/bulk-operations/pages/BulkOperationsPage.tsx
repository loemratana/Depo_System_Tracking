import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Download,
  Share2,
  History,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  Info,
  Calendar,
  AlertCircle,
  Database,
  Search,
  SlidersHorizontal,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ImportStepper } from "../components/ImportStepper";
import { BulkImportDropzone } from "../components/BulkImportDropzone";
import { ValidationSummary } from "../components/ValidationSummary";
import { ImportPreviewTable } from "../components/ImportPreviewTable";
import { ImportResultCard } from "../components/ImportResultCard";
import { ErrorReviewTable } from "../components/ErrorReviewTable";
import { ExportCenter } from "../components/ExportCenter";
import { StatusBadge } from "../components/StatusBadge";
import { ImportRow, ImportStep, ImportHistory } from "../types";
import axiosClient from "@/api/axios-client";
import { toast } from "sonner";
import {
  mapVerifyRowToImportRow,
} from "../utils/employee-import-mapper";

interface BulkOperationsPageProps {
  onBack?: () => void;
  onImportSuccess?: () => void;
}

export function BulkOperationsPage({ onBack, onImportSuccess }: BulkOperationsPageProps) {
  const [activeTab, setActiveTab] = useState<string>("imports");
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [historySearch, setHistorySearch] = useState<string>("");
  const [historyFilter, setHistoryFilter] = useState<string>("All");
  const [isImporting, setIsImporting] = useState(false);

  const [historyLog, setHistoryLog] = useState<ImportHistory[]>([
    // {
    //   id: "hist_001",
    //   fileName: "staff_q2_rotations_v2.csv",
    //   importedBy: "admin@brand-depot.io",
    //   importType: "Employees",
    //   totalRecords: 28,
    //   successCount: 26,
    //   failedCount: 2,
    //   date: "2026-05-18 10:24",
    //   status: "Partial Success",
    //   details: "2 rows skipped due to invalid Cambodian mobile formats.",
    // },
    // {
    //   id: "hist_002",
    //   fileName: "depots_primary_locations.xlsx",
    //   importedBy: "Lena Hofmann",
    //   importType: "Depots",
    //   totalRecords: 12,
    //   successCount: 12,
    //   failedCount: 0,
    //   date: "2026-05-16 11:40",
    //   status: "Completed",
    // },
    // {
    //   id: "hist_003",
    //   fileName: "visit_ledger_backfill_2026_05.tsv",
    //   importedBy: "Tom Richter",
    //   importType: "Visits",
    //   totalRecords: 154,
    //   successCount: 154,
    //   failedCount: 0,
    //   date: "2026-05-12 16:15",
    //   status: "Completed",
    // },
    // {
    //   id: "hist_004",
    //   fileName: "regional_depot_assignments_rev3.csv",
    //   importedBy: "admin@brand-depot.io",
    //   importType: "Assignment Logs",
    //   totalRecords: 45,
    //   successCount: 40,
    //   failedCount: 5,
    //   date: "2026-05-09 09:30",
    //   status: "Partial Success",
    //   details: "5 rows failed schema checks (invalid Depot Code relation).",
    // },
  ]);

  // Initial parsed rows verification when user accepts a file
  const handleFileAccepted = async (file: File) => {
    setFileName(file.name);
    setCurrentStep("validate");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axiosClient.post("/employees/bulk/verify", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = response.data;
      if (data.success) {
        const valRows = (data.validRows || []).map((v: { rowNumber: number; data?: Record<string, unknown> }) =>
          mapVerifyRowToImportRow(v, true),
        );
        const invRows = (data.invalidRows || []).map(
          (v: { rowNumber: number; data?: Record<string, unknown>; errors?: string[] }) =>
            mapVerifyRowToImportRow(v, false),
        );

        const combined = [...valRows, ...invRows].sort(
          (a, b) => Number(a.id) - Number(b.id),
        );

        if (combined.length === 0) {
          toast.error("No data rows found in the file. Check the template and try again.");
          setCurrentStep("upload");
          return;
        }

        setRows(combined);
        setCurrentStep("preview");
        toast.success(`File verified — ${combined.length} row(s) loaded`);
      } else {
        toast.error(data.message || "Failed to verify file");
        setCurrentStep("upload");
      }
    } catch (err: any) {
      console.error("Verification failed", err);
      toast.error(err.response?.data?.message || "File verification failed");
      setCurrentStep("upload");
    }
  };

  const loadDemoRows = () => {
    const initialRows: ImportRow[] = [
      {
        id: "1",
        employeeName: "Lena Hofmann",
        employeeCode: "BD-1042",
        phone: "+855967123456",
        province: "Central",
        district: "Berlin Mitte",
        depot: "Aurora Distribution Hub",
        status: "active",
        errors: {},
        warnings: {},
        isValid: true,
      },
      {
        id: "2",
        employeeName: "Mikael Brandt",
        employeeCode: "BD-1043",
        phone: "0969998887",
        province: "North",
        district: "Hamburg Nord",
        depot: "Helix Outpost",
        status: "active",
        errors: {},
        warnings: {},
        isValid: true,
      },
      {
        id: "3",
        employeeName: "Anya Vogel",
        employeeCode: "BD-1044",
        phone: "088123456",
        province: "North",
        district: "Bremen",
        depot: "Northwind Depot",
        status: "active",
        errors: {},
        warnings: {},
        isValid: true,
      },
      {
        id: "4",
        employeeName: "Tom Richter",
        employeeCode: "BD-1045",
        phone: "017245678",
        province: "South",
        district: "Munich Süd",
        depot: "Stratos Logistics",
        status: "active",
        errors: {},
        warnings: {},
        isValid: true,
      },
      {
        id: "5",
        employeeName: "Klara Engel",
        employeeCode: "BD-1046",
        phone: "",
        province: "South",
        district: "Stuttgart",
        depot: "Pioneer Warehouse",
        status: "on_leave",
        errors: { phone: "Phone number is a required operational field" },
        warnings: {},
        isValid: false,
      },
      {
        id: "6",
        employeeName: "Jonas Becker",
        employeeCode: "BD-1047",
        phone: "092333444",
        province: "West",
        district: "Cologne West",
        depot: "Meridian Field Hub",
        status: "active",
        errors: {},
        warnings: {},
        isValid: true,
      },
      {
        id: "7",
        employeeName: "Sara König",
        employeeCode: "BD-1048",
        phone: "011223344",
        province: "West",
        district: "Düsseldorf",
        depot: "Atlas Service Point",
        status: "inactive",
        errors: {},
        warnings: {},
        isValid: true,
      },
      {
        id: "8",
        employeeName: "Felix Roth",
        employeeCode: "BD-10499",
        phone: "0977889900",
        province: "East",
        district: "Dresden",
        depot: "Cobalt Ops Center",
        status: "active",
        errors: {},
        warnings: { employeeCode: "Code usually matches BD-XXXX format" },
        isValid: true,
      },
      {
        id: "9",
        employeeName: "Mira Schulz",
        employeeCode: "BD-1050",
        phone: "invalid-number",
        province: "East",
        district: "Leipzig",
        depot: "Vector Trading Post",
        status: "active",
        errors: {},
        warnings: { phone: "Invalid character in phone digits" },
        isValid: true,
      },
      {
        id: "10",
        employeeName: "David Lang",
        employeeCode: "BD-1051",
        phone: "095555666",
        province: "Central",
        district: "Frankfurt",
        depot: "Quantum Depot",
        status: "active",
        errors: {},
        warnings: {},
        isValid: true,
      },
      {
        id: "11",
        employeeName: "Hannah Krüger",
        employeeCode: "BD-1052",
        phone: "096777888",
        province: "South",
        district: "Nuremberg",
        depot: "Aurora Distribution Hub",
        status: "suspended",
        errors: { province: "Depot/Province mapping mismatch on regional lookup" },
        warnings: {},
        isValid: false,
      },
      {
        id: "12",
        employeeName: "Erik Sommer",
        employeeCode: "BD-1053",
        phone: "093444555",
        province: "North",
        district: "Hannover",
        depot: "Summit Hub",
        status: "active",
        errors: {},
        warnings: {},
        isValid: true,
      },
    ];

    setRows(initialRows);
    setCurrentStep("preview");
  };

  const handleRowUpdate = (updatedRow: ImportRow) => {
    setRows((prev) => prev.map((row) => (row.id === updatedRow.id ? updatedRow : row)));
  };

  const getDiagnostics = () => {
    const totalRows = rows.length;
    const errorRows = rows.filter((r) => Object.keys(r.errors).length > 0).length;
    const warningRows = rows.filter((r) => Object.keys(r.errors).length === 0 && Object.keys(r.warnings).length > 0).length;
    const validRows = totalRows - errorRows - warningRows;

    // Health score calculations
    const scoreDeductions = errorRows * 8 + warningRows * 3;
    const readinessScore = Math.max(0, 100 - scoreDeductions);

    // Dynamic issue categorization
    const issueCounts = {
      duplicates: rows.filter((r) => r.warnings.employeeCode).length,
      missingFields: rows.filter((r) => r.errors.phone).length,
      invalidPhones: rows.filter((r) => r.warnings.phone).length,
      locationMismatch: rows.filter((r) => r.errors.province).length,
    };

    return {
      stats: { totalRows, validRows, errorRows, warningRows, readinessScore },
      issueCounts,
    };
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);

    const employeePayload = rows.map((r) => ({
      khmerName: r.khmerName,
      englishName: r.englishName,
      employeeCode: r.employeeCode,
      phone: r.phone,
      email: r.email,
      depotCode: r.depotCode,
      status: r.status,
      // optional fields
      images: r.images,
      dateOfBirth: r.dateOfBirth,
      gender: r.gender,
      address: r.address,
      department: r.department,
      position: r.position,
      hireDate: r.hireDate,
    }));
    try {
      const response = await axiosClient.post("/employees/bulk/import", {
        employees: employeePayload,
      });
      const result = response.data;
      handleProcessingComplete(result);
    } catch (err: any) {
      console.error("Bulk Import error:", err);
      const errMsg = err.response?.data?.message || err.message;
      handleProcessingComplete({
        success: false,
        total: employeePayload.length,
        successCount: 0,
        failedCount: employeePayload.length,
        errors: [{ row: 0, name: "System", error: errMsg }],
        data: [],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleProcessingComplete = (result: any) => {
    if (result?.errors && result.errors.length > 0) {
      setRows((prev) => {
        const newRows = [...prev];
        result.errors.forEach((err: any) => {
          const rowIndex = (err.row || 1) - 1;
          if (rowIndex >= 0 && rowIndex < newRows.length) {
            newRows[rowIndex].isValid = false;
            const errMsg = err.error || "Server validation failed";
            let field = "backendError";
            if (errMsg.toLowerCase().includes("employee code")) field = "employeeCode";
            else if (errMsg.toLowerCase().includes("email")) field = "email";
            else if (errMsg.toLowerCase().includes("phone")) field = "phone";
            else if (errMsg.toLowerCase().includes("province")) field = "province";

            newRows[rowIndex].errors = {
              ...newRows[rowIndex].errors,
              [field]: errMsg,
            };
          }
        });
        // Keep only failed rows so they can be retried without duplicating successful ones
        return newRows.filter(r => !r.isValid);
      });
    } else if (result?.success) {
      setRows([]);
    }

    setImportResult(result);
    setCurrentStep("complete");

    // Add transaction to history log
    const newHistoryItem: ImportHistory = {
      id: `hist_${Math.floor(Math.random() * 1000)}`,
      fileName: fileName,
      importedBy: "admin@brand-depot.io",
      importType: "Employees",
      totalRecords: result?.total || rows.length,
      successCount: result?.successCount || 0,
      failedCount: result?.failedCount || 0,
      date: new Date().toISOString().slice(0, 16).replace("T", " "),
      status: (result?.failedCount || 0) === 0 ? "Completed" : (result?.successCount || 0) > 0 ? "Partial Success" : "Failed",
      details: result?.errors?.length > 0 ? `${result.errors.length} rows failed schema checks.` : undefined,
    };
    setHistoryLog((prev) => [newHistoryItem, ...prev]);

    const successCount = result?.successCount || 0;
    const failedCount = result?.failedCount || 0;

    const systemError = result?.errors?.[0]?.error;

    if (successCount > 0 && failedCount === 0) {
      toast.success(`Successfully imported ${successCount} employee(s).`, {
        description: fileName ? `File: ${fileName}` : undefined,
      });
    } else if (successCount > 0 && failedCount > 0) {
      toast.warning(`Imported ${successCount}, ${failedCount} failed.`, {
        description: "Failed rows remain in the table for review.",
      });
    } else if (failedCount > 0 && successCount === 0) {
      toast.error(`Import failed — ${failedCount} record(s) rejected.`, {
        description: systemError || "Fix errors and try again.",
      });
    } else if (result?.success === false) {
      toast.error(systemError || "Import failed due to an error.");
    } else {
      toast.success("Import processed successfully.");
    }

    onImportSuccess?.();
  };

  const handleResetImport = () => {
    setCurrentStep("upload");
    setFileName("");
    setRows([]);
  };

  const downloadTemplate = async () => {
    try {
      const response = await axiosClient.get("/employees/bulk/template", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "employee_template.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Template downloaded successfully");
    } catch (error: any) {
      console.error("Failed to download template", error);
      toast.error("Failed to download Excel template");
    }
  };

  const { stats, issueCounts } = getDiagnostics();
  const failedRows = rows.filter((r) => !r.isValid);

  // History operations search/filter
  const filteredHistory = historyLog.filter((item) => {
    const matchesSearch = item.fileName.toLowerCase().includes(historySearch.toLowerCase()) || item.importedBy.toLowerCase().includes(historySearch.toLowerCase());
    const matchesFilter = historyFilter === "All" || item.importType === historyFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Top Premium Enterprise Header */}
      <header className="border-b border-border bg-card/15 py-4 px-6 select-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3 sm:items-center">
            {onBack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="h-8 px-2.5 text-[11px] gap-1.5 border-border-strong text-muted-foreground hover:text-foreground font-semibold shrink-0 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </Button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Layers className="h-3 w-3 text-primary" />
                </span>
                <h1 className="text-lg font-bold tracking-tight text-foreground">Bulk Data Operations</h1>
              </div>
              <p className="text-[12px] text-muted-foreground mt-1 leading-none">
                Sync region depots, field operatives, and visit logs via structured files. Last processed:{" "}
                <span className="font-semibold text-foreground/80 font-mono">Today, 10:24 AM</span>
              </p>
            </div>
          </div>

          {/* Quick Header actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="text-[11px] h-8 gap-1.5 border-border-strong text-foreground hover:bg-muted font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Get Excel Template</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-[11px] h-8 gap-1.5 border-border-strong text-foreground hover:bg-muted font-medium">
                  <span>Quick Templates</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover border border-border text-[12px] text-popover-foreground">
                <DropdownMenuItem onClick={downloadTemplate} className="cursor-pointer gap-2"><FileSpreadsheet className="h-3.5 w-3.5" /> Employees Template (.csv)</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-2"><Database className="h-3.5 w-3.5" /> Depots Template (.xlsx)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="px-6 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-1">
            <TabsList className="bg-transparent h-auto p-0 gap-6 rounded-none border-none">
              <TabsTrigger
                value="imports"
                className="px-0 py-2 text-[13px] font-semibold text-muted-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground bg-transparent shadow-none transition-all"
              >
                Bulk Import Engine
              </TabsTrigger>
              <TabsTrigger
                value="exports"
                className="px-0 py-2 text-[13px] font-semibold text-muted-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground bg-transparent shadow-none transition-all"
              >
                Export Control Center
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="px-0 py-2 text-[13px] font-semibold text-muted-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground bg-transparent shadow-none transition-all"
              >
                Operational Logs
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-card/25 border border-border rounded px-2.5 py-1">
              <Info className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>Sandbox mode active. All imports are simulated locally.</span>
            </div>
          </div>

          {/* Import tab content */}
          <TabsContent value="imports" className="space-y-6 outline-none focus:ring-0">
            {/* Step Stepper */}
            {currentStep !== "upload" && (
              <ImportStepper currentStep={currentStep} className="hairline rounded-lg" />
            )}

            {/* Stepper dynamic screens */}
            {currentStep === "upload" && (
              <div className="space-y-4">
                <div className="max-w-2xl mx-auto">
                  <BulkImportDropzone onFileAccepted={handleFileAccepted} />
                </div>

                {/* Visual guideline cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto pt-4">
                  <div className="p-4 border border-border/80 rounded-lg bg-card/10">
                    <h4 className="text-[12px] font-bold text-foreground">1. Align Schemas</h4>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                      Ensure file columns match template criteria strictly. Missing columns will abort validation checks.
                    </p>
                  </div>
                  <div className="p-4 border border-border/80 rounded-lg bg-card/10">
                    <h4 className="text-[12px] font-bold text-foreground">2. Validate Geography</h4>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                      Regional depots are verified against existing Province and District references inside our database.
                    </p>
                  </div>
                  <div className="p-4 border border-border/80 rounded-lg bg-card/10">
                    <h4 className="text-[12px] font-bold text-foreground">3. Live Corrective Fixes</h4>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                      Correct format validation mismatches directly inside our Airtable-inspired preview table in real-time.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "validate" && (
              <div className="flex flex-col items-center justify-center py-20 border border-border/60 rounded-lg bg-card/20 max-w-2xl mx-auto">
                <RefreshCw className="h-8 w-8 text-primary animate-spin mb-3" />
                <h4 className="text-[13px] font-semibold text-foreground">Performing schema checks</h4>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px] text-center">
                  Validating fields, evaluating unique keys, and checking geographic bounds...
                </p>
              </div>
            )}

            {currentStep === "preview" && (
              <div className="space-y-6">
                {/* Diagnostics summary */}
                <ValidationSummary stats={stats} issueCounts={issueCounts} />

                {/* Primary Preview grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[13px] font-semibold text-foreground">Operational Data Preview</h3>
                      <p className="text-[11px] text-muted-foreground">Correct cell errors double-clicking elements before writing records.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetImport}
                        className="text-[11px] h-7 border-border-strong text-foreground hover:bg-muted"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={stats.errorRows > 0 || isImporting}
                        onClick={handleConfirmImport}
                        className="text-[11px] h-7 bg-primary text-primary-foreground hover:bg-primary/95 gap-1.5"
                      >
                        {isImporting && <RefreshCw className="h-3 w-3 animate-spin" />}
                        {stats.errorRows > 0
                          ? "Resolve Critical Errors First"
                          : isImporting
                            ? "Committing Records..."
                            : `Confirm & Commit ${rows.length} Rows`}
                      </Button>
                    </div>
                  </div>
                  <ImportPreviewTable rows={rows} onRowUpdate={handleRowUpdate} />
                </div>

                {/* Direct corrective trouble hub */}
                {failedRows.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <ErrorReviewTable
                      failedRows={failedRows}
                      onRowCorrected={handleRowUpdate}
                      onBulkRetry={handleConfirmImport}
                    />
                  </div>
                )}
              </div>
            )}

            {currentStep === "complete" && (
              <ImportResultCard
                stats={{
                  totalRows: importResult?.total || rows.length,
                  success: importResult?.successCount || 0,
                  failed: importResult?.failedCount || 0,
                  duplicates: importResult?.errors?.length || 0,
                  timeMs: 1400,
                }}
                onRetryFailed={() => {
                  setCurrentStep("preview");
                }}
                onReset={handleResetImport}
              />
            )}
          </TabsContent>

          {/* Export tab content */}
          <TabsContent value="exports" className="outline-none focus:ring-0">
            <ExportCenter />
          </TabsContent>

          {/* History log content */}
          <TabsContent value="history" className="outline-none focus:ring-0">
            <div className="border border-border rounded-lg bg-card/25 shadow-sm overflow-hidden flex flex-col justify-between">
              {/* Filter controls */}
              <div className="border-b border-border p-4 bg-card/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by file name or operator..."
                    className="w-full pl-9 pr-4 py-1.5 text-[12px] bg-background border border-border-strong rounded focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder-muted-foreground/60"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                </div>

                {/* Filter chip selectors */}
                <div className="flex flex-wrap items-center gap-2 select-none text-[12px]">
                  <span className="text-muted-foreground font-semibold flex items-center gap-1"><SlidersHorizontal className="h-3.5 w-3.5" /> Filter Type:</span>
                  {["All", "Employees", "Depots", "Visits"].map((filt) => (
                    <button
                      key={filt}
                      onClick={() => setHistoryFilter(filt)}
                      className={cn(
                        "px-2.5 py-0.5 rounded border text-[11px] font-semibold transition-all duration-150",
                        historyFilter === filt
                          ? "bg-primary border-primary text-primary-foreground font-bold shadow-sm"
                          : "bg-background border-border hover:border-border-strong text-foreground"
                      )}
                    >
                      {filt === "All" ? "All Operations" : filt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed select-text">
                  <thead className="bg-card/70 border-b border-border">
                    <tr>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[220px]">File Name</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[150px]">Import Type</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[160px]">Executed By</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[100px] text-center">Total Rows</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[100px] text-center">Success</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[90px] text-center">Failed</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">Timestamp</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 text-[12px] font-semibold text-foreground font-mono truncate">
                          {item.fileName}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-foreground font-mono">
                          {item.importType}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-foreground">
                          {item.importedBy}
                        </td>
                        <td className="px-4 py-3 text-[12px] font-mono text-center">{item.totalRecords}</td>
                        <td className="px-4 py-3 text-[12px] font-mono text-center text-success-foreground">{item.successCount}</td>
                        <td className="px-4 py-3 text-[12px] font-mono text-center text-destructive">{item.failedCount}</td>
                        <td className="px-4 py-3 text-[11px] text-muted-foreground">{item.date}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status as any} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Empty state */}
              {filteredHistory.length === 0 && (
                <div className="p-12 text-center text-muted-foreground border-t border-border bg-card/5 select-none">
                  <AlertCircle className="h-6 w-6 text-muted-foreground/35 mx-auto mb-2" />
                  <p className="text-[12px] font-semibold">No operational records matches your filters</p>
                  <p className="text-[10px] text-muted-foreground/75 mt-0.5">Try refining your keyword query or resetting chips.</p>
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-border px-5 py-3 bg-card/45 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>🔐 Operations logging is immutable for system audits under SOC2 criteria.</span>
                <span>Showing {filteredHistory.length} ledger rows</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
export default BulkOperationsPage;
