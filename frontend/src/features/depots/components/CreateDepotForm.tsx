// features/depots/components/DepotForm.tsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, MapPin, User, CalendarDays } from "lucide-react";
import AutocompleteInput from "./AutocompleteInput";

export interface DepotFormData {
  code: string;
  name: string;
  khmerName: string;
  provinceName: string;
  districtName: string;
  employeeId: number | null;
  employeeName: string;
  phone: string;
  address: string;
  homeNumber: string;
  street: string;
  village: string;
  commune: string;
  expiryDate: string;
  brandName: string;
  brandId: number | null;
}

interface DepotFormProps {
  formData: DepotFormData;
  setFormData: React.Dispatch<React.SetStateAction<DepotFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  allBrands: any[];
  brandNameOptions: string[];
  provinces: string[];
  districts: string[];
  provincesLoading: boolean;
  districtsLoading: boolean;
  employees: any[];
  employeesLoading: boolean;
  onCancel: () => void;
  submitLabel?: string;
}

export const DepotForm: React.FC<DepotFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  isPending,
  allBrands,
  brandNameOptions,
  provinces,
  districts,
  provincesLoading,
  districtsLoading,
  employees,
  employeesLoading,
  onCancel,
  submitLabel = "Create Depot",
}) => {
  const handleBrandChange = (val: string) => {
    const matched = allBrands.find(
      (b) => b.name.toLowerCase() === val.toLowerCase()
    );
    setFormData({
      ...formData,
      brandName: val,
      brandId: matched ? matched.id : null,
    });
  };

  const handleEmployeeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? Number(e.target.value) : null;
    const name = e.target.options[e.target.selectedIndex]?.text || "";
    setFormData({
      ...formData,
      employeeId: id,
      employeeName: name,
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 mt-2">
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
              Brand <span className="text-red-500">*</span>
            </Label>
            <AutocompleteInput
              id="brandName"
              required
              value={formData.brandName || ""}
              onChange={handleBrandChange}
              placeholder="e.g. Coca-Cola"
              options={brandNameOptions}
              className="h-9 text-sm"
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
            <Label htmlFor="province" className="text-xs font-medium">
              City / Province <span className="text-red-500">*</span>
            </Label>
            <AutocompleteInput
              id="province"
              required
              value={formData.provinceName}
              onChange={(val) => setFormData({ ...formData, provinceName: val })}
              placeholder="e.g. Phnom Penh"
              options={provincesLoading ? [] : provinces}
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
              options={districtsLoading ? [] : districts}
              className="h-9 text-sm"
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
            <Label htmlFor="employee" className="text-xs font-medium">
              Sale Supervisor
            </Label>
            <select
              id="employee"
              value={formData.employeeId ?? ""}
              onChange={handleEmployeeSelect}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={employeesLoading}
            >
              <option value="">No owner</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.khmerName || emp.englishName || `Employee #${emp.id}`}
                </option>
              ))}
            </select>
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

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-9 text-sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-9 text-sm bg-blue-600 hover:bg-blue-700"
        >
          {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};