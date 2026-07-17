import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { depotService } from "@/services/depot-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { brandService } from "@/features/brand/services/brandService";
import AutocompleteInput from "./AutocompleteInput"; // adjust path

interface DepotEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depotId: string | number;
  onSuccess?: () => void;
}

export function DepotEditDialog({ open, onOpenChange, depotId, onSuccess }: DepotEditDialogProps) {
  const queryClient = useQueryClient();

  // Fetch depot details
  const { data: depotData, isLoading: depotLoading } = useQuery({
    queryKey: ["depot", depotId],
    queryFn: () => depotService.getDepotById(depotId),
    enabled: open,
  });

  // Fetch provinces, districts, employees for dropdowns
  const { data: provincesData } = useQuery({
    queryKey: ["provinces"],
    queryFn: () => depotService.getProvinces(),
    enabled: open,
  });
  const { data: districtsData } = useQuery({
    queryKey: ["districts"],
    queryFn: () => depotService.getDistricts(),
    enabled: open,
  });
  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: () => depotService.getEmployees({ limit: 1000 }),
    enabled: open,
  });
  const { data: brandsData } = useQuery({
    queryKey: ["brands"],
    queryFn: () => brandService.getAll({ page: 1, pageSize: 1000 }),
    enabled: open,
  });

  const raw = depotData?.data || depotData || {};
  const header = raw?.header || {};
  const overview = raw?.overview || {};
  const owner = raw?.owner || null;
  const rawBrands: Array<{ id?: number; name: string } | string> = raw?.brands || [];
  const linkedBrand = rawBrands[0];
  const linkedBrandName =
    typeof linkedBrand === "string" ? linkedBrand : linkedBrand?.name || "";

  // Form state
  const [formData, setFormData] = React.useState({
    name: "",
    code: "",
    provinceName: "",
    districtName: "",
    address: "",
    phone: "",
    status: "active",
    houseNumber: "",
    street: "",
    village: "",
    commune: "",
    expiryDate: "",
    ownerName: "",
    brandName: "",
    brandId: null as number | null,
    note: "",
  });

  // Populate form when depot loads
  React.useEffect(() => {
    if (!raw || Object.keys(raw).length === 0) return;

    setFormData({
      name: header.depotName || raw.name || "",
      code: header.depotCode || raw.code || "",
      provinceName: overview.province || raw.city || "",
      districtName: overview.district || raw.district || "",
      address:
        typeof overview.address === "string"
          ? overview.address
          : raw.address || "",
      phone: overview.phone || raw.phone || "",
      status: (header.status || raw.status || "active").toLowerCase(),
      houseNumber: raw.houseNumber || "",
      street: raw.street || "",
      village: raw.village || "",
      commune: raw.commune || "",
      expiryDate: raw.expiryDate
        ? new Date(raw.expiryDate).toISOString().split("T")[0]
        : "",
      ownerName: owner?.englishName || owner?.khmerName || owner?.name || "",
      brandName: linkedBrandName,
      brandId:
        typeof linkedBrand === "object" && linkedBrand?.id ? linkedBrand.id : null,
      note: raw.note || "",
    });
  }, [raw, header, overview, owner, linkedBrandName, linkedBrand]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => depotService.updateDepot(depotId, data),
    onSuccess: () => {
      toast.success("Depot updated successfully");
      queryClient.invalidateQueries({ queryKey: ["depot", depotId] });
      queryClient.invalidateQueries({ queryKey: ["depots"] });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update depot");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const provinces = provincesData?.data || provincesData || [];
  const districts = districtsData?.data || districtsData || [];
  const employees = employeesData?.employees || employeesData || [];

  const provinceOptions = provinces.map((p: any) => p.name);
  const districtOptions = districts.map((d: any) => d.name);
  const employeeOptions = employees
    .map((e: any) => e.englishName || e.khmerName || e.name)
    .filter(Boolean);
  const brandNameOptions = (brandsData?.data ?? []).map((b: any) => b.name);
  const allBrands = brandsData?.data ?? [];

  if (depotLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Depot</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Depot Code</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder="e.g. BD-1001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Depot Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Central Hub"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-province">Province / City</Label>
              <AutocompleteInput
                id="edit-province"
                value={formData.provinceName}
                onChange={(val) => handleChange("provinceName", val)}
                options={provinceOptions}
                placeholder="Select province"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-district">District</Label>
              <AutocompleteInput
                id="edit-district"
                value={formData.districtName}
                onChange={(val) => handleChange("districtName", val)}
                options={districtOptions}
                placeholder="Select district"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-house">House Number</Label>
              <Input
                id="edit-house"
                value={formData.houseNumber}
                onChange={(e) => handleChange("houseNumber", e.target.value)}
                placeholder="#12B"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-street">Street</Label>
              <Input
                id="edit-street"
                value={formData.street}
                onChange={(e) => handleChange("street", e.target.value)}
                placeholder="Street 271"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-village">Village</Label>
              <Input
                id="edit-village"
                value={formData.village}
                onChange={(e) => handleChange("village", e.target.value)}
                placeholder="Phsar Thmei"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-commune">Commune</Label>
              <Input
                id="edit-commune"
                value={formData.commune}
                onChange={(e) => handleChange("commune", e.target.value)}
                placeholder="Sangkat Boeung Keng Kang"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-address">Full Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Additional address details"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Contact Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+855 12 345 678"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-expiry">License Expiry Date</Label>
              <Input
                id="edit-expiry"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => handleChange("expiryDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => handleChange("status", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="vacancy">Vacancy</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-owner">Owner Name</Label>
            <AutocompleteInput
              id="edit-owner"
              value={formData.ownerName}
              onChange={(val) => handleChange("ownerName", val)}
              options={employeeOptions}
              placeholder="Search owner"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-brand">Managed Brand</Label>
            <AutocompleteInput
              id="edit-brand"
              value={formData.brandName}
              onChange={(val) => {
                const matched = allBrands.find((b: any) => b.name === val);
                setFormData((prev) => ({
                  ...prev,
                  brandName: val,
                  brandId: matched ? matched.id : null,
                }));
              }}
              options={brandNameOptions}
              placeholder="Select brand"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-note">Brand Asset Notes</Label>
            <textarea
              id="edit-note"
              value={formData.note}
              onChange={(e) => handleChange("note", e.target.value)}
              placeholder="e.g. 12 coolers, 45 display racks, POS material low"
              rows={4}
              className="flex min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}