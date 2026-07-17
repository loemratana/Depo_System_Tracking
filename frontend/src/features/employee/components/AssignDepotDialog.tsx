import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Employee } from "@/features/employee/types/employee.types";

interface Depot {
  id: number;
  name: string;
  code?: string | null;
  city?: string | null;
  district?: string | null;
  status?: string | null;
}

interface AssignDepotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  depots: Depot[];
  onAssign: (depotId: number) => void;
  isAssigning: boolean;
  isLoadingDepots?: boolean;
}

export const AssignDepotDialog: React.FC<AssignDepotDialogProps> = ({
  open,
  onOpenChange,
  employee,
  depots,
  onAssign,
  isAssigning,
  isLoadingDepots = false,
}) => {
  const [selectedDepotId, setSelectedDepotId] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedDepotId("");
      setSearch("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = Array.isArray(depots) ? depots : [];
    const matched = !q
      ? list
      : list.filter((d) =>
          [d.name, d.code, d.city, d.district]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        );
    return matched.slice(0, 80);
  }, [depots, search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDepotId) onAssign(Number(selectedDepotId));
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Assign Depot</DialogTitle>
          <DialogDescription>
            Assign a depot to {employee.englishName || employee.khmerName || "this employee"}.
            {employee.depot?.name ? (
              <span className="mt-1 block">
                Current: <span className="font-medium text-foreground">{employee.depot.name}</span>
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Select Depot</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search depot name, code, location..."
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              {isLoadingDepots ? (
                <div className="flex h-28 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading depots...
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
                  No depots found.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((depot) => {
                    const selected = selectedDepotId === String(depot.id);
                    return (
                      <li key={depot.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedDepotId(String(depot.id))}
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
                            <p className="truncate text-sm font-medium">{depot.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {[depot.code, depot.district, depot.city].filter(Boolean).join(" · ") ||
                                `ID ${depot.id}`}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {!isLoadingDepots && depots.length > 80 && (
              <p className="text-[11px] text-muted-foreground">
                Showing first {filtered.length} matches. Type to narrow the list.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isAssigning || !selectedDepotId || isLoadingDepots}>
              {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Depot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
