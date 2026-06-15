import React, { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, List, LayoutGrid, Upload, MapPin, Layers } from "lucide-react";

// Province imports
import { ProvinceTable } from "../province/ProvinceTable";
import { ProvinceDrawerForm } from "../province/ProvinceDrawerForm";
import {
  useProvinces,
  useCreateProvince,
  useUpdateProvince,
  useDeleteProvince,
} from "../province/province.hooks";
import type { Province } from "../province/province.types";

// District imports
import { DistrictTable } from "../district/DistrictTable";
import { DistrictDrawerForm } from "../district/DistrictDrawerForm";
import {
  useDistricts,
  useCreateDistrict,
  useUpdateDistrict,
  useDeleteDistrict,
} from "../district/district.hooks";
import type { District } from "../district/district.types";

// UI Components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Geography Components
import { FilterBar } from "../components/FilterBar";
import { useQueryClient } from "@tanstack/react-query";
interface GeographySearchParams {
  tab?: "provinces" | "districts";
  provinceId?: string;
}

export const GeographyPage: React.FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ from: "/geography" }) as GeographySearchParams;
  const activeTab = search.tab || "provinces";
  const queryClient = useQueryClient();

  // Province state
  const [provinceSearch, setProvinceSearch] = useState("");
  const [isProvinceDrawerOpen, setIsProvinceDrawerOpen] = useState(false);
  const [editingProvince, setEditingProvince] = useState<Province | null>(null);
  const [provinceToDelete, setProvinceToDelete] = useState<Province | null>(null);
  const [provincePageIndex, setProvincePageIndex] = useState(0);
  const [provincePageSize, setProvincePageSize] = useState(10);

  // District state
  const [districtSearch, setDistrictSearch] = useState("");
  const [districtStatusFilter, setDistrictStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [isDistrictDrawerOpen, setIsDistrictDrawerOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [districtToDelete, setDistrictToDelete] = useState<District | null>(null);
  const [selectedDistrictIds, setSelectedDistrictIds] = useState<string[]>([]);
  const [districtPageIndex, setDistrictPageIndex] = useState(0);
  const [districtPageSize, setDistrictPageSize] = useState(10);

  // Queries
  const { data: provinces = [], isLoading: provincesLoading } = useProvinces({
    search: provinceSearch,
  });
  const selectedProvinceId = search.provinceId || null;
  const selectedProvince = provinces.find((p) => p.id === selectedProvinceId);

  const { data: districts = [], isLoading: districtsLoading } = useDistricts(
    selectedProvinceId || undefined,
    {
      search: districtSearch,
      status: districtStatusFilter,
    },
  );

  // Pagination
  const provincesTotalCount = provinces.length;
  const provincePaginatedData = provinces.slice(
    provincePageIndex * provincePageSize,
    (provincePageIndex + 1) * provincePageSize,
  );

  const districtsTotalCount = districts.length;
  const districtPaginatedData = districts.slice(
    districtPageIndex * districtPageSize,
    (districtPageIndex + 1) * districtPageSize,
  );

  // Mutations
  const createProvince = useCreateProvince();
  const updateProvince = useUpdateProvince();
  const deleteProvince = useDeleteProvince();

  const createDistrict = useCreateDistrict();
  const updateDistrict = useUpdateDistrict();
  const deleteDistrict = useDeleteDistrict();

  // Navigation Handlers
  const handleTabChange = (value: string) => {
    navigate({ to: "/geography", search: { ...search, tab: value as any } });
  };

  const handleSelectProvince = (provinceId: string) => {
    navigate({ to: "/geography", search: { ...search, provinceId } });
    setSelectedDistrictIds([]);
    setDistrictPageIndex(0);
  };

  const handleProvinceSelectInDistrict = (provinceId: string) => {
    const id = provinceId === "all" ? undefined : provinceId;
    navigate({ to: "/geography", search: { ...search, provinceId: id } });
    setDistrictPageIndex(0);
  };

  // Province handlers
  const handleAddProvince = () => {
    setEditingProvince(null);
    setIsProvinceDrawerOpen(true);
  };

  const handleEditProvince = (province: Province) => {
    setEditingProvince(province);
    setIsProvinceDrawerOpen(true);
  };

  const handleConfirmDeleteProvince = async () => {
    if (!provinceToDelete) return;
    try {
      await deleteProvince.mutateAsync(provinceToDelete.id);
      if (selectedProvinceId === provinceToDelete.id) {
        navigate({ to: "/geography", search: { ...search, provinceId: undefined } });
      }
      setProvinceToDelete(null);
      setProvincePageIndex(0);
      toast.success("Province deleted successfully");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to delete province";
      toast.error(message);
      setProvinceToDelete(null);
    }
  };

  const handleProvinceSubmit = async (formData: any) => {
    try {
      if (editingProvince) {
        await updateProvince.mutateAsync({ id: editingProvince.id, data: formData });
        toast.success("Province updated successfully");
      } else {
        const newProvince = await createProvince.mutateAsync(formData);
        handleSelectProvince(newProvince.id);
        toast.success("Province created successfully");
      }
      setIsProvinceDrawerOpen(false);
      setEditingProvince(null);
      setProvincePageIndex(0);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Operation failed";
      toast.error(message);
    }
  };
  

  // District handlers
  const handleAddDistrict = () => {
    if (!selectedProvinceId && provinces.length > 0) {
      // Optionally auto-select first province or show a toast
      handleProvinceSelectInDistrict(provinces[0].id);
    }
    setEditingDistrict(null);
    setIsDistrictDrawerOpen(true);
  };

  const handleEditDistrict = (district: District) => {
    setEditingDistrict(district);
    setIsDistrictDrawerOpen(true);
  };

  const handleConfirmDeleteDistrict = async () => {
    if (!districtToDelete) return;
    try {
      await deleteDistrict.mutateAsync({ id: Number(districtToDelete.id) });
      setDistrictToDelete(null);
      setDistrictPageIndex(0);
      toast.success("District deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["districts"] });
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to delete district";
      toast.error(message);
      setDistrictToDelete(null);
    }
  };

  const handleDistrictSubmit = async (formData: any) => {
    try {
      if (editingDistrict) {
        await updateDistrict.mutateAsync({ id: editingDistrict.id, data: formData });
        toast.success("District updated successfully");
      } else {
        await createDistrict.mutateAsync(formData);
        toast.success("District created successfully");
      }
      setIsDistrictDrawerOpen(false);
      setEditingDistrict(null);
      setDistrictPageIndex(0);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Operation failed";
      toast.error(message);
    }
  };

  const handleBulkSelect = React.useCallback((ids: string[]) => {
    setSelectedDistrictIds(ids);
  }, []);

  // Stats for summary row
  const activeDistricts = districts.filter((d) => d.status === "active").length;
  const inactiveDistricts = districts.filter((d) => d.status === "inactive").length;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-full mx-auto">
      {/* Header Section with enhanced visual */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-1 rounded-full bg-primary" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Geography Management
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Configure and manage provinces, districts, and their hierarchies. All changes affect
            depot assignment and territory planning.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/geography/bulk-import" })}
            className="h-9 px-4 shadow-sm bg-background"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button
            onClick={activeTab === "provinces" ? handleAddProvince : handleAddDistrict}
            className="h-9 px-4 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New {activeTab === "provinces" ? "Province" : "District"}
          </Button>
        </div>
      </div>

      {/* Stats Summary Row (dynamic) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden p-5 flex items-center justify-between border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="space-y-1.5 relative z-10">
            <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Provinces
            </p>
            <p className="text-3xl font-bold text-foreground tracking-tight">{provincesTotalCount}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm relative z-10 transition-transform group-hover:scale-105">
            <MapPin className="h-6 w-6" />
          </div>
        </Card>
        {activeTab === "districts" && selectedProvinceId ? (
          <>
            <Card className="relative overflow-hidden p-5 flex items-center justify-between border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow group">
              <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="space-y-1.5 relative z-10">
                <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Districts
                </p>
                <p className="text-3xl font-bold text-success tracking-tight">{activeDistricts}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center text-success shadow-sm relative z-10 transition-transform group-hover:scale-105">
                <Layers className="h-6 w-6" />
              </div>
            </Card>
            <Card className="relative overflow-hidden p-5 flex items-center justify-between border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow group">
              <div className="absolute inset-0 bg-gradient-to-br from-muted/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="space-y-1.5 relative z-10">
                <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Inactive Districts
                </p>
                <p className="text-3xl font-bold text-muted-foreground tracking-tight">{inactiveDistricts}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground shadow-sm relative z-10 transition-transform group-hover:scale-105">
                <Layers className="h-6 w-6" />
              </div>
            </Card>
          </>
        ) : activeTab === "districts" ? (
          <Card className="p-5 col-span-2 flex items-center justify-between border-border/40 bg-muted/20 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Select a province to view detailed district statistics
            </p>
            <Layers className="h-6 w-6 text-muted-foreground/30" />
          </Card>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="grid w-full sm:w-[400px] grid-cols-2 h-11 bg-muted/50 p-1 rounded-lg border border-border/50">
            <TabsTrigger
              value="provinces"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-sm font-medium py-1.5"
            >
              Provinces
            </TabsTrigger>
            <TabsTrigger
              value="districts"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-sm font-medium py-1.5"
            >
              Districts
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4 px-1">
            {activeTab === "districts" && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filter by
                </span>
                <Select
                  value={selectedProvinceId || "all"}
                  onValueChange={handleProvinceSelectInDistrict}
                >
                  <SelectTrigger className="w-[220px] h-9 text-sm bg-background border-border/60 shadow-sm focus:ring-1 focus:ring-primary rounded-md">
                    <SelectValue placeholder="All Provinces" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Provinces</SelectItem>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Separator orientation="vertical" className="h-6 hidden sm:block bg-border/60" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30 border border-border/40">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">
                {activeTab === "provinces"
                  ? `${provincesTotalCount} Province${provincesTotalCount !== 1 ? "s" : ""}`
                  : `${districtsTotalCount} District${districtsTotalCount !== 1 ? "s" : ""}`}
              </span>
            </div>
          </div>
        </div>

        <TabsContent value="provinces" className="mt-0 focus-visible:outline-none">
          <Card className="flex flex-col overflow-hidden border-border bg-card  min-h-[550px]">
            <div className="p-4 border-b border-border bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <FilterBar
                searchValue={provinceSearch}
                onSearchChange={setProvinceSearch}
                placeholder="Search by province name..."
                className="w-full sm:max-w-md"
              />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 bg-background  border border-border"
                >
                  <List className="w-4 h-4 text-primary" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              {provincesLoading ? (
                <div className="p-8 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : provinces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No provinces found</p>
                  <Button variant="link" onClick={handleAddProvince} className="mt-2">
                    Create your first province
                  </Button>
                </div>
              ) : (
                <ProvinceTable
                  provinces={provincePaginatedData}
                  isLoading={provincesLoading}
                  selectedProvinceId={selectedProvinceId}
                  onSelectProvince={(id) => {
                    handleSelectProvince(id);
                    handleTabChange("districts");
                  }}
                  onEditProvince={handleEditProvince}
                  onDeleteProvince={setProvinceToDelete}
                  pageIndex={provincePageIndex}
                  pageSize={provincePageSize}
                  totalCount={provincesTotalCount}
                  onPageChange={setProvincePageIndex}
                  onPageSizeChange={(newSize) => {
                    setProvincePageSize(newSize);
                    setProvincePageIndex(0);
                  }}
                />
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="districts" className="mt-0 focus-visible:outline-none">
          <Card className="flex flex-col overflow-hidden border-border bg-card  min-h-[550px]">
            <div className="p-4 border-b border-border bg-muted/10">
              <FilterBar
                searchValue={districtSearch}
                onSearchChange={setDistrictSearch}
                placeholder="Search by district name..."
                statusFilter={districtStatusFilter}
                onStatusFilterChange={setDistrictStatusFilter}
                showStatusFilter
                className="w-full"
              />
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedProvinceId || "empty"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {districtsLoading ? (
                    <div className="p-8 space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : districts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Layers className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {selectedProvinceId
                          ? `No districts found in ${selectedProvince?.name || "this province"}`
                          : "Select a province to view districts"}
                      </p>
                      {selectedProvinceId && (
                        <Button variant="link" onClick={handleAddDistrict} className="mt-2">
                          Add a district
                        </Button>
                      )}
                    </div>
                  ) : (
                    <DistrictTable
                      districts={districtPaginatedData}
                      isLoading={districtsLoading}
                      onEditDistrict={handleEditDistrict}
                      onDeleteDistrict={setDistrictToDelete}
                      onBulkSelect={handleBulkSelect}
                      pageIndex={districtPageIndex}
                      pageSize={districtPageSize}
                      totalCount={districtsTotalCount}
                      onPageChange={setDistrictPageIndex}
                      onPageSizeChange={(newSize) => {
                        setDistrictPageSize(newSize);
                        setDistrictPageIndex(0);
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Forms & Dialogs (no changes needed) */}
      <ProvinceDrawerForm
        open={isProvinceDrawerOpen}
        onOpenChange={setIsProvinceDrawerOpen}
        editingProvince={editingProvince}
        onSubmit={handleProvinceSubmit}
        isSubmitting={createProvince.isPending || updateProvince.isPending}
      />

      <DistrictDrawerForm
        open={isDistrictDrawerOpen}
        onOpenChange={setIsDistrictDrawerOpen}
        editingDistrict={editingDistrict}
        provinceId={selectedProvinceId || undefined}
        provinceName={selectedProvince?.name}
        onSubmit={handleDistrictSubmit}
        isSubmitting={createDistrict.isPending || updateDistrict.isPending}
      />

      <AlertDialog
        open={!!provinceToDelete}
        onOpenChange={(open) => !open && setProvinceToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Province?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">{provinceToDelete?.name}</span> and
              all associated districts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteProvince}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!districtToDelete}
        onOpenChange={(open) => !open && setDistrictToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete District?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{districtToDelete?.name}</span>? This
              will affect depot assignments in this district.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteDistrict}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
