import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { staffService, type DepotStaff } from "../services/staff-service";

interface ManageStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depotId: string | number;
  depotName?: string;
}

const emptyForm = { name: "", email: "", phone: "" };

export const ManageStaffDialog: React.FC<ManageStaffDialogProps> = ({
  open,
  onOpenChange,
  depotId,
  depotName,
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<DepotStaff | null>(null);

  const { data: staffs = [], isLoading } = useQuery({
    queryKey: ["depot-staffs", depotId],
    queryFn: () => staffService.listByDepot(depotId),
    enabled: open && !!depotId,
  });

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setEditing(null);
    }
  }, [open]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["depot-staffs", depotId] });
    queryClient.invalidateQueries({ queryKey: ["depot", String(depotId)] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
      };
      if (editing) {
        return staffService.update(depotId, editing.id, payload);
      }
      return staffService.create(depotId, payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Staff updated" : "Staff added");
      setForm(emptyForm);
      setEditing(null);
      invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to save staff");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (staffId: number) => staffService.remove(depotId, staffId),
    onSuccess: () => {
      toast.success("Staff removed");
      if (editing) {
        setEditing(null);
        setForm(emptyForm);
      }
      invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to remove staff");
    },
  });

  const startEdit = (staff: DepotStaff) => {
    setEditing(staff);
    setForm({
      name: staff.name || "",
      email: staff.email || "",
      phone: staff.phone || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Staff
          </DialogTitle>
          <DialogDescription>
            Add depot staff for {depotName || `depot #${depotId}`}. Email must be unique.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="staff-name">Name *</Label>
              <Input
                id="staff-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Staff full name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">Email *</Label>
              <Input
                id="staff-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input
                id="staff-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Optional phone"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  setForm(emptyForm);
                }}
              >
                Cancel edit
              </Button>
            )}
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? (
                "Update Staff"
              ) : (
                <>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Staff
                </>
              )}
            </Button>
          </DialogFooter>
        </form>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    Loading staff...
                  </TableCell>
                </TableRow>
              ) : staffs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    No staff added yet.
                  </TableCell>
                </TableRow>
              ) : (
                staffs.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{staff.name}</TableCell>
                    <TableCell className="text-muted-foreground">{staff.email}</TableCell>
                    <TableCell className="text-muted-foreground">{staff.phone || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => startEdit(staff)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`Remove ${staff.name}?`)) {
                              deleteMutation.mutate(staff.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
