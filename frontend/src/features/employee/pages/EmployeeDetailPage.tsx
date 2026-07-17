import React, { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Activity,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEmployeeDetail } from "../hooks/useEmployeeDetail";
import { useEmployeeKPI } from "../hooks/useEmployeeKPI";
import { EmployeeHeader } from "../components/detail/EmployeeHeader";
import { EmployeeKPIs } from "../components/detail/EmployeeKPIs";
import { EmployeeInfoGrid } from "../components/detail/EmployeeInfoGrid";
import { HandledDepotsTable } from "../components/detail/HandledDepotsTable";
import { AssignmentAnalytics } from "../components/detail/AssignmentAnalytics";
import { ActivityTimeline } from "../components/detail/ActivityTimeline";
import { EmployeeDocuments } from "../components/detail/EmployeeDocuments";
import { EditEmployeeDialog } from "@/features/employee/components/EditEmployeeDialog";
import { AssignDepotDialog } from "@/features/employee/components/AssignDepotDialog";
import { employeeService } from "@/services/employee-service";
import { depotService } from "@/services/depot-service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface EmployeeDetailPageProps {
  id?: string;
}

const EmployeeDetailPage: React.FC<EmployeeDetailPageProps> = ({ id: propId }) => {
  const params = useParams({ strict: false }) as { id?: string };
  const id = propId || params.id;
  const employeeId = id ? Number(id) : undefined;
  const queryClient = useQueryClient();

  // ── Data fetching ──
  const { data, isLoading: isEmployeeLoading, error: employeeError } = useEmployeeDetail(id);
  const { data: kpiData, isLoading: isKpiLoading } = useEmployeeKPI(employeeId);
  const employee = data?.employee;
  const handledDepots = data?.handledDepots || [];
  const validDepots = handledDepots.filter((depot) => depot.id != null);

  // ── Dialog states ──
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  // ── Fetch all depots for the assign dialog ──
  const {
    data: depots = [],
    isLoading: isLoadingDepots,
    isFetching: isFetchingDepots,
  } = useQuery({
    queryKey: ["depots-all"],
    queryFn: async () => {
      const list = await depotService.getAll();
      if (Array.isArray(list)) return list;
      if (Array.isArray((list as any)?.data)) return (list as any).data;
      return [];
    },
    enabled: !!employeeId && assignOpen,
    staleTime: 5 * 60 * 1000,
  });

  // ── Mutations ──
  const updateEmployee = useMutation({
    mutationFn: (payload: Partial<typeof employee>) =>
      employeeService.updateEmployee(employeeId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      toast.success("Employee updated successfully");
      setEditOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Update failed");
    },
  });

  const assignDepot = useMutation({
    mutationFn: (depotId: number) =>
      employeeService.assignDepot(employeeId!, depotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      toast.success("Depot assigned successfully");
      setAssignOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Assignment failed");
    },
  });

  const unassignDepot = useMutation({
    mutationFn: (depotId: number) => employeeService.unassignDepot(depotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      toast.success("Depot unassigned");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Unassign failed");
    },
  });

  // ── Export handlers ──
  const handleExportExcel = async () => {
    // Implement your export logic
    toast.success("Excel export started");
  };

  const handleExportPDF = () => {
    toast.success("PDF export started");
  };

  // ── Loading/Error states ──
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
      {/* Top Bar – unchanged */}
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
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Header Section */}
        <EmployeeHeader
          employee={employee}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
          onEdit={() => setEditOpen(true)}
          onAssign={() => setAssignOpen(true)}
        />

        {/* Edit Dialog */}
        <EditEmployeeDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          employee={employee}
          onSave={updateEmployee.mutate}
          isSaving={updateEmployee.isPending}
        />

        {/* Assign Depot Dialog */}
        <AssignDepotDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          employee={employee}
          depots={depots}
          onAssign={assignDepot.mutate}
          isAssigning={assignDepot.isPending}
          isLoadingDepots={isLoadingDepots || isFetchingDepots}
        />

        {/* KPI Section */}
        <EmployeeKPIs data={kpiData?.data} />

        {/* Tabs Section – unchanged */}
        <Tabs defaultValue="overview" className="space-y-6">
          {/* TabsList – unchanged */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800">
            <TabsList className="h-auto p-0 bg-transparent gap-8 rounded-none border-b-0">
              {[
                { id: "overview", label: "Overview", icon: LayoutDashboard },
                { id: "depots", label: "Handled Depots", icon: Building2 },
                { id: "analytics", label: "Performance", icon: BarChart3 },
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

          {/* Tab contents – unchanged */}
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
                <HandledDepotsTable
                  depots={validDepots}
                  onUnassign={(depotId) => unassignDepot.mutate(depotId)}
                  isUnassigning={unassignDepot.isPending}
                />
                <AssignmentAnalytics />
              </div>
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
                <Button
                  className="h-8 bg-zinc-900 text-[11px] font-bold uppercase tracking-widest text-white shadow-none hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  onClick={() => setAssignOpen(true)}
                >
                  Add Assignment
                </Button>
              </div>
              <HandledDepotsTable
                depots={validDepots}
                onUnassign={(depotId) => unassignDepot.mutate(depotId)}
                isUnassigning={unassignDepot.isPending}
              />
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
        </Tabs>
      </main>

      {/* Footer – unchanged */}
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