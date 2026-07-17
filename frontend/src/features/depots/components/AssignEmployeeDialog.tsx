import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Search, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { employeeService } from "@/services/employee-service";
import { depotService } from "@/services/depot-service";

interface AssignEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depot: {
    id: number;
    name?: string;
    code?: string;
    ownerId?: number | null;
    owner?: string | null;
  } | null;
}

export const AssignEmployeeDialog: React.FC<AssignEmployeeDialogProps> = ({
  open,
  onOpenChange,
  depot,
}) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const { data: employeesResponse, isLoading } = useQuery({
    queryKey: ["employees", "assign-list"],
    queryFn: () => employeeService.getEmployees({ page: 1, pageSize: 1000 }),
    enabled: open,
  });

  const employees = useMemo(() => {
    const raw =
      employeesResponse?.employees ||
      employeesResponse?.data?.employees ||
      employeesResponse?.data ||
      [];
    return Array.isArray(raw) ? raw : [];
  }, [employeesResponse]);

  useEffect(() => {
    if (open && depot) {
      setSearch("");
      setSelectedEmployeeId(depot.ownerId ? String(depot.ownerId) : "");
    }
  }, [open, depot]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = !q
      ? employees
      : employees.filter((emp: any) =>
          [emp.khmerName, emp.englishName, emp.employeeCode, emp.email, emp.phone]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        );
    return matched.slice(0, 80);
  }, [employees, search]);

  const assignMutation = useMutation({
    mutationFn: async (employeeId: number | null) => {
      if (!depot?.id) throw new Error("Depot is required");
      return depotService.updateDepot(depot.id, { employeeId });
    },
    onSuccess: (_data, employeeId) => {
      queryClient.invalidateQueries({ queryKey: ["depots"] });
      toast.success(employeeId ? "Employee assigned to depot" : "Employee unassigned from depot");
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to assign employee");
    },
  });

  if (!depot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Assign Employee
          </DialogTitle>
          <DialogDescription>
            Assign a sale supervisor to{" "}
            <span className="font-medium text-foreground">{depot.name || `Depot #${depot.id}`}</span>
            {depot.owner && depot.owner !== "No Owner Assigned" ? (
              <span className="mt-1 block">
                Current: <span className="font-medium text-foreground">{depot.owner}</span>
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Select Employee</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, code, phone, email..."
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              {isLoading ? (
                <div className="flex h-28 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading employees...
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
                  No employees found.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((emp: any) => {
                    const id = String(emp.id);
                    const selected = selectedEmployeeId === id;
                    const name =
                      emp.englishName || emp.khmerName || emp.email || `Employee #${emp.id}`;
                    return (
                      <li key={emp.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedEmployeeId(id)}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                            selected && "bg-primary/10",
                          )}
                        >
                          <Check
                            className={cn(
                              "h-4 w-4 shrink-0",
                              selected ? "opacity-100 text-primary" : "opacity-0",
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {[emp.employeeCode, emp.phone, emp.position]
                                .filter(Boolean)
                                .join(" · ") || emp.email || `ID ${emp.id}`}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={assignMutation.isPending || !depot.ownerId}
            onClick={() => assignMutation.mutate(null)}
          >
            {assignMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserMinus className="mr-2 h-4 w-4" />
            )}
            Unassign
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedEmployeeId || assignMutation.isPending || isLoading}
              onClick={() => assignMutation.mutate(Number(selectedEmployeeId))}
            >
              {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Employee
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
