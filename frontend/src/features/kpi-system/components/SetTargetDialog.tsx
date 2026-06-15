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
import { useEmployees } from "../../employee/hooks/useEmployees";
import { useAllDepots } from "../../depots/hooks/useAllDepots";

interface SetTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { employeeId: number; depotId: number; month: string; targetQty: number; targetRevenue: number }) => void;
}

export const SetTargetDialog: React.FC<SetTargetDialogProps> = ({
  open,
  onOpenChange,
  onSave,
}) => {
  const [employeeId, setEmployeeId] = useState("");
  const [depotId, setDepotId] = useState("");
  const [month, setMonth] = useState("2026-06");
  const [targetQty, setTargetQty] = useState("");
  const [targetRevenue, setTargetRevenue] = useState("");

  const { employees, loading: loadingEmployees } = useEmployees({ page: 1, limit: 1000 });
  const { data: depotsData, isLoading: loadingDepots } = useAllDepots();
  const depots = depotsData?.data || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeId && depotId && month && targetQty && targetRevenue) {
      onSave({
        employeeId: parseInt(employeeId),
        depotId: parseInt(depotId),
        month,
        targetQty: parseInt(targetQty),
        targetRevenue: parseFloat(targetRevenue),
      });
      onOpenChange(false);
      
      // Reset form
      setEmployeeId("");
      setDepotId("");
      setTargetQty("");
      setTargetRevenue("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Employee KPI Target</DialogTitle>
          <DialogDescription>
            Define the target quantity and revenue for an employee for a specific month.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="employee" className="text-right">Employee</Label>
              <div className="col-span-3">
                <Select value={employeeId} onValueChange={setEmployeeId} required>
                  <SelectTrigger id="employee">
                    <SelectValue placeholder={loadingEmployees ? "Loading..." : "Select Employee"} />
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

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="depot" className="text-right">Depot</Label>
              <div className="col-span-3">
                <Select value={depotId} onValueChange={setDepotId} required>
                  <SelectTrigger id="depot">
                    <SelectValue placeholder={loadingDepots ? "Loading..." : "Select Depot"} />
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

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="month" className="text-right">Month</Label>
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
              <Label htmlFor="targetQty" className="text-right">Target Qty</Label>
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

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="targetRevenue" className="text-right">Target Rev ($)</Label>
              <Input 
                id="targetRevenue" 
                type="number" 
                min="0" 
                step="0.01"
                value={targetRevenue} 
                onChange={(e) => setTargetRevenue(e.target.value)} 
                className="col-span-3" 
                required 
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Save Target</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
