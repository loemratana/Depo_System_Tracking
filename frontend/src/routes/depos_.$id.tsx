import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { depotService } from "@/services/depot-service";
import {
  exportDepotReportAsImage,
  exportDepotReportAsPDF,
  printDepotReport,
} from "@/utils/depotReport";
import {
  Building2,
  MapPin,
  Phone,
  User,
  AlertTriangle,
  Printer,
  FileText,
  Briefcase,
  Clock,
  Package,
  CheckCircle2,
  ArrowLeft,
  Image as ImageIcon,
  FileOutput,
  Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui-kit";

export const Route = createFileRoute("/depos_/$id")({
  component: DepotDetailPage,
});

const reportTone: Record<string, "success" | "warning" | "danger"> = {
  active: "success",
  expiring_soon: "warning",
  expired: "danger",
};

function DepotDetailPage() {
  const { id } = Route.useParams();
  const exportRef = React.useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const {
    data: depotData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["depot", id],
    queryFn: () => depotService.getDepotById(id),
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading depot report...
      </div>
    );
  }

  if (isError || !depotData) {
    return <div className="p-8 text-center text-destructive">Failed to load depot details.</div>;
  }

  // The API returns: { header, overview, owner, brands, employees, timeline }
  const raw = depotData?.data || depotData;

  // Support both new structured response and legacy flat shape
  const header = raw?.header || {};
  const overview = raw?.overview || {};
  const owner = raw?.owner || null;

  // Flatten for easy use
  const depotName = header.depotName || raw?.name || "Depot";
  const depotCode = header.depotCode || raw?.code || "";
  const status = (header.status || raw?.status || "ACTIVE").toLowerCase();
  const generatedAt = header.generatedAt
    ? new Date(header.generatedAt).toLocaleString()
    : new Date().toLocaleString();

  const phone = overview.phone || raw?.phone || "N/A";
  const createdDate = overview.createdAt
    ? new Date(overview.createdAt).toLocaleDateString()
    : "N/A";
  const district = overview.district || raw?.district || "N/A";
  const province = overview.province || raw?.city || "N/A";
  const addressStr = overview.address
    ? typeof overview.address === "string"
      ? overview.address
      : `${overview.address.houseNumber || ""} ${overview.address.street || ""} ${overview.address.village || ""}`.trim()
    : "No specific address";

  const ownerName = owner?.englishName || owner?.khmerName || owner?.name || "No Owner Assigned";
  const ownerPhone = owner?.phone || phone;
  const employeeCode = owner?.employeeCode || owner?.code || "EMP-N/A";

  // brands can be [{id, name}] or ["string"]
  const rawBrands: any[] = raw?.brands || [];
  const brandNames: string[] = rawBrands.map((b: any) => (typeof b === "string" ? b : b.name));

  // employees from API
  const employeesList: any[] = raw?.employees || [];

  // Timeline - use API data if available, else show created entry only
  const apiTimeline: any[] = raw?.timeline || [];
  const activities =
    apiTimeline.length > 0
      ? apiTimeline.map((t: any, i: number) => ({
          id: i,
          title: t.action,
          date: t.createdAt,
          icon: Clock,
          color: "text-primary",
        }))
      : [
          {
            id: 1,
            title: "License Renewed",
            date: "2024-05-12",
            icon: CheckCircle2,
            color: "text-green-500",
          },
          {
            id: 2,
            title: "Inventory Audit Completed",
            date: "2024-04-20",
            icon: FileText,
            color: "text-blue-500",
          },
          {
            id: 3,
            title: "Depot Created",
            date: createdDate,
            icon: Building2,
            color: "text-primary",
          },
        ];

  //Build reportData object for the utility functions
  const reportData = {
    id: Number(id),
    name: depotName,
    code: depotCode,
    status: status,
    city: province,
    district: district,
    ownerImage: owner?.images, // from your API
    email: owner?.email || "—", // optional
    employeeCode: owner?.employeeCode || "—",
    fullAddress: addressStr,
    owner: ownerName,
    ownerPhone: ownerPhone,
    phone: phone,
    createdAt: raw?.createdAt || createdDate,
    expiryDate: raw?.expiryDate,
    brands: brandNames,
  };

  // Handlers using the utility functions
  const handleExportPNG = async () => {
    setIsExporting(true);
    await exportDepotReportAsImage(reportData, "png");
    setIsExporting(false);
  };
  const handleExportJPEG = async () => {
    setIsExporting(true);
    await exportDepotReportAsImage(reportData, "jpeg");
    setIsExporting(false);
  };
  const handleExportPDF = async () => {
    setIsExporting(true);
    await exportDepotReportAsPDF(reportData);
    setIsExporting(false);
  };
  const handlePrint = () => printDepotReport(reportData);
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const cleanPath = path.replace(/^[/\\]+/, "").replace(/\\/g, "/");
    return `http://localhost:5000/${cleanPath}`;
  };
  console.log("Final URL:", getImageUrl(owner.images));
  return (
    <div className="bg-muted/20 min-h-screen">
      {/* Action Bar - Hidden during print/export */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 backdrop-blur px-6 py-3 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to="/depos">
              <ArrowLeft className="h-4 w-4" /> Back to Depots
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-sm font-medium">Report: {depotCode}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8"
            onClick={() => toast.info("Edit mode not implemented")}
          >
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8"
            onClick={handleExportPNG}
            disabled={isExporting}
          >
            <ImageIcon className="h-3.5 w-3.5" /> PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8"
            onClick={handleExportJPEG}
            disabled={isExporting}
          >
            <ImageIcon className="h-3.5 w-3.5" /> JPG
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8"
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            <FileOutput className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-8" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* Exportable Container – kept for reference, but the utilities don't rely on it */}
      <div
        ref={exportRef}
        className={cn(
          "mx-auto max-h-screen p-6 lg:p-10 transition-all",
          isExporting ? "bg-white p-12" : "bg-transparent",
        )}
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div className="flex gap-4 items-center">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20 shrink-0">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{depotName}</h1>
                <StatusBadge tone={reportTone[status] || "muted"}>
                  {status.toUpperCase()}
                </StatusBadge>
              </div>
              <p className="text-muted-foreground text-sm flex items-center gap-4">
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                  {depotCode}
                </span>
                <span>Created: {createdDate}</span>
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground flex flex-col items-end">
            <p>Generated: {generatedAt}</p>
            <p className="mt-1 font-medium text-primary">Confidential Executive Report</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                Total Products
              </span>
              <span className="text-2xl font-bold text-foreground">1,432</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                Employees
              </span>
              <span className="text-2xl font-bold text-foreground">4</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                Brands Assigned
              </span>
              <span className="text-2xl font-bold text-foreground">{brandNames.length}</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-4 flex flex-col justify-center">
              <span className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                License Status
              </span>
              <span
                className={cn(
                  "text-xl font-bold",
                  status === "expired" ? "text-destructive" : "text-success",
                )}
              >
                {status === "expired" ? "Action Req." : "Valid"}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Grid Layout for Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (Wider) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Overview & Owner Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overview Card */}
              <Card className="shadow-sm overflow-hidden border-border/60">
                <div className="h-1 w-full bg-blue-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" /> Depot Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-muted-foreground">Reg Code:</span>
                    <span className="col-span-2 font-medium">{depotCode}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-muted-foreground">Main Phone:</span>
                    <span className="col-span-2 font-medium">{phone}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-muted-foreground">Standing:</span>
                    <span className="col-span-2 font-medium capitalize">
                      {status.replace("_", " ")}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Owner Information Card */}
              <Card className="shadow-sm overflow-hidden border-border/60">
                <div className="h-1 w-full bg-purple-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" /> Owner Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm flex items-start gap-4">
                  <div className="relative h-10 w-10 shrink-0">
                    {owner?.images ? (
                      <img
                        src={getImageUrl(owner.images)}
                        alt={ownerName}
                        className="h-10 w-10 rounded-full object-cover border-2 border-border"
                        onError={() => {
                          console.log("Image failed:", getImageUrl(owner.images));
                        }}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {ownerName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground truncate">{ownerName}</h4>
                    <p className="text-muted-foreground text-xs">{employeeCode}</p>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mt-2">
                      <Phone className="h-3 w-3" /> {ownerPhone}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Location Card */}
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> Location & Geography
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-5 space-y-4 text-sm border-r border-border/40">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Province / City</p>
                      <p className="font-medium text-foreground">{province}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">District</p>
                      <p className="font-medium text-foreground">{district}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Full Address</p>
                      <p className="font-medium text-foreground leading-relaxed">{addressStr}</p>
                    </div>
                  </div>
                  {/* Map Placeholder */}
                  <div className="bg-muted/30 p-5 flex flex-col items-center justify-center text-center">
                    <div className="h-20 w-20 rounded-full bg-muted border border-border/50 flex items-center justify-center mb-3 text-muted-foreground/50">
                      <MapPin className="h-8 w-8" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Map Location Saved</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">11.5564° N, 104.9282° E</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Brand & Inventory */}
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" /> Managed Brands & Assets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="mb-6">
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                    Authorized Brands
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {brandNames.length > 0 ? (
                      brandNames.map((b: string) => (
                        <Badge
                          key={b}
                          variant="secondary"
                          className="px-3 py-1 font-medium bg-primary/5 text-primary border-primary/20"
                        >
                          {b}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No brands assigned</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                    Key Asset Summary
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="border border-border/50 rounded-md p-3 text-sm">
                      <div className="text-muted-foreground mb-1">Coolers</div>
                      <div className="font-bold text-lg">12</div>
                    </div>
                    <div className="border border-border/50 rounded-md p-3 text-sm">
                      <div className="text-muted-foreground mb-1">Display Racks</div>
                      <div className="font-bold text-lg">45</div>
                    </div>
                    <div className="border border-destructive/30 bg-destructive/5 rounded-md p-3 text-sm">
                      <div className="text-destructive mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> POS Material
                      </div>
                      <div className="font-bold text-lg text-destructive">Low</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Narrower) */}
          <div className="flex flex-col gap-6">
            {/* Employee Assignments */}
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" /> Assigned Staff
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {employeesList.length > 0 ? (
                    employeesList.map((emp: any) => {
                      const initials = (emp.name || "?")
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase();
                      const colors = [
                        "bg-blue-100 text-blue-600",
                        "bg-amber-100 text-amber-600",
                        "bg-green-100 text-green-600",
                        "bg-purple-100 text-purple-600",
                      ];
                      const colorClass = colors[employeesList.indexOf(emp) % colors.length];
                      return (
                        <div
                          key={emp.id}
                          className="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                        >
                          <div
                            className={`h-8 w-8 rounded flex items-center justify-center font-bold text-xs ${colorClass}`}
                          >
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {emp.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {emp.position || emp.assignmentType || "Staff"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                        ?
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">No employees assigned</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-border/40 bg-muted/20 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-primary print:hidden"
                  >
                    Manage Staff
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="shadow-sm border-border/60 flex-1">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-6">
                  {activities.map((activity, index) => {
                    const isLast = index === activities.length - 1;
                    return (
                      <div key={activity.id} className="relative flex gap-4">
                        {!isLast && (
                          <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-border" />
                        )}
                        <div
                          className={cn(
                            "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background ring-2 ring-background",
                            activity.color,
                          )}
                        >
                          <activity.icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col pt-0.5">
                          <p className="text-sm font-medium text-foreground">{activity.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{activity.date}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer for Export only */}
        <div className="mt-12 text-center text-xs text-muted-foreground border-t border-border/40 pt-4 hidden print:block">
          This report is auto-generated by the Depot Tracking System. Confidential.
        </div>
      </div>
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
