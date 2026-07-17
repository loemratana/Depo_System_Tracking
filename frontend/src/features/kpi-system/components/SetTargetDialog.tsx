import React, { useMemo, useState } from "react";
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
import { useEmployees } from "../../employee/hooks/useEmployees";
import { useAllDepots } from "../../depots/hooks/useAllDepots";
import { formatDepotLabel } from "../../depots/utils/depot-label";

interface SetTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    employeeId: number;
    depotId: number;
    month: string;
    targetQty: number;
  }) => void | Promise<void>;
}

export const SetTargetDialog: React.FC<SetTargetDialogProps> = ({
  open,
  onOpenChange,
  onSave,
}) => {
  const [employeeId, setEmployeeId] = useState("");
  const [depotId, setDepotId] = useState("");
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });
  const [targetQty, setTargetQty] = useState("");
  const [saving, setSaving] = useState(false);

  const { employees, loading: loadingEmployees } = useEmployees({
    page: 1,
    limit: 1000,
    enabled: open,
  });
  const { data: depotsData, isLoading: loadingDepots } = useAllDepots({ enabled: open });
  const depots = depotsData?.data || [];

  const employeeOptions = useMemo(
    () =>
      employees.map((emp) => ({
        value: emp.id.toString(),
        label: emp.khmerName || emp.englishName || `Employee #${emp.id}`,
      })),
    [employees],
  );

  const depotOptions = useMemo(
    () =>
      depots.map((depot: { id: number; name: string; district?: string; city?: string }) => ({
        value: depot.id.toString(),
        label: formatDepotLabel(depot.name, depot.district, depot.city),
      })),
    [depots],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(employeeId && depotId && month && targetQty)) return;

    setSaving(true);
    try {
      await onSave({
        employeeId: parseInt(employeeId),
        depotId: parseInt(depotId),
        month,
        targetQty: parseInt(targetQty),
      });
      onOpenChange(false);
      setEmployeeId("");
      setDepotId("");
      setTargetQty("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Employee KPI Target</DialogTitle>
          <DialogDescription>
            Define the target quantity for an employee for a specific month.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="employee" className="text-right">
                Employee
              </Label>
              <div className="col-span-3">
                <SearchableSelect
                  id="employee"
                  value={employeeId}
                  onValueChange={setEmployeeId}
                  options={employeeOptions}
                  loading={loadingEmployees}
                  placeholder="Select employee"
                  searchPlaceholder="Search employees..."
                  emptyText="No employees found."
                />
              </div>
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
                  loading={loadingDepots}
                  placeholder="Select depot"
                  searchPlaceholder="Search depots..."
                  emptyText="No depots found."
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="month" className="text-right">
                Month
              </Label>
              <Input
                id="month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="targetQty" className="text-right">
                Target Qty
              </Label>
              <Input
                id="targetQty"
                type="number"
                min="0"
                value={targetQty}
                onChange={(e) => setTargetQty(e.target.value)}
                className="col-span-3"
                required
              />
            </div>

          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Target"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
