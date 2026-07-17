import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ImportDepotButton from "@/features/depots/components/ImportDepotButton";
import { DeleteDepotDialog } from "@/features/depots/components/DeleteDepotDialog";
import { EditDepotDialog } from "@/features/depots/components/EditDepotDialog";
import { AssignEmployeeDialog } from "@/features/depots/components/AssignEmployeeDialog";
import { ManageStaffDialog } from "@/features/depots/components/ManageStaffDialog";
import { generateDepotReport } from "@/utils/reportUtils";
import { ExportReportDialog } from "@/features/depots/components/ExportReportDialog";
import { DepotForm, DepotFormData } from "@/features/depots/components/CreateDepotForm.tsx";
import {
  Download,
  MoreHorizontal,
  Plus,
  Search,
  Building2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  User,
  MapPin,
  Tag,
  Eye,
  Edit,
  UserPlus,
  FileText,
  Trash2,
  Users,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, StatusBadge, Surface } from "@/components/ui-kit";
import { KpiSummaryGrid } from "@/features/kpi/components/KpiSummaryGrid";
import { useDepotKpiSummary } from "@/features/kpi/hooks/useKpiSummary";
import { depotService } from "@/services/depot-service";
import { employeeService } from "@/services/employee-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MultiSelect } from "@/components/filters/multi-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { locationService } from "@/features/depots/services/location-service";
import { brandService } from "@/features/brand/services/brandService.ts";
import { FaTelegramPlane } from "react-icons/fa";

export type DeposSearch = {
  search: string;
  page: number;
  pageSize: number;
  province: string;
  district: string;
  brand: string;
  status: string;
  owner: string;
};

function csvToSet(value?: string) {
  return new Set((value || "").split(",").map((s) => s.trim()).filter(Boolean));
}

function setToCsv(values: Set<string>) {
  return Array.from(values).join(",");
}

export const Route = createFileRoute("/depos")({
  validateSearch: (search: Record<string, unknown>): DeposSearch => {
    const page = Number(search.page);
    const pageSize = Number(search.pageSize);
    const province =
      typeof search.province === "string"
        ? search.province
        : typeof search.provinceName === "string"
          ? search.provinceName
          : "";
    const brand =
      typeof search.brand === "string"
        ? search.brand
        : typeof search.brandName === "string"
          ? search.brandName
          : "";
    return {
      search: typeof search.search === "string" ? search.search : "",
      page: Number.isFinite(page) && page > 0 ? page : 1,
      pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 20,
      province,
      district: typeof search.district === "string" ? search.district : "",
      brand,
      status: typeof search.status === "string" ? search.status : "",
      owner: typeof search.owner === "string" ? search.owner : "",
    };
  },
  head: () => ({
    meta: [{ title: "Manager Report — Brand Depot" }],
  }),
  component: DeposPage,
});

const reportTone: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  active: "success",
  vacancy: "info",
  expiring_soon: "warning",
  expired: "danger",
  inactive: "muted",
};

function getDepotReportStatus(depot: {
  status?: string;
  expiredDate?: string | Date | null;
}): string {
  if (depot.status === "vacancy") return "vacancy";
  const expiry = depot.expiredDate ? new Date(depot.expiredDate) : null;
  if (expiry) {
    const now = new Date();
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(now.getDate() + 30);
    if (expiry < now) return "expired";
    if (expiry <= thirtyDaysLater) return "expiring_soon";
  }
  return depot.status || "active";
}

import AutocompleteInput from "@/features/depots/components/AutocompleteInput";
import { Brand } from "@/features/brand/types/brand.types.ts";
import { useMemo } from "react";

function DeposPage() {
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = React.useState(searchParams.search);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedDepotForEdit, setSelectedDepotForEdit] = React.useState(null);
  const [assignEmployeeOpen, setAssignEmployeeOpen] = React.useState(false);
  const [selectedDepotForAssign, setSelectedDepotForAssign] = React.useState<any>(null);
  const [staffDialogOpen, setStaffDialogOpen] = React.useState(false);
  const [selectedDepotForStaff, setSelectedDepotForStaff] = React.useState<any>(null);

  const selectedOwners = React.useMemo(() => csvToSet(searchParams.owner), [searchParams.owner]);
  const selectedProvinces = React.useMemo(
    () => csvToSet(searchParams.province),
    [searchParams.province],
  );
  const selectedDistricts = React.useMemo(
    () => csvToSet(searchParams.district),
    [searchParams.district],
  );
  const selectedBrands = React.useMemo(() => csvToSet(searchParams.brand), [searchParams.brand]);
  const selectedStatuses = React.useMemo(() => csvToSet(searchParams.status), [searchParams.status]);
  const page = searchParams.page;
  const pageSize = searchParams.pageSize;

  const updateSearch = React.useCallback(
    (patch: Partial<DeposSearch>) => {
      navigate({
        search: (prev) => {
          const next = { ...prev, ...patch };
          const filterKeys: (keyof DeposSearch)[] = [
            "search",
            "province",
            "district",
            "brand",
            "status",
            "owner",
            "pageSize",
          ];
          const filtersChanged = filterKeys.some(
            (key) => patch[key] !== undefined && patch[key] !== prev[key],
          );
          if (filtersChanged && patch.page === undefined) next.page = 1;
          return next;
        },
        replace: true,
      });
    },
    [navigate],
  );

  React.useEffect(() => {
    setSearchInput(searchParams.search);
  }, [searchParams.search]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput === searchParams.search) return;
      updateSearch({ search: searchInput });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, searchParams.search, updateSearch]);

  // Form State
  const [formData, setFormData] = React.useState({
    code: "",
    name: "",
    khmerName: "",
    provinceName: "",
    districtName: "",
    employeeId: null as number | null,
    employeeName: "",
    phone: "",
    address: "",
    homeNumber: "",
    street: "",
    village: "",
    commune: "",
    expiryDate: "",
    brandName: "",
    brandId: null as number | null,
  });

  const { data: provincesData, isLoading: provincesLoading } = useQuery({
    queryKey: ["provinces"],
    queryFn: locationService.getProvinces,
    staleTime: 10 * 60 * 1000,
  });

  const { data: brandsData } = useQuery({
    queryKey: ["brands", "", ""],
    queryFn: () => brandService.getAllFilter({ search: "", status: "" }),
    staleTime: 10 * 60 * 1000,
  });

  const brandNameOptions = useMemo(() => {
    const brands = brandsData ?? [];
    return brands.map((b: any) => b.name);
  }, [brandsData]);

  const allBrands = useMemo(() => brandsData ?? [], [brandsData]);

  const selectedProvinceId = React.useMemo(() => {
    if (!provincesData || !formData.provinceName) return undefined;
    const provinces = provincesData.data ?? provincesData;
    const province = provinces.find((p: any) => p.name === formData.provinceName);
    return province?.id;
  }, [provincesData, formData.provinceName]);

  const masterProvinces = React.useMemo(() => {
    if (!provincesData) return [];
    const provinces = provincesData.data ?? provincesData;
    return provinces.map((p: any) => p.name);
  }, [provincesData]);

  const { data: districtsData, isLoading: districtsLoading } = useQuery({
    queryKey: ["districts"],
    queryFn: () => locationService.getDistricts(),
    staleTime: 10 * 60 * 1000,
  });

  const masterDistricts = React.useMemo(() => {
    if (!districtsData) return [];
    const districts = districtsData.data ?? districtsData;
    if (formData.provinceName) {
      return districts
        .filter((d: any) => d.province?.name === formData.provinceName)
        .map((d: any) => d.name);
    }
    return districts.map((d: any) => d.name);
  }, [districtsData, formData.provinceName]);

  const { data: response, isLoading, isFetching } = useQuery({
    queryKey: ["depots", "list", searchParams],
    queryFn: () =>
      depotService.getDepots({
        page: searchParams.page,
        pageSize: searchParams.pageSize,
        search: searchParams.search || undefined,
        province: searchParams.province || undefined,
        district: searchParams.district || undefined,
        brand: searchParams.brand || undefined,
        status: searchParams.status || undefined,
        owner: searchParams.owner || undefined,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

  const { data: employeesResponse } = useQuery({
    queryKey: ["employees", "depot-page"],
    queryFn: () => employeeService.getEmployees({ page: 1, pageSize: 500 }),
    staleTime: 10 * 60 * 1000,
  });

  // Create Depot Mutation
  const createMutation = useMutation({
    mutationFn: depotService.createDepot,
    onSuccess: () => {
      toast.success("Depot created successfully");
      queryClient.invalidateQueries({ queryKey: ["depots"] });
      setIsDialogOpen(false);
      setFormData({
        code: "",
        name: "",
        khmerName: "",
        provinceName: "",
        districtName: "",
        employeeId: null,
        employeeName: "",
        phone: "",
        address: "",
        homeNumber: "",
        street: "",
        village: "",
        commune: "",
        expiryDate: "",
        brandId: null,
        brandName: "",
      });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create depot");
    },
  });

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/v1/depots/template", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "depot_import_template.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };
  const depots = response?.data || [];
  const pagination = response?.pagination || {
    page: 1,
    pageSize,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  // Transform data for UI
  const enhancedDepots = depots.map((d: any) => {
    return {
      ...d,
      reportStatus: getDepotReportStatus(d),
      ownerId: d.owner?.id,
      owner: d.owner?.name || "No Owner Assigned",
      ownerImage: d.owner?.image || null,
      phone: d.phone || "N/A",
      ownerPhone: d.owner?.phone || "N/A",
      nationalId: d.owner?.code || "N/A",
      brands: d.brand ? [d.brand.name] : [],
      staffCount: d.staffCount ?? 0,
      email: d.owner?.email || d.email?.email,
      createdAt: d.createdAt
        ? new Date(d.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "N/A",
      fullAddress: d.address,
    };
  });
  const filtered = enhancedDepots;

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      employeeId: formData.employeeId, // number or null
      // brandIds: brandId ? [brandId] : [],   //correct: array of IDs
    });
  };

  const totalDepots = pagination.total ?? 0;

  const ownerOptions = React.useMemo(() => {
    const employees =
      employeesResponse?.employees ||
      employeesResponse?.data?.employees ||
      employeesResponse?.data ||
      [];
    const names: string[] = [];
    const seen = new Set<string>();
    for (const emp of employees as any[]) {
      const name = emp.englishName || emp.khmerName;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
    for (const depot of enhancedDepots) {
      const name = depot.owner as string;
      if (!name || name === "No Owner Assigned" || name === "Unknown" || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
    names.sort((a, b) => a.localeCompare(b));
    return names.map((name) => ({ label: name, value: name }));
  }, [employeesResponse, enhancedDepots]);

  const provinceOptions = React.useMemo(() => {
    return masterProvinces.map((name: string) => ({ label: name, value: name }));
  }, [masterProvinces]);

  const districtOptions = React.useMemo(() => {
    const districts = districtsData?.data ?? districtsData ?? [];
    let sourceDistricts = districts;
    if (selectedProvinces.size > 0) {
      sourceDistricts = districts.filter((d: any) => selectedProvinces.has(d.province?.name));
    }
    const names = Array.from(
      new Set(sourceDistricts.map((d: any) => d.name).filter(Boolean)),
    ) as string[];
    return names.map((name) => ({ label: name, value: name }));
  }, [districtsData, selectedProvinces]);

  const brandOptions = React.useMemo(() => {
    if (!brandsData) return [];
    return brandsData.map((brand: any) => ({
      label: brand.name,
      value: brand.name,
    }));
  }, [brandsData]);

  const statusOptions = [
    { label: "Active", value: "active" },
    { label: "Vacancy", value: "vacancy" },
    { label: "Expiring Soon", value: "expiring_soon" },
    { label: "Expired", value: "expired" },
  ];

  const handleStatusClick = (status: string) => {
    if (status === "all") {
      updateSearch({ status: "" });
    } else {
      updateSearch({ status });
    }
  };

  const handleBrandClick = (brand: string) => {
    if (selectedBrands.size === 1 && selectedBrands.has(brand)) {
      updateSearch({ brand: "", status: "" });
      return;
    }
    updateSearch({ brand, status: "" });
  };

  const selectedBrandIds = useMemo(() => {
    if (!allBrands.length || selectedBrands.size === 0) return [];
    return allBrands
      .filter((b: Brand) => selectedBrands.has(b.name))
      .map((b: Brand) => b.id);
  }, [allBrands, selectedBrands]);

  const selectedBrandLabel =
    selectedBrands.size === 1
      ? Array.from(selectedBrands)[0]
      : selectedBrands.size > 1
        ? `${selectedBrands.size} brands`
        : null;
  //=============================================

  // delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedDepot, setSelectedDepot] = React.useState(null);

  const handleDeleteClick = (depot: any) => {
    setSelectedDepot(depot);
    setDeleteDialogOpen(true);
  };
  const handleEditClick = (depot: any) => {
    setSelectedDepotForEdit(depot);
    setEditDialogOpen(true);
  };

  const handleAssignEmployeeClick = (depot: any) => {
    setSelectedDepotForAssign(depot);
    setAssignEmployeeOpen(true);
  };

  const handleManageStaffClick = (depot: any) => {
    setSelectedDepotForStaff(depot);
    setStaffDialogOpen(true);
  };

  const confirmDeleteMutation = useMutation({
    mutationFn: ({ id }: { id: number }) => depotService.deleteDepot(id),
    onSuccess: () => {
      toast.success("Depot deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["depots"] });
      setDeleteDialogOpen(false);
      setSelectedDepot(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to delete depot");
    },
  });
  const { data: counts, isLoading: countsLoading } = useDepotKpiSummary({
    brandIds: selectedBrandIds.length ? selectedBrandIds : undefined,
  });

  const displayCounts = counts ?? {
    total: 0,
    vacancy: 0,
    expired: 0,
    expiringSoon: 0,
  };

  const depotKpiCards = [
    {
      id: "total",
      label: "Total Depots",
      value: displayCounts.total,
      icon: Building2,
      hint: selectedBrandLabel ? `${selectedBrandLabel} depots` : "All time operations",
      accent: "primary" as const,
      selected: selectedStatuses.size === 0,
      onClick: () => handleStatusClick("all"),
    },
    {
      id: "vacancy",
      label: "Vacancy",
      value: displayCounts.vacancy,
      icon: Users,
      hint: selectedBrandLabel ? `${selectedBrandLabel} vacancies` : "Open positions",
      trend: "up" as const,
      accent: "info" as const,
      selected: selectedStatuses.has("vacancy"),
      onClick: () => handleStatusClick("vacancy"),
    },
    {
      id: "expiring",
      label: "Expiring Soon",
      value: displayCounts.expiringSoon,
      icon: AlertTriangle,
      hint: selectedBrandLabel ? `${selectedBrandLabel} expiring` : "Action required (30d)",
      trend: "down" as const,
      accent: "warning" as const,
      selected: selectedStatuses.has("expiring_soon"),
      onClick: () => handleStatusClick("expiring_soon"),
    },
    {
      id: "expired",
      label: "Expired Licenses",
      value: displayCounts.expired,
      icon: XCircle,
      hint: selectedBrandLabel ? `${selectedBrandLabel} expired` : "Past due",
      trend: "flat" as const,
      accent: "danger" as const,
      selected: selectedStatuses.has("expired"),
      onClick: () => handleStatusClick("expired"),
    },
  ];

  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const cleanPath = path.replace(/^[/\\]+/, "").replace(/\\/g, "/");
    const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
    return `${base}/${cleanPath}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manager Report Dashboard"
        description="Comprehensive overview of depot operations and license statuses."
        actions={
          <>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 bg-blue-600 text-[12px] text-white shadow-sm hover:bg-blue-700">
                  <Plus className="h-3.5 w-3.5" /> New Depot
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Depot</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Fill in all required information below.
                  </DialogDescription>
                </DialogHeader>
                <DepotForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleCreate}
                  isPending={createMutation.isPending}
                  allBrands={allBrands}
                  brandNameOptions={brandNameOptions}
                  provinces={masterProvinces}
                  districts={masterDistricts}
                  provincesLoading={provincesLoading}
                  districtsLoading={districtsLoading}
                  employees={
                    employeesResponse?.employees || employeesResponse?.data?.employees || []
                  }
                  employeesLoading={!employeesResponse}
                />
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="h-8 gap-1.5 text-[12px]"
            >
              <Download className="h-3.5 w-3.5" /> Download Template
            </Button>
            <ImportDepotButton />

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2"
              onClick={() => setExportDialogOpen(true)}
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </>
        }
      />

      <KpiSummaryGrid
        cards={depotKpiCards}
        columns={4}
        isLoading={countsLoading}
        scopeLabel={selectedBrandLabel}
        onClearScope={selectedBrandLabel ? () => updateSearch({ brand: "" }) : undefined}
      />

      <Surface padded={false} className="relative z-0">
        <div className="flex flex-col gap-3 border-b border-border/70 bg-card/80 p-4 backdrop-blur-md sticky top-0 z-20 supports-[backdrop-filter]:bg-card/70">
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by code, name, city, owner…"
                className="h-10 w-full rounded-lg border border-input/80 bg-background/60 pl-10 pr-3 text-sm shadow-sm transition-all duration-200 placeholder:text-muted-foreground/70 focus-visible:border-primary/30 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15"
              />
            </div>
            <div className="flex items-center gap-2">
              {(selectedOwners.size > 0 ||
                selectedProvinces.size > 0 ||
                selectedDistricts.size > 0 ||
                selectedBrands.size > 0 ||
                selectedStatuses.size > 0 ||
                searchParams.search !== "" ||
                searchInput !== "") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchInput("");
                    updateSearch({
                      search: "",
                      owner: "",
                      province: "",
                      district: "",
                      brand: "",
                      status: "",
                      page: 1,
                    });
                  }}
                  className="h-8 px-2 text-xs"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MultiSelect
              title="Sales Supervisor"
              options={ownerOptions}
              selectedValues={selectedOwners}
              onSelect={(vals) => updateSearch({ owner: setToCsv(vals) })}
            />
            <MultiSelect
              title="Province"
              options={provinceOptions}
              selectedValues={selectedProvinces}
              onSelect={(vals) =>
                updateSearch({ province: setToCsv(vals), district: "" })
              }
            />
            <MultiSelect
              title="District"
              options={districtOptions}
              selectedValues={selectedDistricts}
              onSelect={(vals) => updateSearch({ district: setToCsv(vals) })}
            />
            <MultiSelect
              title="Brands"
              options={brandOptions}
              selectedValues={selectedBrands}
              onSelect={(vals) => updateSearch({ brand: setToCsv(vals), status: "" })}
            />
            <MultiSelect
              title="Status"
              options={statusOptions}
              selectedValues={selectedStatuses}
              onSelect={(vals) => updateSearch({ status: setToCsv(vals) })}
            />
            {isFetching && !isLoading && (
              <span className="text-[11px] text-muted-foreground">Updating…</span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[320px]">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-muted/50"
                  style={{ animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Building2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No depots found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 z-10 bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className="w-8 px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-border accent-primary"
                      checked={
                        selected.size > 0 &&
                        selected.size === filtered.length &&
                        filtered.length > 0
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked ? new Set(filtered.map((d: any) => d.id)) : new Set(),
                        )
                      }
                    />
                  </th>
                  <th className="w-8 px-1 py-2.5"></th>
                  <th className="px-3 py-2.5 text-left font-medium">Owner</th>
                  <th className="px-3 py-2.5 text-left font-medium">Sales Supervisor</th>
                  <th className="px-3 py-2.5 text-left font-medium">Location</th>
                  <th className="px-3 py-2.5 text-left font-medium">Brands</th>
                  <th className="px-3 py-2.5 text-left font-medium">Created Date</th>
                  <th className="px-3 py-2.5 text-left font-medium">Status</th>
                  <th className="w-8 px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((d: any) => {
                  const telegramPhone = d.ownerPhone?.replace(/\s+/g, "").replace(/^0/, "+855");
                  const isExpanded = expandedRows.has(d.id);
                  return (
                    <React.Fragment key={d.id}>
                      <tr
                        className={cn(
                          isExpanded ? "bg-muted/25" : "hover:bg-muted/20",
                        )}
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected.has(d.id)}
                            onChange={() => toggleSelect(d.id)}
                            className="h-3.5 w-3.5 rounded border-border accent-primary"
                          />
                        </td>
                        <td className="px-1 py-2.5 text-center">
                          <button
                            onClick={() => toggleExpand(d.id)}
                            className="rounded-md p-1 text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform duration-200",
                                isExpanded ? "rotate-0" : "-rotate-90",
                              )}
                            />
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {d.name}{" "}
                              {d.khmerName && (
                                <span className="text-muted-foreground/80 font-normal">
                                  ({d.khmerName})
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-[10.5px] text-muted-foreground">
                              {d.code}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {d.ownerId ? (
                            <Link
                              to="/employees/$id"
                              params={{ id: String(d.ownerId) }}
                              className="flex items-center gap-2.5 hover:bg-muted/40 rounded-md p-1 transition-colors"
                            >
                              <div className="relative h-8 w-8 shrink-0">
                                {d.ownerImage ? (
                                  <img
                                    src={getImageUrl(d.ownerImage)}
                                    alt={d.owner}
                                    className="h-8 w-8 rounded-full object-cover border-2 border-border"
                                    onError={(e) => {
                                      console.error(
                                        "Image failed to load:",
                                        getImageUrl(d.ownerImage),
                                      );
                                      e.currentTarget.style.display = "none";
                                      const fallback = e.currentTarget
                                        .nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = "flex";
                                    }}
                                  />
                                ) : null}
                                <span
                                  style={{ display: d.ownerImage ? "none" : "flex" }}
                                  className="h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white uppercase"
                                >
                                  {d.owner
                                    ? d.owner
                                        .split(" ")
                                        .map((n: string) => n[0])
                                        .join("")
                                        .substring(0, 2)
                                    : "?"}
                                </span>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[12.5px] font-medium text-foreground truncate hover:text-blue-600">
                                  {d.owner}
                                </span>
                                <span className="text-[10.5px] text-muted-foreground">Owner</span>
                              </div>
                            </Link>
                          ) : (
                            // No owner assigned fallback (unchanged)
                            <div className="flex items-center gap-2.5 rounded-md p-1">
                              <div className="relative h-8 w-8 shrink-0">
                                <span className="h-8 w-8 flex items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground uppercase">
                                  ?
                                </span>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[12.5px] font-medium text-muted-foreground truncate">
                                  No Owner Assigned
                                </span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col">
                            <span className="text-foreground/80">{d.district}</span>
                            <span className="text-[10.5px] text-muted-foreground">{d.city}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-foreground/80">
                          <div className="flex gap-1 flex-wrap">
                            {d.brands.map((b: string) => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => handleBrandClick(b)}
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap transition-all duration-200",
                                  selectedBrands.has(b)
                                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                    : "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
                                )}
                              >
                                {b}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{d.createdAt}</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge tone={reportTone[d.reportStatus] || "muted"} dot>
                            {d.reportStatus.replace("_", " ").toUpperCase()}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="cursor-pointer" asChild>
                                <Link to="/depos/$id" params={{ id: String(d.id) }}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleEditClick(d)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleAssignEmployeeClick(d)}
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Assign Employee
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleManageStaffClick(d)}
                              >
                                <Users className="mr-2 h-4 w-4" />
                                Manage Staff
                                {(d.staffCount ?? 0) > 0 ? (
                                  <span className="ml-auto text-[10px] text-muted-foreground">
                                    {d.staffCount}
                                  </span>
                                ) : null}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generateDepotReport(d)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Generate Report
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                onClick={() => handleDeleteClick(d)} // open dialog
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                      {/* Expanded Row */}
                      {isExpanded && (
                        <tr className="bg-muted/15">
                          <td colSpan={9} className="p-0">
            <div className="border-t border-border/40 px-14 py-5 grid grid-cols-1 md:grid-cols-4 gap-6 text-[12px]">
                              <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Full
                                  Address
                                </h4>
                                <p className="text-muted-foreground leading-relaxed">
                                  {d.fullAddress}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" /> Contact
                                  Details
                                </h4>
                                <p className="text-muted-foreground mb-1.5">
                                  <span className="text-foreground/70 inline-block w-20">
                                    Phone:
                                  </span>{" "}
                                  {d.phone}
                                </p>
                                <p className="text-muted-foreground">
                                  <span className="text-foreground/70 inline-block w-20">
                                    Email:
                                  </span>{" "}
                                  {d.email}
                                </p>
                              </div>

                              <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5 text-muted-foreground" /> Depot Staff
                                </h4>
                                <p className="text-muted-foreground mb-2">
                                  {(d.staffCount ?? 0) > 0
                                    ? `${d.staffCount} staff working at this depot`
                                    : "No staff added yet"}
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1.5 text-xs"
                                  onClick={() => handleManageStaffClick(d)}
                                >
                                  <Briefcase className="h-3 w-3" />
                                  Manage Staff
                                </Button>
                              </div>

                              {/*Owner contact Details */}
                              <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-1.5">
                                  <Tag className="h-3.5 w-3.5 text-muted-foreground" /> Owner
                                  Contact Details
                                </h4>

                                <p className="text-muted-foreground mb-1.5 flex items-center">
                                  <span className="text-foreground/70 inline-block w-16">
                                    Phone:
                                  </span>

                                  <a
                                    href={`https://t.me/${telegramPhone}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                  >
                                    <FaTelegramPlane className="h-4 w-4" />

                                    {d.ownerPhone ? d.ownerPhone : "null"}
                                  </a>
                                </p>

                                <p className="text-muted-foreground">
                                  <span className="text-foreground/70 inline-block w-16">
                                    Email:
                                  </span>{" "}
                                  {d.email ? d.email : "Don't Have"}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/70 bg-muted/20 px-4 py-3 text-[11.5px] text-muted-foreground">
            <span>
              {selected.size > 0
                ? `${selected.size} selected`
                : `${pagination.total.toLocaleString()} depots found`}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateSearch({ page: Math.max(1, page - 1) })}
                className="h-7 px-2.5 text-xs"
              >
                Prev
              </Button>
              <span className="px-2 tabular-nums">
                Page {page} of {pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (pagination.totalPages || 1)}
                onClick={() =>
                  updateSearch({ page: Math.min(pagination.totalPages || 1, page + 1) })
                }
                className="h-7 px-2.5 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Surface>
      <EditDepotDialog
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedDepotForEdit(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["depots"] });
          toast.success("Depot updated successfully");
        }}
        depot={selectedDepotForEdit}
      />

      <AssignEmployeeDialog
        open={assignEmployeeOpen}
        onOpenChange={(open) => {
          setAssignEmployeeOpen(open);
          if (!open) setSelectedDepotForAssign(null);
        }}
        depot={selectedDepotForAssign}
      />

      {selectedDepotForStaff?.id != null && (
        <ManageStaffDialog
          open={staffDialogOpen}
          onOpenChange={(open) => {
            setStaffDialogOpen(open);
            if (!open) {
              setSelectedDepotForStaff(null);
              queryClient.invalidateQueries({ queryKey: ["depots"] });
            }
          }}
          depotId={selectedDepotForStaff.id}
          depotName={selectedDepotForStaff.name}
        />
      )}

      {/* Delete Depot Dialog */}
      {selectedDepot && (
        <DeleteDepotDialog
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setSelectedDepot(null);
          }}
          onSuccess={() => {
            // Refetch the depots list after successful deletion
            queryClient.invalidateQueries({ queryKey: ["depots"] });
            toast.success("Depot deleted successfully"); // optional, dialog already shows a toast
          }}
          depot={selectedDepot}
        />
      )}
      <ExportReportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
    </div>
  );
}
