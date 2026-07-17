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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Loader2,
  PackageMinus,
  PackagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product, UpdateStockInput } from "../types/product.types";
import { useEmployees } from "../../employee/hooks/useEmployees";

type Direction = "ADD" | "REMOVE";
type StockReason = NonNullable<UpdateStockInput["reason"]>;

const IN_REASONS: { value: StockReason; label: string }[] = [
  { value: "restock", label: "Restock / Delivery" },
  { value: "adjustment", label: "Stock Audit" },
  { value: "manual", label: "Manual Adjustment" },
];

const OUT_REASONS: { value: StockReason; label: string }[] = [
  { value: "sale", label: "Sale — sold at depot" },
  { value: "damage", label: "Damaged / Loss" },
  { value: "adjustment", label: "Stock Audit" },
  { value: "manual", label: "Manual Adjustment" },
];

interface AdjustStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSave: (
    productId: number,
    type: Direction,
    amount: number,
    reason: StockReason,
    employeeId?: number,
    revenue?: number,
  ) => void;
  isSaving?: boolean;
}

export const AdjustStockDialog: React.FC<AdjustStockDialogProps> = ({
  open,
  onOpenChange,
  product,
  onSave,
  isSaving = false,
}) => {
  const [direction, setDirection] = useState<Direction>("REMOVE");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<StockReason>("sale");
  const [employeeId, setEmployeeId] = useState<string>("auto");
  const [revenue, setRevenue] = useState("");
  const [error, setError] = useState("");

  const { employees, loading: loadingEmployees } = useEmployees({
    page: 1,
    limit: 1000,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setDirection("REMOVE");
      setAmount("");
      setReason("sale");
      setEmployeeId("auto");
      setRevenue("");
      setError("");
    }
  }, [open]);

  const reasons = direction === "ADD" ? IN_REASONS : OUT_REASONS;
  const isSale = direction === "REMOVE" && reason === "sale";

  const handleDirectionChange = (next: Direction) => {
    setDirection(next);
    setReason(next === "ADD" ? "restock" : "sale");
    setError("");
  };

  const currentStock = product?.quantity ?? 0;
  const minStock = product?.minStock ?? 0;
  const amountNum = parseInt(amount) || 0;
  const newStock =
    direction === "ADD" ? currentStock + amountNum : currentStock - amountNum;

  const insufficient = direction === "REMOVE" && amountNum > currentStock;
  const willBeLow = amountNum > 0 && !insufficient && newStock > 0 && newStock < minStock;
  const willBeEmpty = amountNum > 0 && !insufficient && newStock === 0;

  const employeeOptions = [
    { value: "auto", label: "Auto — depot owner" },
    ...employees.map((emp) => ({
      value: emp.id.toString(),
      label: emp.khmerName || emp.englishName || `Employee #${emp.id}`,
    })),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!product) return;

    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid positive quantity.");
      return;
    }
    if (insufficient) {
      setError(`Cannot remove ${amountNum} units — only ${currentStock} in stock.`);
      return;
    }

    const finalEmployeeId =
      employeeId && employeeId !== "auto" ? parseInt(employeeId) : undefined;
    const finalRevenue = isSale && revenue ? parseFloat(revenue) : undefined;

    onSave(product.id, direction, amountNum, reason, finalEmployeeId, finalRevenue);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            Record a stock movement reported by the depot.
          </DialogDescription>
        </DialogHeader>

        {product ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product context */}
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    SKU {product.sku}
                    {product.depot?.name ? ` · ${product.depot.name}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    In stock
                  </p>
                  <p className="text-xl font-bold tabular-nums leading-tight text-foreground">
                    {currentStock}
                  </p>
                </div>
              </div>
            </div>

            {/* Direction */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDirectionChange("REMOVE")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  direction === "REMOVE"
                    ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                    : "border-border text-muted-foreground hover:bg-muted/50",
                )}
              >
                <PackageMinus className="h-4 w-4" />
                Stock Out
              </button>
              <button
                type="button"
                onClick={() => handleDirectionChange("ADD")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  direction === "ADD"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "border-border text-muted-foreground hover:bg-muted/50",
                )}
              >
                <PackagePlus className="h-4 w-4" />
                Stock In
              </button>
            </div>

            {/* Reason + Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Select value={reason} onValueChange={(v) => setReason(v as StockReason)}>
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasons.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Quantity</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError("");
                  }}
                  required
                  autoFocus
                  className="tabular-nums"
                />
              </div>
            </div>

            {/* Sale details */}
            {isSale && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-1.5">
                  <Label htmlFor="employee">Sold by</Label>
                  <SearchableSelect
                    id="employee"
                    value={employeeId}
                    onValueChange={setEmployeeId}
                    options={employeeOptions}
                    loading={loadingEmployees}
                    placeholder="Auto — depot owner"
                    searchPlaceholder="Search employees..."
                    emptyText="No employees found."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Counts toward this employee's monthly KPI. Leave on Auto to
                    credit the depot owner.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="revenue">Total amount (optional)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="revenue"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      className="pl-8 tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Result preview */}
            <div
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2.5",
                insufficient
                  ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40"
                  : "border-border bg-muted/30",
              )}
            >
              <span className="text-xs font-medium text-muted-foreground">
                Stock after adjustment
              </span>
              <span className="flex items-center gap-2 text-sm tabular-nums">
                <span className="text-muted-foreground">{currentStock}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span
                  className={cn(
                    "font-bold",
                    insufficient
                      ? "text-red-600 dark:text-red-400"
                      : direction === "ADD"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-foreground",
                  )}
                >
                  {amountNum > 0 ? newStock : "—"}
                </span>
              </span>
            </div>

            {(willBeLow || willBeEmpty) && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {willBeEmpty
                  ? "This product will be out of stock."
                  : `Stock will fall below the minimum of ${minStock}.`}
              </p>
            )}

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || insufficient}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {amountNum > 0
                  ? direction === "ADD"
                    ? `Add ${amountNum} Units`
                    : `Remove ${amountNum} Units`
                  : "Confirm Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No product selected
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
