// features/depots/components/EditDepotDialog.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Loader2, CalendarDays, User, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useUpdateDepot } from "../hooks/useUpdateDepot";
import { Depot } from "../types/depot.types";
import { useQuery } from "@tanstack/react-query";
import { locationService } from "../services/location-service";
import { employeeService } from "@/services/employee-service";
import AutocompleteInput from "./AutocompleteInput"; // adjust path
import { MultiSelect } from "@/components/filters/multi-select";
import { brandService } from "@/features/brand/services/brandService";
interface EditDepotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  depot: Depot | null;
}

export const EditDepotDialog: React.FC<EditDepotDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  depot,
}) => {
  const { updateDepot, isUpdating } = useUpdateDepot();

  // Form state
  const [formData, setFormData] = useState<Partial<Depot>>({
    code: "",
    name: "",
    khmerName: "",
    provinceName: "",
    districtName: "",
    employeeName: "",
    phone: "",
    dateOfbirth:"",
    sex:undefined,
    address: "",
    homeNumber: "",
    street: "",
    village: "",
    commune: "",
    expiryDate: "",
    brandName: "",
    brandId: null as number | null,
    note: "",
  });

  // Pre-fill form when depot changes
  useEffect(() => {
    if (depot) {
      setFormData({
        code: depot.code || "",
        name: depot.name || "",
        khmerName: depot.khmerName ?? "",
        provinceName: depot.provinceName || "",
        districtName: depot.districtName || "",
        employeeName: depot.employeeName || "",
        phone: depot.phone || "",
        address: depot.address || "",
        homeNumber: depot.homeNumber || "",
        street: depot.street || "",
        village: depot.village || "",
        commune: depot.commune || "",
        expiryDate: depot.expiryDate?.split("T")[0] || "",
        brandName: depot.brandName || "", // single brand name
        brandId: depot.brandId ?? null,
        note: depot.note || "",
      });
    }
  }, [depot]);

  // Fetch provinces and employees for dropdowns
  const { data: provincesData, isLoading: provincesLoading } = useQuery({
    queryKey: ["provinces"],
    queryFn: locationService.getProvinces,
    enabled: isOpen,
  });

  const { data: employeesResponse } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeService.getEmployees({ page: 1, pageSize: 1000 }),
    enabled: isOpen,
  });

  const masterProvinces = React.useMemo(() => {
    if (!provincesData) return [];
    const provinces = provincesData.data ?? provincesData;
    return provinces.map((p: any) => p.name);
  }, [provincesData]);

  const { data: districtsData, isLoading: districtsLoading } = useQuery({
    queryKey: ["districts"],
    queryFn: () => locationService.getDistricts(),
  });

  const masterDistricts = React.useMemo(() => {
    if (!districtsData) return [];
    const districts = districtsData.data ?? districtsData;
    return districts.map((d: any) => d.name);
  }, [districtsData]);

  const uniqueOwners = React.useMemo(() => {
    const employees = employeesResponse?.employees ?? employeesResponse?.data?.employees ?? [];
    return employees.map((e: any) => e.khmerName || e.englishName).filter(Boolean);
  }, [employeesResponse]);

  // Fetch brands (for autocomplete options)
  const { data: brandsData } = useQuery({
    queryKey: ["brands"],
    queryFn: () => brandService.getAll({ page: 1, pageSize: 1000 }),
    enabled: isOpen,
  });

  const brandNameOptions = useMemo(() => {
    const brands = brandsData?.data ?? [];
    return brands.map((b: any) => b.name);
  }, [brandsData]);

  const allBrands = useMemo(() => brandsData?.data ?? [], [brandsData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depot?.id) return;
    const success = await updateDepot(depot.id, formData);
    if (success) {
      onClose();
      onSuccess();
    }
  };

  if (!isOpen || !depot) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Depot</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Update depot information below.
        </DialogDescription>
      </DialogHeader>
  
      <form onSubmit={handleSubmit} className="space-y-6 mt-2">
        {/* ===== SECTION 1: Depot Information ===== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Depot Information</h3>
          </div>
  
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-xs font-medium">
                Depot Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
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
                Brand
              </Label>
              <AutocompleteInput
                id="brandName"
                value={formData.brandName || ""}
                onChange={(val) => {
                  const matched = allBrands.find(
                    (b: any) => b.name.toLowerCase() === val.toLowerCase()
                  );
                  setFormData({
                    ...formData,
                    brandName: val,
                    brandId: matched ? matched.id : null,
                  });
                }}
                placeholder="e.g. Coca-Cola"
                options={brandNameOptions}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="note" className="text-xs font-medium">
                Brand Asset Notes
              </Label>
              <textarea
                id="note"
                value={formData.note || ""}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="e.g. 12 coolers, 45 display racks, POS material low"
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>
  
        {/* ===== SECTION 2: Address Details ===== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Address Details</h3>
          </div>
  
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="provinceName" className="text-xs font-medium">
                City / Province <span className="text-red-500">*</span>
              </Label>
              <AutocompleteInput
                id="provinceName"
                value={formData.provinceName || ""}
                onChange={(val) => setFormData({ ...formData, provinceName: val })}
                placeholder="e.g. Phnom Penh"
                options={provincesLoading ? [] : masterProvinces}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="districtName" className="text-xs font-medium">
                District <span className="text-red-500">*</span>
              </Label>
              <AutocompleteInput
                id="districtName"
                value={formData.districtName || ""}
                onChange={(val) => setFormData({ ...formData, districtName: val })}
                placeholder="e.g. Daun Penh"
                options={districtsLoading ? [] : masterDistricts}
              />
            </div>
          </div>
  
          <div className="grid grid-cols-2 gap-4">
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
          </div>
  
          <div className="grid grid-cols-2 gap-4">
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
          </div>
  
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-medium">
              Full Address (Optional)
            </Label>
            <Input
              id="address"
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Additional address details"
              className="h-9 text-sm"
            />
          </div>
        </div>
  
        {/* ===== SECTION 3: Employee & Contact ===== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Employee & Contact</h3>
          </div>
  
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="employeeName" className="text-xs font-medium">
                Owner Name
              </Label>
              <AutocompleteInput
                id="employeeName"
                value={formData.employeeName || ""}
                onChange={(val) => setFormData({ ...formData, employeeName: val })}
                placeholder="e.g. Sok San"
                options={uniqueOwners}
              />
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
        </div>
  
        {/* ===== SECTION 4: Additional Info ===== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Additional Info</h3>
          </div>
  
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="expiryDate" className="text-xs font-medium">
                Expiry Date
              </Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate || ""}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
  
        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="h-9 text-sm">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isUpdating}
            className="h-9 text-sm bg-blue-600 hover:bg-blue-700"
          >
            {isUpdating && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
  );
};
