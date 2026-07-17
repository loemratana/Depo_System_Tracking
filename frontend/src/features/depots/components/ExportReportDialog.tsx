import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, FileText, FileSpreadsheet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { depotService } from "../services/depot-service";
import { toast } from "sonner";

interface ExportReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportReportDialog({ open, onOpenChange }: ExportReportDialogProps) {
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  const [groupBy, setGroupBy] = useState<"none" | "province">("none");

  const params: { fromDate?: string; toDate?: string; groupBy?: string } = {};
  if (fromDate) params.fromDate = format(fromDate, "yyyy-MM-dd");
  if (toDate) params.toDate = format(toDate, "yyyy-MM-dd");
  if (groupBy === "province") params.groupBy = "province";

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: "excel" | "pdf") => {
    if (!fromDate && !toDate && groupBy === "none") {
      if (!confirm("Exporting all depots. Continue?")) return;
    }
    
    setIsExporting(true);
    try {
      const response = await depotService.exportDepotReport(type, params);
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data as any], { 
        type: type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Use filename from Content-Disposition if available, else generate one
      let fileName = `depots_report_${format(new Date(), "yyyy-MM-dd")}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      const contentDisposition = response.headers?.['content-disposition'];
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) fileName = match[1];
      }
      
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onOpenChange(false);
      toast.success(`${type.toUpperCase()} exported successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Depot Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Date range (optional)</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {fromDate ? format(fromDate, "dd/MM/yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">→</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {toDate ? format(toDate, "dd/MM/yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFromDate(undefined); setToDate(undefined); }}
                className="h-8 text-xs"
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Group by province</Label>
            <RadioGroup value={groupBy} onValueChange={(val) => setGroupBy(val as any)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="flat" />
                <Label htmlFor="flat" className="text-xs">Flat list</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="province" id="province" />
                <Label htmlFor="province" className="text-xs">Yes</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => handleExport("excel")} disabled={isExporting} className="gap-2 bg-green-600">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button onClick={() => handleExport("pdf")} disabled={isExporting} className="gap-2 bg-blue-600">
            <FileText className="h-4 w-4 " /> PDF
          </Button>
        </DialogFooter>
        {isExporting && (
          <div className="mt-4">
            <Skeleton className="h-8 w-full" />
            <p className="text-center text-xs text-muted-foreground mt-2">Generating export, please wait...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}