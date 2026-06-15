import React, { useState, useEffect } from "react";
import { PageHeader, Surface, SectionTitle } from "@/components/ui-kit";
import { ProductPerformanceTable, AnalyticsRow } from "../components/ProductPerformanceTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const ProductAnalyticsPage: React.FC = () => {
  // Date states
  const [fromDate, setFromDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedDepot, setSelectedDepot] = useState("all-depots");
  const [selectedEmployee, setSelectedEmployee] = useState("all-employees");

  // Data states
  const [data, setData] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [depotOptions, setDepotOptions] = useState<{ id: number; name: string }[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<{ id: number; name: string }[]>([]);

  // Fetch filter options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [depotsRes, employeesRes] = await Promise.all([
          fetch("/api/v1/analytics/depots"),
          fetch("/api/v1/analytics/employees"),
        ]);
        const depotsJson = await depotsRes.json();
        const employeesJson = await employeesRes.json();
        if (depotsJson.success) setDepotOptions(depotsJson.data);
        if (employeesJson.success) setEmployeeOptions(employeesJson.data);
      } catch (error) {
        console.error("Failed to load filter options", error);
      }
    };
    fetchOptions();
  }, []);

  // Fetch performance data when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          fromDate,
          toDate,
          depotId: selectedDepot === "all-depots" ? "" : selectedDepot,
          employeeId: selectedEmployee === "all-employees" ? "" : selectedEmployee,
          search,
        });
        const res = await fetch(`/api/v1/analytics/performance?${params}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          toast.error("Failed to load performance data");
        }
      } catch (error) {
        console.error("Error fetching performance:", error);
        toast.error("Network error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fromDate, toDate, selectedDepot, selectedEmployee, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Performance"
        description="Monthly product performance analytics tracking sales, revenue, and growth trends."
      />

      <Surface padded className="space-y-4">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
          <div className="flex flex-1 gap-3 items-center w-full flex-wrap">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products or employees..."
                className="pl-9 bg-background/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={selectedDepot} onValueChange={setSelectedDepot}>
              <SelectTrigger className="w-[180px] bg-background/50">
                <SelectValue placeholder="All Depots" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-depots">All Depots</SelectItem>
                {depotOptions.map((depot) => (
                  <SelectItem key={depot.id} value={depot.id.toString()}>
                    {depot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[180px] bg-background/50">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-employees">All Employees</SelectItem>
                {employeeOptions.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-background/50 p-1 rounded-md border border-border/50">
              <span className="text-xs font-medium text-muted-foreground ml-2">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-32 h-8 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
              />
              <span className="text-xs font-medium text-muted-foreground">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-32 h-8 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
              />
            </div>
            <Button variant="outline" size="icon" title="More Filters">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Analytical Table */}
        <div className="pt-4 border-t border-border/50">
          <SectionTitle
            title="Performance Breakdown"
            meta={`Date Range: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`}
          />
          <div className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ProductPerformanceTable data={data} />
            )}
          </div>
        </div>
      </Surface>
    </div>
  );
};