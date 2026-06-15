import React from "react";
import {
  LayoutDashboard,
  Building2,
  History,
  BarChart3,
  Files,
  Activity,
  Settings2,
  Briefcase,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams } from "@tanstack/react-router";
import { useEmployeeDetail } from "../hooks/useEmployeeDetail";
import { useEmployeeKPI } from "../hooks/useEmployeeKPI";
import { EmployeeHeader } from "../components/detail/EmployeeHeader";
import { EmployeeKPIs } from "../components/detail/EmployeeKPIs";
import { EmployeeInfoGrid } from "../components/detail/EmployeeInfoGrid";
import { HandledDepotsTable } from "../components/detail/HandledDepotsTable";
import { AssignmentAnalytics } from "../components/detail/AssignmentAnalytics";
import { ActivityTimeline } from "../components/detail/ActivityTimeline";
import { EmployeeDocuments } from "../components/detail/EmployeeDocuments";
import { exportEmployeeToExcel, exportEmployeeToPDF } from '@/utils/employeeReportDetailUtils';
import { toast } from "sonner";

interface EmployeeDetailPageProps {
  id?: string;
}

const EmployeeDetailPage: React.FC<EmployeeDetailPageProps> = ({ id: propId }) => {
  const { id: routeId } = useParams({
    from: "/employees_/$id",
    strict: false,
  });
  const id = propId || routeId;
  const employeeId = id ? Number(id) : undefined;

  const { data, isLoading: isEmployeeLoading, error: employeeError } = useEmployeeDetail(id);
  const { data: kpiData, isLoading: isKpiLoading } = useEmployeeKPI(employeeId);
  console.log(kpiData)
  const employee = data?.employee;
  const handledDepots = data?.handledDepots || [];
  const validDepots = handledDepots.filter((depot) => depot.id != null);

  const handleExportExcel = async () => {
  if (!employee) return;
  await exportEmployeeToExcel(employee, handledDepots, {
    totalDepots: kpiData?.totalDepots ?? handledDepots.length,
    expiredDepots: kpiData?.expiredDepots ?? 0,
  });
  toast.success('Excel report exported');
};

const handleExportPDF = () => {
  if (!employee) return;
  exportEmployeeToPDF(employee, handledDepots, {
    totalDepots: kpiData?.totalDepots ?? handledDepots.length,
    expiredDepots: kpiData?.expiredDepots ?? 0,
  });
  toast.success('PDF report exported');
};


  if (isEmployeeLoading || isKpiLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Activity className="h-8 w-8 animate-spin text-zinc-400" />
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">
            Loading Personnel Data...
          </span>
        </div>
      </div>
    );
  }

  if (employeeError || !employee) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-[13px] text-zinc-500">
          Failed to load employee data. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Operational Bar */}
      <div className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <span className="text-[14px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Brand Depot Ops
            </span>
            <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-2" />
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Workforce Tracking
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <span className="text-[10px] font-bold text-zinc-500">SYS_ID:</span>
              <span className="text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                BD-OPS-2026
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <button className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Header Section */}
        <EmployeeHeader employee={employee} onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
        />

        {/* KPI Section – pass kpiData (maybe undefined, component  fallback) */}
        <EmployeeKPIs data={kpiData?.data} />
        {/* Tabs Section */}
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800">
            <TabsList className="h-auto p-0 bg-transparent gap-8 rounded-none border-b-0">
              {[
                { id: "overview", label: "Overview", icon: LayoutDashboard },
                { id: "depots", label: "Handled Depots", icon: Building2 },
                // { id: "assignments", label: "Assignments", icon: Briefcase },
                { id: "analytics", label: "Performance", icon: BarChart3 },
                // { id: "activity", label: "Activity Logs", icon: History },
                // { id: "documents", label: "Documents", icon: Files },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="data-[state=active]:bg-transparent data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 dark:data-[state=active]:border-zinc-100 rounded-none px-0 py-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400 transition-all hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <div className="flex items-center gap-2">
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="pb-3 text-[11px] font-medium text-zinc-400">
              Last synced: <span className="text-zinc-600 dark:text-zinc-300">Just now</span>
            </div>
          </div>

          <TabsContent value="overview" className="mt-0 space-y-6 outline-none">
            <EmployeeInfoGrid employee={employee} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                    Active Handled Depots
                  </h3>
                  <button className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 hover:underline">
                    View All
                  </button>
                </div>
                <HandledDepotsTable depots={validDepots} />
                <AssignmentAnalytics />
              </div>
              {/*<div className="space-y-6">*/}
              {/*  <ActivityTimeline />*/}
              {/*  <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm">*/}
              {/*    <div className="flex items-center gap-2 mb-3">*/}
              {/*      <div className="h-7 w-7 rounded-full bg-white/20 dark:bg-zinc-900/10 flex items-center justify-center">*/}
              {/*        <Activity className="h-3.5 w-3.5" />*/}
              {/*      </div>*/}
              {/*      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">*/}
              {/*        Coverage Alert*/}
              {/*      </span>*/}
              {/*    </div>*/}
              {/*    <p className="text-[13px] font-medium leading-relaxed mb-4 opacity-90">*/}
              {/*      Oddar Meanchey Hub is currently overdue for inspection. Regional manager has*/}
              {/*      been notified.*/}
              {/*    </p>*/}
              {/*    <Button className="w-full h-8 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-md text-[11px] font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-none border-none">*/}
              {/*      Take Action*/}
              {/*    </Button>*/}
              {/*  </div>*/}
              {/*</div>*/}
            </div>
          </TabsContent>

          <TabsContent value="depots" className="mt-0 outline-none">
            <Card className="shadow-none border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-0.5">
                  <h2 className="text-[16px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Depot Portfolio
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    Manage and track all logistics hubs assigned to this operative.
                  </p>
                </div>
                <Button className="h-8 text-[11px] font-bold uppercase tracking-widest bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-none">
                  Add Assignment
                </Button>
              </div>
              <HandledDepotsTable depots={validDepots} />
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-0 outline-none">
            <div className="space-y-6">
              <AssignmentAnalytics />
              <Card className="shadow-none border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
                <div className="h-[300px] flex items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-100 dark:border-zinc-900 rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <BarChart3 className="h-6 w-6 opacity-20" />
                    <span className="text-[11px] font-medium italic">
                      Detailed historical analytics loading...
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-0 outline-none">
            <div className="max-w-4xl">
              <ActivityTimeline />
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-0 outline-none">
            <EmployeeDocuments />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer Audit Info */}
      <footer className="max-w-[1600px] mx-auto px-6 py-10 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 opacity-30">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Data Integrity Verified
              </span>
              <span className="text-[10px] font-mono tracking-tighter">
                HASH: 8824-AAB-992-OPERATIONAL
              </span>
            </div>
          </div>
          <div className="text-[10px] font-medium text-zinc-500">
            &copy; 2026 Brand Depot Tracking • Ops Workforce Unit
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EmployeeDetailPage;
