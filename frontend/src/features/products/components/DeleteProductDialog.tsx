import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Product } from "../types/product.types";
import { AlertTriangle } from "lucide-react";

interface DeleteProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onConfirm: (id: number) => void;
}

export const DeleteProductDialog: React.FC<DeleteProductDialogProps> = ({
  open,
  onOpenChange,
  product,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Delete Product</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete{" "}
            {product ? <strong className="text-foreground">{product.name} ({product.sku})</strong> : "this product"}?
            This action cannot be undone and will remove all associated inventory tracking data.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => {
            if (product) onConfirm(product.id);
            onOpenChange(false);
          }}>
            Yes, Delete Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
