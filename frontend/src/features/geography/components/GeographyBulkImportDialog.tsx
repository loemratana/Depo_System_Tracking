import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BulkImportDropzone } from "../../../features/bulk-operations/components/BulkImportDropzone";
import {
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  Database,
} from "lucide-react";
import axiosClient from "@/api/axios-client";
import { toast } from "sonner";

interface ValidationSummary {
  totalRows: number;
  validCount: number;
  invalidCount: number;
}

interface GeographyBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GeographyBulkImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: GeographyBulkImportDialogProps) {
  const [activeTab, setActiveTab] = useState<"provinces" | "districts">("provinces");
  const [step, setStep] = useState<"upload" | "verify" | "importing" | "complete">("upload");
  const [fileName, setFileName] = useState("");
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    summary: ValidationSummary;
    validRows: any[];
    invalidRows: any[];
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    count?: number;
    message?: string;
  } | null>(null);

  const resetState = () => {
    setStep("upload");
    setFileName("");
    setFileBuffer(null);
    setVerificationResult(null);
    setImportResult(null);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
    if (importResult?.success) onSuccess?.();
  };

  // Download template
  const downloadTemplate = async () => {
    try {
      const endpoint = activeTab === "provinces" ? "/provinces/template" : "/districts/template";
      const response = await axiosClient.get(endpoint, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        activeTab === "provinces" ? "province_template.xlsx" : "district_template.xlsx",
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Template downloaded");
    } catch (error) {
      console.error(error);
      toast.error("Failed to download template");
    }
  };

  // Handle file upload and verification
  const handleFileAccepted = async (file: File) => {
    setFileName(file.name);
    setStep("verify");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const endpoint = activeTab === "provinces" ? "/provinces/verify" : "/districts/verify";
      const res = await axiosClient.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data;
      if (data.success) {
        const summary = data.summary || {
          totalRows: (data.validRows?.length || 0) + (data.invalidRows?.length || 0),
          validCount: data.validRows?.length || 0,
          invalidCount: data.invalidRows?.length || 0,
        };
        setVerificationResult({
          summary,
          validRows: data.validRows || [],
          invalidRows: data.invalidRows || [],
        });
        setStep("complete");
        const buffer = await file.arrayBuffer();
        setFileBuffer(buffer);
        toast.success("File verified successfully");
      } else {
        toast.error(data.message || "Verification failed");
        setStep("upload");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Verification error");
      setStep("upload");
    }
  };

  // Confirm import
  const handleConfirmImport = async () => {
    if (!verificationResult || !fileBuffer) {
      toast.error("No verified file found");
      return;
    }
    setStep("importing");
    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const file = new File([blob], fileName, { type: blob.type });
      formData.append("file", file);
      const endpoint = activeTab === "provinces" ? "/provinces/import" : "/districts/import";
      const res = await axiosClient.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data;
      if (data.success) {
        const count = data.importedCount ?? 0;
        setImportResult({ success: true, count, message: data.message });
        toast.success(data.message || `Successfully imported ${count} record(s)`);
        setTimeout(() => handleClose(), 1500);
      } else {
        throw new Error(data.message || "Import failed");
      }
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.message || err.message || "Import failed";
      setImportResult({ success: false, message });
      setStep("complete");
      toast.error(message);
    }
  };

  const getStepIcon = (stepName: "upload" | "verify" | "import") => {
    const currentStep = step as string;
    if (stepName === "upload")
      return currentStep === "upload" ? (
        <Upload className="h-4 w-4" />
      ) : currentStep !== "upload" ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : (
        <Upload className="h-4 w-4" />
      );
    if (stepName === "verify")
      return currentStep === "verify" ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : verificationResult ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : (
        <FileSpreadsheet className="h-4 w-4" />
      );
    if (stepName === "import")
      return currentStep === "importing" ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : importResult?.success ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : (
        <Database className="h-4 w-4" />
      );
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0 bg-background">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl">Bulk Import Geography Data</DialogTitle>
          <DialogDescription>
            Upload Excel files to batch create or update provinces and districts. Download the
            template first, fill it, then upload.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as any);
            resetState();
          }}
          className="w-full"
        >
          <div className="px-6 border-b">
            <TabsList className="grid w-[300px] grid-cols-2 mb-0">
              <TabsTrigger value="provinces">Provinces</TabsTrigger>
              <TabsTrigger value="districts">Districts</TabsTrigger>
            </TabsList>
          </div>

          <div className="px-6 py-4 bg-muted/10 border-b">
            <div className="flex items-center justify-between max-w-md">
              <div className="flex items-center gap-2">
                {getStepIcon("upload")}
                <span className="text-sm font-medium">Upload</span>
              </div>
              <div className="w-12 h-px bg-border" />
              <div className="flex items-center gap-2">
                {getStepIcon("verify")}
                <span className="text-sm font-medium">Verify</span>
              </div>
              <div className="w-12 h-px bg-border" />
              <div className="flex items-center gap-2">
                {getStepIcon("import")}
                <span className="text-sm font-medium">Import</span>
              </div>
            </div>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-thin">
            <TabsContent value="provinces" className="mt-0">
              <div className="space-y-6">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    disabled={step === "importing"}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template (Excel)
                  </Button>
                </div>

                {step === "upload" && <BulkImportDropzone onFileAccepted={handleFileAccepted} />}

                {step === "verify" && (
                  <Card>
                    <CardContent className="py-10 flex flex-col items-center gap-3">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Verifying province file, please wait...
                      </p>
                    </CardContent>
                  </Card>
                )}

                {step === "complete" && verificationResult && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <p className="text-2xl font-bold">
                            {verificationResult.summary.totalRows}
                          </p>
                          <p className="text-xs text-muted-foreground">Total rows</p>
                        </CardContent>
                      </Card>
                      <Card className="border-success/20">
                        <CardContent className="pt-6 text-center">
                          <p className="text-2xl font-bold text-success">
                            {verificationResult.summary.validCount}
                          </p>
                          <p className="text-xs text-muted-foreground">Valid</p>
                        </CardContent>
                      </Card>
                      <Card className="border-destructive/20">
                        <CardContent className="pt-6 text-center">
                          <p className="text-2xl font-bold text-destructive">
                            {verificationResult.summary.invalidCount}
                          </p>
                          <p className="text-xs text-muted-foreground">Invalid</p>
                        </CardContent>
                      </Card>
                    </div>

                    {verificationResult.summary.validCount > 0 && (
                      <Button onClick={handleConfirmImport} className="w-full">
                        <Database className="h-4 w-4 mr-2" />
                        Import {verificationResult.summary.validCount} Province(s)
                      </Button>
                    )}

                    {verificationResult.validRows.length > 0 && (
                      <Card className="border-success/20 bg-success/[0.01]">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <h4 className="font-semibold">
                              Ready to Import ({verificationResult.validRows.length} province(s))
                            </h4>
                            <Badge
                              variant="outline"
                              className="ml-auto border-success/30 text-success"
                            >
                              Valid
                            </Badge>
                          </div>
                          <ScrollArea className="h-[200px] border border-border/50 rounded-md">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                                <tr className="border-b">
                                  <th className="text-left p-2 font-medium w-16">Row</th>
                                  <th className="text-left p-2 font-medium">Province Name</th>
                                  <th className="text-left p-2 font-medium">Code</th>
                                </tr>
                              </thead>
                              <tbody>
                                {verificationResult.validRows.map((row, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-b border-border/30 hover:bg-muted/10"
                                  >
                                    <td className="p-2 font-mono text-muted-foreground">
                                      {row.rowNumber}
                                    </td>
                                    <td className="p-2 font-medium">{row.data.name}</td>
                                    <td className="p-2 font-mono">{row.data.code || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    {verificationResult.invalidRows.length > 0 && (
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <h4 className="font-semibold">Rows with errors</h4>
                            <Badge variant="destructive" className="ml-auto">
                              {verificationResult.invalidRows.length} issues
                            </Badge>
                          </div>
                          <ScrollArea className="h-[200px]">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-muted/50">
                                <tr className="border-b">
                                  <th className="text-left p-2 font-medium">Row</th>
                                  <th className="text-left p-2 font-medium">Errors</th>
                                </tr>
                              </thead>
                              <tbody>
                                {verificationResult.invalidRows.map((row, idx) => (
                                  <tr key={idx} className="border-b border-border/50">
                                    <td className="p-2 font-mono">{row.rowNumber}</td>
                                    <td className="p-2 text-destructive text-xs">
                                      {row.errors.join(", ")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    {importResult && !importResult.success && (
                      <Card className="border-destructive/30 bg-destructive/5">
                        <CardContent className="pt-4 flex items-center gap-2 text-destructive">
                          <XCircle className="h-5 w-5" />
                          <p className="text-sm font-medium">{importResult.message}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {step === "importing" && (
                  <Card>
                    <CardContent className="py-10 flex flex-col items-center gap-3">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm font-medium">Importing provinces...</p>
                      <p className="text-xs text-muted-foreground">
                        Please do not close this dialog.
                      </p>
                      <Progress value={45} className="w-64" />
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="districts" className="mt-0">
              {/* Same structure as provinces but with district-specific texts */}
              <div className="space-y-6">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    disabled={step === "importing"}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template (Excel)
                  </Button>
                </div>

                {step === "upload" && <BulkImportDropzone onFileAccepted={handleFileAccepted} />}

                {step === "verify" && (
                  <Card>
                    <CardContent className="py-10 flex flex-col items-center gap-3">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Verifying district file, please wait...
                      </p>
                    </CardContent>
                  </Card>
                )}

                {step === "complete" && verificationResult && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <p className="text-2xl font-bold">
                            {verificationResult.summary.totalRows}
                          </p>
                          <p className="text-xs text-muted-foreground">Total rows</p>
                        </CardContent>
                      </Card>
                      <Card className="border-success/20">
                        <CardContent className="pt-6 text-center">
                          <p className="text-2xl font-bold text-success">
                            {verificationResult.summary.validCount}
                          </p>
                          <p className="text-xs text-muted-foreground">Valid</p>
                        </CardContent>
                      </Card>
                      <Card className="border-destructive/20">
                        <CardContent className="pt-6 text-center">
                          <p className="text-2xl font-bold text-destructive">
                            {verificationResult.summary.invalidCount}
                          </p>
                          <p className="text-xs text-muted-foreground">Invalid</p>
                        </CardContent>
                      </Card>
                    </div>

                    {verificationResult.summary.validCount > 0 && (
                      <Button onClick={handleConfirmImport} className="w-full">
                        <Database className="h-4 w-4 mr-2" />
                        Import {verificationResult.summary.validCount} District(s)
                      </Button>
                    )}

                    {verificationResult.validRows.length > 0 && (
                      <Card className="border-success/20 bg-success/[0.01]">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <h4 className="font-semibold">
                              Ready to Import ({verificationResult.validRows.length} district(s))
                            </h4>
                            <Badge
                              variant="outline"
                              className="ml-auto border-success/30 text-success"
                            >
                              Valid
                            </Badge>
                          </div>
                          <ScrollArea className="h-[200px] border border-border/50 rounded-md">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                                <tr className="border-b">
                                  <th className="text-left p-2 font-medium w-16">Row</th>
                                  <th className="text-left p-2 font-medium">Province Name</th>
                                  <th className="text-left p-2 font-medium">District Name</th>
                                  <th className="text-left p-2 font-medium">Code</th>
                                </tr>
                              </thead>
                              <tbody>
                                {verificationResult.validRows.map((row, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-b border-border/30 hover:bg-muted/10"
                                  >
                                    <td className="p-2 font-mono text-muted-foreground">
                                      {row.rowNumber}
                                    </td>
                                    <td className="p-2">{row.data.provinceName}</td>
                                    <td className="p-2 font-medium">{row.data.districtName}</td>
                                    <td className="p-2 font-mono">{row.data.code || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    {verificationResult.invalidRows.length > 0 && (
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <h4 className="font-semibold">Rows with errors</h4>
                            <Badge variant="destructive" className="ml-auto">
                              {verificationResult.invalidRows.length} issues
                            </Badge>
                          </div>
                          <ScrollArea className="h-[200px]">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-muted/50">
                                <tr className="border-b">
                                  <th className="text-left p-2 font-medium">Row</th>
                                  <th className="text-left p-2 font-medium">Errors</th>
                                </tr>
                              </thead>
                              <tbody>
                                {verificationResult.invalidRows.map((row, idx) => (
                                  <tr key={idx} className="border-b border-border/50">
                                    <td className="p-2 font-mono">{row.rowNumber}</td>
                                    <td className="p-2 text-destructive text-xs">
                                      {row.errors.join(", ")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    {importResult && !importResult.success && (
                      <Card className="border-destructive/30 bg-destructive/5">
                        <CardContent className="pt-4 flex items-center gap-2 text-destructive">
                          <XCircle className="h-5 w-5" />
                          <p className="text-sm font-medium">{importResult.message}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {step === "importing" && (
                  <Card>
                    <CardContent className="py-10 flex flex-col items-center gap-3">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm font-medium">Importing districts...</p>
                      <p className="text-xs text-muted-foreground">
                        Please do not close this dialog.
                      </p>
                      <Progress value={45} className="w-64" />
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
