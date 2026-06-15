import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ImportDepotButton from "@/features/depots/components/ImportDepotButton";
import { DeleteDepotDialog } from "@/features/depots/components/DeleteDepotDialog";
import { EditDepotDialog } from "@/features/depots/components/EditDepotDialog";
import { generateDepotReport } from "@/utils/reportUtils";
import { ExportReportDialog } from "@/features/depots/components/ExportReportDialog";

import {
  Download,
  MoreHorizontal,
  Plus,
  Search,
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  User,
  MapPin,
  Tag,
  Loader2,
  Eye,
  Edit,
  UserPlus,
  FileText,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard, PageHeader, StatusBadge, Surface } from "@/components/ui-kit";
import { depotService } from "@/services/depot-service";
import { employeeService } from "@/services/employee-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // <-- add this
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
import { useAllDepots } from "../features/depots/hooks/useAllDepots.ts";
import { brandService } from "@/features/brand/services/brandService.ts";
import { FaTelegramPlane } from "react-icons/fa";
export const Route = createFileRoute("/depos")({
  head: () => ({
    meta: [{ title: "Manager Report — Brand Depot" }],
  }),
  component: DeposPage,
});

const reportTone: Record<string, "success" | "warning" | "danger"> = {
  active: "success",
  expiring_soon: "warning",
  expired: "danger",
};

import AutocompleteInput from "@/features/depots/components/AutocompleteInput";
import { Brand } from "@/features/brand/types/brand.types.ts";
import { useMemo } from "react";
import { email } from "zod/v4";

function DeposPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());
  const [selectedOwners, setSelectedOwners] = React.useState<Set<string>>(new Set());
  const [selectedProvinces, setSelectedProvinces] = React.useState<Set<string>>(new Set());
  const [selectedDistricts, setSelectedDistricts] = React.useState<Set<string>>(new Set());
  const [selectedBrands, setSelectedBrands] = React.useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = React.useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedDepotForEdit, setSelectedDepotForEdit] = React.useState(null);

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
    expired: "",
    homeNumber: "",
    street: "",
    village: "",
    commune: "",
    expiryDate: "",
    brandName: "",
    brandId: null as number | null,
  });

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  // Fetch provinces from master data (no staleTime — always fresh)
  const { data: provincesData, isLoading: provincesLoading } = useQuery({
    queryKey: ["provinces"],
    queryFn: locationService.getProvinces,
    staleTime: 0,
  });

  //fetch brand service
  const search = "";
  const status = "";

  const { data: brandsData } = useQuery({
    queryKey: ["brands", search, status],
    queryFn: () =>
      brandService.getAllFilter({
        search,
        status,
      }),
    staleTime: 5 * 60 * 1000, // 5minute
  });
  //  Brand name options for autocomplete (array of strings)
  const brandNameOptions = useMemo(() => {
    const brands = brandsData ?? []; // adjust if your API returns { data: [...] }
    return brands.map((b: any) => b.name);
  }, [brandsData]);

  // Full brand list for ID lookup (brandsData is already the array from getAllFilter)
  const allBrands = useMemo(() => brandsData ?? [], [brandsData]);
  // Find province ID from selected name
  const selectedProvinceId = React.useMemo(() => {
    if (!provincesData || !formData.provinceName) return undefined;
    const provinces = provincesData.data ?? provincesData;
    const province = provinces.find((p: any) => p.name === formData.provinceName);
    return province?.id;
  }, [provincesData, formData.provinceName]);

  // Extract province and district name lists for dropdowns
  const masterProvinces = React.useMemo(() => {
    if (!provincesData) return [];
    const provinces = provincesData.data ?? provincesData;
    return provinces.map((p: any) => p.name);
  }, [provincesData]);
  // Fetch districts — no staleTime so deletes are reflected immediately
  const { data: districtsData, isLoading: districtsLoading } = useQuery({
    queryKey: ["districts"],
    queryFn: () => locationService.getDistricts(),
    staleTime: 0,
  });

  // Then filter districts client-side based on selected province name
  const masterDistricts = React.useMemo(() => {
    if (!districtsData) return [];
    const districts = districtsData.data ?? districtsData;
    // If a province is selected, filter districts by that province's name
    if (formData.provinceName) {
      return districts
        .filter((d: any) => d.province?.name === formData.provinceName)
        .map((d: any) => d.name);
    }
    // Otherwise show all districts
    return districts.map((d: any) => d.name);
  }, [districtsData, formData.provinceName]);

  // Fetch Depots from API using useAllDepots to allow full local filtering
  const { data: response, isLoading } = useAllDepots();

  React.useEffect(() => {
    setPage(1);
  }, [
    query,
    selectedOwners,
    selectedProvinces,
    selectedDistricts,
    selectedBrands,
    selectedStatuses,
  ]);

  // Fetch all employees for owner dropdown
  const { data: employeesResponse } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeService.getEmployees({ page: 1, pageSize: 1000 }),
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
        expired: "",
        phone: "",
        address: "",
        homeNumber: "",
        street: "",
        village: "",
        commune: "",
        expiryDate: "",
        brandId: "",
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

  // Transform data for UI
  const enhancedDepots = depots.map((d: any) => {
    return {
      ...d,
      reportStatus: d.status || "active",
      ownerId: d.owner?.id,
      owner: d.owner?.name || "No Owner Assigned",
      ownerImage: d.owner?.image || null,
      phone: d.phone || "N/A",
      ownerPhone: d.owner?.phone || "N/A",
      nationalId: d.owner?.code || "N/A", // using employeeCode as National ID for now
      brands: d.brand ? [d.brand.name] : [],
      email: d.email?.email,
      createdAt: d.createdAt
        ? new Date(d.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "N/A",
      fullAddress: d.address,
      // ? `${d.address.houseNumber || ""} ${d.address.street || ""} ${d.address.village || ""}, ${d.district}, ${d.city}`
      // : `${d.district}, ${d.city}`,
    };
  });
  const filtered = enhancedDepots.filter((d: any) => {
    const matchQuery =
      query === "" ||
      d.name?.toLowerCase().includes(query.toLowerCase()) ||
      d.code?.toLowerCase().includes(query.toLowerCase()) ||
      d.district?.toLowerCase().includes(query.toLowerCase()) ||
      d.city?.toLowerCase().includes(query.toLowerCase()) ||
      d.owner?.toLowerCase().includes(query.toLowerCase());

    const matchOwner = selectedOwners.size === 0 || selectedOwners.has(d.owner);
    const matchProvince = selectedProvinces.size === 0 || selectedProvinces.has(d.city);
    const matchDistrict = selectedDistricts.size === 0 || selectedDistricts.has(d.district);
    const matchBrand =
      selectedBrands.size === 0 || d.brands.some((b: string) => selectedBrands.has(b));
    const matchStatus = selectedStatuses.size === 0 || selectedStatuses.has(d.reportStatus);

    return matchQuery && matchOwner && matchProvince && matchDistrict && matchBrand && matchStatus;
  });

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

  const totalDepots = enhancedDepots.length;
  const activeCount = enhancedDepots.filter((d: any) => d.reportStatus === "active").length;
  const expiringCount = enhancedDepots.filter(
    (d: any) => d.reportStatus === "expiring_soon",
  ).length;
  const expiredCount = enhancedDepots.filter((d: any) => d.reportStatus === "expired").length;

  const uniqueProvinces = Array.from(
    new Set(enhancedDepots.map((d: any) => d.city).filter(Boolean)),
  ) as string[];
  // District options filtered by selected provinces
  const validDepotsForDistricts =
    selectedProvinces.size > 0
      ? enhancedDepots.filter((d: any) => selectedProvinces.has(d.city))
      : enhancedDepots;
  const uniqueDistricts = Array.from(
    new Set(validDepotsForDistricts.map((d: any) => d.district).filter(Boolean)),
  ) as string[];

  const fetchedEmployeeNames = (
    employeesResponse?.employees ??
    employeesResponse?.data?.employees ??
    []
  )
    .map((e: any) => e.khmerName || e.englishName)
    .filter(Boolean);
  const existingOwnerNames = enhancedDepots
    .map((d: any) => d.owner)
    .filter((o: any) => o !== "No Owner Assigned" && o !== "Unknown");
  const uniqueOwners = Array.from(
    new Set([...fetchedEmployeeNames, ...existingOwnerNames]),
  ) as string[];

  const uniqueBrands = Array.from(
    new Set(enhancedDepots.flatMap((d: any) => d.brands).filter(Boolean)),
  ) as string[];

  const ownerOptions = React.useMemo(() => {
    const employees = employeesResponse?.employees ?? employeesResponse?.data?.employees ?? [];

    return employees
      .map((emp: any) => ({
        label: emp.khmerName || emp.englishName,
        value: emp.khmerName || emp.englishName,
      }))
      .filter((item) => item.label);
  }, [employeesResponse]);
  const provinceOptions = React.useMemo(() => {
    return masterProvinces.map((name: string) => ({ label: name, value: name }));
  }, [masterProvinces]);

  // District filter options from all districts in the system (filtered by selected province if any)
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

    return brandsData.map((brand) => ({
      label: brand.name,
      value: brand.name,
    }));
  }, [brandsData]);

  const statusOptions = [
    { label: "Active", value: "active" },
    { label: "Expiring Soon", value: "expiring_soon" },
    { label: "Expired", value: "expired" },
  ];
  const handleStatusClick = (status: string) => {
    if (status === "all") {
      setSelectedStatuses(new Set());
    } else {
      setSelectedStatuses(new Set([status]));
    }
  };
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
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const cleanPath = path.replace(/^[/\\]+/, "").replace(/\\/g, "/");
    return `http://localhost:5000/${cleanPath}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Manager Report Dashboard"
        description="Comprehensive overview of depot operations and license statuses."
        actions={
          <>
            {/* New Depot Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[12px] font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                  <Plus className="h-3 w-3" /> New Depot
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Depot</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Fill in all required information below.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-5 mt-2">
                  {/* Row 1: Depot Code + Depot Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="code" className="text-xs font-medium">
                        Depot Code <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="code"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="e.g. BD-1001"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-medium">
                        Depot Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Central Hub"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="khmerName" className="text-xs font-medium">
                        Khmer Name
                      </Label>
                      <Input
                        id="khmerName"
                        value={formData.khmerName || ""}
                        onChange={(e) => setFormData({ ...formData, khmerName: e.target.value })}
                        placeholder="ឈ្មោះជាភាសាខ្មែរ"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="brandName" className="text-xs font-medium">
                        Brand *
                      </Label>
                      <AutocompleteInput
                        id="brandName"
                        value={formData.brandName || ""}
                        onChange={(val) => {
                          // Resolve the selected name back to its brand ID
                          const matched = allBrands.find(
                            (b: any) => b.name.toLowerCase() === val.toLowerCase(),
                          );
                          setFormData({
                            ...formData,
                            brandName: val,
                            brandId: matched ? matched.id : null,
                          });
                        }}
                        placeholder="e.g. Coca-Cola"
                        options={brandNameOptions} // array of strings
                      />
                    </div>
                    {/* <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">
                Depot Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Central Hub"
                className="h-9 text-sm"
              />
            </div> */}
                  </div>

                  {/* Row 2: Province + District (autocomplete) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="province" className="text-xs font-medium">
                        City / Province <span className="text-red-500">*</span>
                      </Label>
                      <AutocompleteInput
                        id="province"
                        required
                        value={formData.provinceName}
                        onChange={(val) => setFormData({ ...formData, provinceName: val })}
                        placeholder="e.g. Phnom Penh"
                        options={provincesLoading ? [] : masterProvinces}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="district" className="text-xs font-medium">
                        District <span className="text-red-500">*</span>
                      </Label>
                      <AutocompleteInput
                        id="district"
                        required
                        value={formData.districtName}
                        onChange={(val) => setFormData({ ...formData, districtName: val })}
                        placeholder="e.g. Daun Penh"
                        options={districtsLoading ? [] : masterDistricts}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 3: ID Number + Home Number */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* <div className="space-y-1.5">
          <Label htmlFor="idNumber" className="text-xs font-medium">
            ID Number
          </Label>
          <Input
            id="idNumber"
            value={formData.idNumber || ""}
            onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
            placeholder="e.g. 123456789"
            className="h-9 text-sm"
          />
        </div> */}
                    <div className="space-y-1.5">
                      <Label htmlFor="homeNumber" className="text-xs font-medium">
                        Home Number
                      </Label>
                      <Input
                        id="homeNumber"
                        value={formData.homeNumber || ""}
                        onChange={(e) => setFormData({ ...formData, homeNumber: e.target.value })}
                        placeholder="e.g. #12B"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 4: Street + Village */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="street" className="text-xs font-medium">
                        Street
                      </Label>
                      <Input
                        id="street"
                        value={formData.street || ""}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        placeholder="e.g. Street 271"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="village" className="text-xs font-medium">
                        Village
                      </Label>
                      <Input
                        id="village"
                        value={formData.village || ""}
                        onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                        placeholder="e.g. Phsar Thmei"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 5: Commune + Expired Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="commune" className="text-xs font-medium">
                        Commune
                      </Label>
                      <Input
                        id="commune"
                        value={formData.commune || ""}
                        onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                        placeholder="e.g. Sangkat Boeung Keng Kang"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="expiredDate" className="text-xs font-medium">
                        Expired Date
                      </Label>
                      <Input
                        id="expiredDate"
                        type="date"
                        value={formData.expiredDate || ""}
                        onChange={(e) => setFormData({ ...formData, expiredDate: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 6: Owner Name (autocomplete) + Phone Number */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="owner" className="text-xs font-medium">
                        Owner (Optional)
                      </Label>
                      {employeesResponse ? (
                        <select
                          id="owner"
                          value={formData.employeeId ?? ""}
                          onChange={(e) => {
                            const id = e.target.value ? Number(e.target.value) : null;
                            const name = e.target.options[e.target.selectedIndex]?.text || "";
                            setFormData({
                              ...formData,
                              employeeId: id,
                              employeeName: name,
                            });
                          }}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">No owner</option>
                          {(
                            employeesResponse.employees ||
                            employeesResponse.data?.employees ||
                            []
                          ).map((emp: never) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.khmerName || emp.englishName || "Unnamed"}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="h-9 w-full rounded-md border border-input bg-muted/20 px-3 py-1 text-sm text-muted-foreground">
                          Loading employees...
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-medium">
                        Contact Phone
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone || ""}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. +855 12 345 678"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 7: Address (full) - optional if street/village/commune already cover it */}
                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-xs font-medium">
                      Full Address (Optional)
                    </Label>
                    <Input
                      id="address"
                      value={formData.address || ""}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. Additional address details"
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="h-9 text-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="h-9 text-sm bg-blue-600 hover:bg-blue-700"
                    >
                      {createMutation.isPending && (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      )}
                      Create Depot
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Download Template Button – outside DialogTrigger */}
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium cursor-pointer"
            >
              <Download className="h-3 w-3" /> Download Template
            </button>
            <ImportDepotButton />

            {/* Export PDF Button */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8"
              onClick={() => setExportDialogOpen(true)}
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 pb-2 pr-4 pl-4">
        <div
          onClick={() => handleStatusClick("all")}
          className={cn(
            "cursor-pointer transition-all duration-200 ",
            selectedStatuses.size === 0 ? "ring-2 ring-primary/20 rounded-lg" : "",
          )}
        >
          <KpiCard
            label="Total Depots"
            value={isLoading ? "..." : totalDepots}
            icon={Building2}
            delta="All time operations"
            hint="All time operations"
          />
        </div>
        <div
          onClick={() => handleStatusClick("active")}
          className={cn(
            "cursor-pointer transition-all duration-200",
            selectedStatuses.has("active") ? "ring-2 ring-success/20 rounded-lg" : "",
          )}
        >
          <KpiCard
            label="UNASSIGNED"
            value={isLoading ? "..." : activeCount}
            icon={CheckCircle2}
            hint="In good standing"
            trend="up"
            delta=""
          />
        </div>
        <div
          onClick={() => handleStatusClick("expiring_soon")}
          className={cn(
            "cursor-pointer transition-all duration-200",
            selectedStatuses.has("expiring_soon") ? "ring-2 ring-warning/20 rounded-lg" : "",
          )}
        >
          <KpiCard
            label="Expiring Soon"
            value={isLoading ? "..." : expiringCount}
            icon={AlertTriangle}
            hint="Action required (30d)"
            trend="down"
            delta=""
          />
        </div>
        <div
          onClick={() => handleStatusClick("expired")}
          className={cn(
            "cursor-pointer transition-all duration-200",
            selectedStatuses.has("expired") ? "ring-2 ring-destructive/20 rounded-lg" : "",
          )}
        >
          <KpiCard
            label="Expired Licenses"
            value={isLoading ? "..." : expiredCount}
            icon={XCircle}
            hint="Past due"
            trend="flat"
            delta=""
          />
        </div>
      </div>

      {/*filter element*/}
      <Surface padded={false} className="relative z-0 dark:bg-gray-950">
        {/* Filter bar */}
        <div className="flex flex-col gap-3 border-b border-border p-3 sticky top-0 z-20 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by code, name, city, owner…"
                className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              {(selectedOwners.size > 0 ||
                selectedProvinces.size > 0 ||
                selectedDistricts.size > 0 ||
                selectedBrands.size > 0 ||
                selectedStatuses.size > 0 ||
                query !== "") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedOwners(new Set());
                    setSelectedProvinces(new Set());
                    setSelectedDistricts(new Set());
                    setSelectedBrands(new Set());
                    setSelectedStatuses(new Set());
                    setQuery("");
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
              title="Owner"
              options={ownerOptions}
              selectedValues={selectedOwners}
              onSelect={setSelectedOwners}
            />
            <MultiSelect
              title="Province"
              options={provinceOptions}
              selectedValues={selectedProvinces}
              onSelect={(vals) => {
                setSelectedProvinces(vals);
                setSelectedDistricts(new Set()); // Reset districts when province changes
              }}
            />
            <MultiSelect
              title="District"
              options={districtOptions}
              selectedValues={selectedDistricts}
              onSelect={setSelectedDistricts}
            />
            <MultiSelect
              title="Brands"
              options={brandOptions}
              selectedValues={selectedBrands}
              onSelect={setSelectedBrands}
            />
            <MultiSelect
              title="Status"
              options={statusOptions}
              selectedValues={selectedStatuses}
              onSelect={setSelectedStatuses}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[300px] ">
          {isLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
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
                  <th className="px-3 py-2.5 text-left font-medium">Depot Info</th>
                  <th className="px-3 py-2.5 text-left font-medium">Owner</th>
                  <th className="px-3 py-2.5 text-left font-medium">Location</th>
                  <th className="px-3 py-2.5 text-left font-medium">Brands</th>
                  <th className="px-3 py-2.5 text-left font-medium">Created Date</th>
                  <th className="px-3 py-2.5 text-left font-medium">Status</th>
                  <th className="w-8 px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * pageSize, page * pageSize).map((d: any) => {
                  const telegramPhone = d.ownerPhone?.replace(/\s+/g, "").replace(/^0/, "+855");
                  return (
                    <React.Fragment key={d.id}>
                      <tr className="border-b border-border/70 transition-colors hover:bg-muted/30">
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
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {expandedRows.has(d.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
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
                                  className="h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase"
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
                              <span
                                key={b}
                                className="rounded border border-blue-500/20 bg-blue-500/10 text-blue-600 px-1.5 py-0.5 text-[10px] whitespace-nowrap"
                              >
                                {b}
                              </span>
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
                                <Link to={`/depos/${d.id}`}>
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
                              <DropdownMenuItem className="cursor-pointer">
                                <UserPlus className="mr-2 h-4 w-4" />
                                Assign Employee
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
                      {expandedRows.has(d.id) && (
                        <tr className="border-b border-border bg-muted/20">
                          <td colSpan={9} className="p-0">
                            <div className="px-14 py-5 grid grid-cols-3 gap-6 text-[12px]">
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

        {!isLoading && (
          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11.5px] text-muted-foreground">
            <span>
              {selected.size > 0 ? `${selected.size} selected` : `${filtered.length} depots found`}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-border px-2 py-0.5 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-1">
                Page {page} of {Math.ceil(filtered.length / pageSize) || 1}
              </span>
              <button
                disabled={page >= (Math.ceil(filtered.length / pageSize) || 1)}
                onClick={() =>
                  setPage((p) => Math.min(Math.ceil(filtered.length / pageSize) || 1, p + 1))
                }
                className="rounded border border-border px-2 py-0.5 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
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
