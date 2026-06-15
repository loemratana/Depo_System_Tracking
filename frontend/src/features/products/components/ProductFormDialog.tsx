import React, { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Product, CreateProductInput } from "../types/product.types";
import { useBrands } from "../../brand/hooks/useBrands";
import { useAllDepots } from "../../depots/hooks/useAllDepots";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null; // If null → Add mode; if provided → Edit mode
  onSave: (data: CreateProductInput & { id?: number }) => void;
}

export const ProductFormDialog: React.FC<ProductFormDialogProps> = ({
  open,
  onOpenChange,
  product,
  onSave,
}) => {
  const isEditing = !!product;

  const { data: brandsData, isLoading: isLoadingBrands } = useBrands();
  const { data: depotsData, isLoading: isLoadingDepots } = useAllDepots();
  
  const brands = brandsData?.data || [];
  const depots = depotsData?.data || [];

  // Local state for form fields
  const [name, setName] = useState(product?.name || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [price, setPrice] = useState(product?.price?.toString() || "");
  const [quantity, setQuantity] = useState(product?.quantity?.toString() || "");
  const [minStock, setMinStock] = useState(product?.minStock?.toString() || "");
  const [brandId, setBrandId] = useState(product?.brandId?.toString() || "");
  const [depotId, setDepotId] = useState(product?.depotId?.toString() || "");

  // Update state when product changes (for editing)
  React.useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setPrice(product.price.toString());
      setQuantity(product.quantity.toString());
      setMinStock(product.minStock.toString());
      setBrandId(product.brandId?.toString() || "");
      setDepotId(product.depotId?.toString() || "");
    } else {
      setName("");
      setSku("");
      setPrice("");
      setQuantity("");
      setMinStock("");
      setBrandId("");
      setDepotId("");
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: product?.id,
      name,
      sku,
      price: parseFloat(price),
      quantity: quantity ? parseInt(quantity) : 0,
      minStock: parseInt(minStock),
      brandId: parseInt(brandId),
      depotId: parseInt(depotId),
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
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sku" className="text-right">SKU</Label>
              <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">Price ($)</Label>
              <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">Initial Qty</Label>
              <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="minStock" className="text-right">Min Stock</Label>
              <Input id="minStock" type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand" className="text-right">Brand</Label>
              <div className="col-span-3">
                <Select value={brandId} onValueChange={setBrandId} required>
                  <SelectTrigger id="brand">
                    <SelectValue placeholder={isLoadingBrands ? "Loading..." : "Select Brand"} />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand: any) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="depot" className="text-right">Depot</Label>
              <div className="col-span-3">
                <Select value={depotId} onValueChange={setDepotId} required>
                  <SelectTrigger id="depot">
                    <SelectValue placeholder={isLoadingDepots ? "Loading..." : "Select Depot"} />
                  </SelectTrigger>
                  <SelectContent>
                    {depots.map((depot: any) => (
                      <SelectItem key={depot.id} value={depot.id.toString()}>
                        {depot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{isEditing ? "Save Changes" : "Create Product"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
