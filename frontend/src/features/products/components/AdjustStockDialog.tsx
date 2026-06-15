import React, { useState, useEffect } from "react";
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
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Product } from "../types/product.types";
import { useEmployees } from "../../employee/hooks/useEmployees";

interface AdjustStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSave: (productId: number, type: "ADD" | "REMOVE", amount: number, reason: string, employeeId?: number) => void;
  isSaving?: boolean; // optional loading state from parent
}

export const AdjustStockDialog: React.FC<AdjustStockDialogProps> = ({
  open,
  onOpenChange,
  product,
  onSave,
  isSaving = false,
}) => {
  const [type, setType] = useState<"ADD" | "REMOVE">("ADD");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<string>("manual");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [error, setError] = useState("");

  const { employees, loading: loadingEmployees } = useEmployees({ page: 1, limit: 1000 });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setType("ADD");
      setAmount("");
      setReason("manual");
      setEmployeeId("");
      setError("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!product) return;
    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid positive quantity.");
      return;
    }

    if (reason === "sale" && type === "REMOVE") {
      if (!employeeId) {
        setError("Please select the employee who made the sale.");
        return;
      }
    }

    onSave(product.id, type, amountNum, reason, employeeId ? parseInt(employeeId) : undefined);
    onOpenChange(false);
  };

  const currentStock = product?.quantity ?? 0;
  const amountNum = parseInt(amount) || 0;
  const newStockEstimate =
    type === "ADD"
      ? currentStock + amountNum
      : Math.max(0, currentStock - amountNum);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            {product ? `Adjust inventory for ${product.name} (${product.sku}).` : "Select a product to adjust."}
          </DialogDescription>
        </DialogHeader>

        {product ? (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Current Stock Display */}
              <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                <span className="text-sm font-medium text-muted-foreground">Current Stock</span>
                <span className="text-lg font-bold tabular-nums text-foreground">{currentStock}</span>
              </div>

              {/* Action Type */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Action</Label>
                <div className="col-span-3">
                  <Select value={type} onValueChange={(val: "ADD" | "REMOVE") => setType(val)}>
                    <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADD">➕ Add Stock (IN)</SelectItem>
                      <SelectItem value="REMOVE">➖ Remove Stock (OUT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quantity */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Quantity</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="col-span-3"
                  required
                  autoFocus
                />
              </div>

              {/* Reason */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reason" className="text-right">Reason</Label>
                <div className="col-span-3">
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger><SelectValue placeholder="Select Reason" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">📝 Manual Adjustment</SelectItem>
                      <SelectItem value="sale">💸 Sale / Sold</SelectItem>
                      <SelectItem value="return">🔄 Return</SelectItem>
                      <SelectItem value="adjustment">📊 Stock Audit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Employee selection (only for sale) */}
              {reason === "sale" && type === "REMOVE" && (
                <div className="grid grid-cols-4 items-center gap-4 animate-in fade-in slide-in-from-top-1">
                  <Label htmlFor="employee" className="text-right">Sold By</Label>
                  <div className="col-span-3">
                    <Select value={employeeId} onValueChange={setEmployeeId} required>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingEmployees ? "Loading employees..." : "Select Employee"} />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.khmerName || emp.englishName || `Employee #${emp.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              {/* New Stock Preview */}
              <div className="flex justify-end pt-2">
                <span className="text-xs text-muted-foreground">
                  New estimated stock:{" "}
                  <span className="font-bold tabular-nums text-foreground">
                    {newStockEstimate}
                  </span>
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Adjustment
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-8 text-center text-muted-foreground">No product selected</div>
        )}
      </DialogContent>
    </Dialog>
  );
};