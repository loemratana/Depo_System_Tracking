import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText,
  Upload,
  Database,
} from "lucide-react";
import axiosClient from "@/api/axios-client";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";

import { toast } from "sonner";

interface ValidationSummary {
  totalRows: number;
  validCount: number;
  invalidCount: number;
}

export function GeographyBulkImportPage() {
  const navigate = useNavigate();
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
        setStep("complete");
        toast.success(data.message || `Successfully imported ${count} record(s)`, {
          description: fileName ? `File: ${fileName}` : undefined,
        });
        setTimeout(() => {
          navigate({ to: "/geography" });
        }, 2000);
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
    if (stepName === "upload")
      return step === "upload" ? (
        <Upload className="h-4 w-4" />
      ) : step !== "upload" ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : (
        <Upload className="h-4 w-4" />
      );
    if (stepName === "verify")
      return step === "verify" ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : verificationResult ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : (
        <FileSpreadsheet className="h-4 w-4" />
      );
    if (stepName === "import")
      return step === "importing" ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : importResult?.success ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : (
        <Database className="h-4 w-4" />
      );
    return null;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/geography" })}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Geography
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bulk Import Geography Data</h1>
          <p className="text-sm text-muted-foreground">
            Upload Excel files to batch create or update provinces and districts. Download the
            template first, fill it, then upload.
          </p>
        </div>
      </div>

      {/* Main content card */}
      <Card>
        <CardContent className="pt-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as any);
              resetState();
            }}
            className="w-full"
          >
            <TabsList className="grid w-[300px] grid-cols-2 mb-6">
              <TabsTrigger value="provinces">Provinces</TabsTrigger>
              <TabsTrigger value="districts">Districts</TabsTrigger>
            </TabsList>

            {/* Step indicator */}
            <div className="px-6 py-4 bg-muted/10 rounded-lg mb-6">
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

            {/* Provinces Tab */}
            <TabsContent value="provinces" className="mt-0 space-y-6">
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
                        <p className="text-2xl font-bold">{verificationResult.summary.totalRows}</p>
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
                    <Button
                      onClick={handleConfirmImport}
                      className="w-full"
                      disabled={step === "importing"}
                    >
                      {step === "importing" ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Database className="h-4 w-4 mr-2" />
                      )}
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
                    <p className="text-xs text-muted-foreground">Please do not close this page.</p>
                    <Progress value={45} className="w-64" />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Districts Tab – similar structure, but with district columns */}
            <TabsContent value="districts" className="mt-0 space-y-6">
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
                    <p className="text-sm text-muted-foreground">Verifying district file...</p>
                  </CardContent>
                </Card>
              )}
              {step === "complete" && verificationResult && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <p className="text-2xl font-bold">{verificationResult.summary.totalRows}</p>
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
                            <thead className="sticky top-0 bg-muted/95">
                              <tr>
                                <th className="p-2 text-left">Row</th>
                                <th className="p-2 text-left">Province Name</th>
                                <th className="p-2 text-left">District Name</th>
                                <th className="p-2 text-left">Code</th>
                              </tr>
                            </thead>
                            <tbody>
                              {verificationResult.validRows.map((row, idx) => (
                                <tr key={idx} className="border-b hover:bg-muted/10">
                                  <td className="p-2 font-mono">{row.rowNumber}</td>
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
                              <tr>
                                <th className="p-2">Row</th>
                                <th className="p-2">Errors</th>
                              </tr>
                            </thead>
                            <tbody>
                              {verificationResult.invalidRows.map((row, idx) => (
                                <tr key={idx} className="border-b">
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
                      <CardContent className="pt-4 flex gap-2 text-destructive">
                        <XCircle className="h-5 w-5" />
                        <p>{importResult.message}</p>
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
                    <Progress value={45} className="w-64" />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
