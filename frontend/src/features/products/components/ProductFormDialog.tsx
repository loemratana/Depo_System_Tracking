import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Product, CreateProductInput } from "../types/product.types";
import { useAllDepots } from "../../depots/hooks/useAllDepots";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSave: (data: CreateProductInput & { id?: number }) => void;
}

export const ProductFormDialog: React.FC<ProductFormDialogProps> = ({
  open,
  onOpenChange,
  product,
  onSave,
}) => {
  const isEditing = !!product;

  const { data: depotsData, isLoading: isLoadingDepots } = useAllDepots({ enabled: open });
  const depots = depotsData?.data || [];

  const [name, setName] = useState(product?.name || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [quantity, setQuantity] = useState(product?.quantity?.toString() || "");
  const [minStock, setMinStock] = useState(product?.minStock?.toString() || "");
  const [depotId, setDepotId] = useState(product?.depotId?.toString() || "");

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setQuantity(product.quantity.toString());
      setMinStock(product.minStock.toString());
      setDepotId(product.depotId?.toString() || "");
    } else if (open) {
      setName("");
      setSku("");
      setQuantity("");
      setMinStock("");
      setDepotId("");
    }
  }, [product, open]);

  const selectedDepot = useMemo(() => {
    return depots.find((d: { id: number }) => d.id.toString() === depotId);
  }, [depotId, depots]);

  const brandId = selectedDepot?.brandId || null;

  const depotOptions = useMemo(
    () =>
      depots.map((depot: { id: number; name: string }) => ({
        value: depot.id.toString(),
        label: depot.name,
      })),
    [depots],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId) return;
    onSave({
      id: product?.id,
      name,
      sku,
      quantity: quantity ? parseInt(quantity) : 0,
      minStock: parseInt(minStock),
      depotId: parseInt(depotId),
      brandId,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details of this product below."
              : "Enter the details for the new product here."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sku" className="text-right">
                SKU
              </Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Initial Qty
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="minStock" className="text-right">
                Min Stock
              </Label>
              <Input
                id="minStock"
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="depot" className="text-right">
                Depot
              </Label>
              <div className="col-span-3">
                <SearchableSelect
                  id="depot"
                  value={depotId}
                  onValueChange={setDepotId}
                  options={depotOptions}
                  loading={isLoadingDepots}
                  placeholder="Select depot"
                  searchPlaceholder="Search depots..."
                  emptyText="No depots found."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600" disabled={!depotId || !brandId}>
              {isEditing ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
