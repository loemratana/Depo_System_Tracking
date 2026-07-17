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
import { Loader2 } from "lucide-react";
import { Employee } from "@/features/employee/types/employee.types";

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSave: (data: Partial<Employee>) => void;
  isSaving: boolean;
}

export const EditEmployeeDialog: React.FC<EditEmployeeDialogProps> = ({
  open,
  onOpenChange,
  employee,
  onSave,
  isSaving,
}) => {
  const [formData, setFormData] = useState<Partial<Employee>>({});

  useEffect(() => {
    if (employee) {
      setFormData({
        englishName: employee.englishName || "",
        khmerName: employee.khmerName || "",
        email: employee.email || "",
        phone: employee.phone || "",
        position: employee.position || "",
        department: employee.department || "",
        status: employee.status || "active",
      });
    }
  }, [employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update profile information for {employee.englishName || employee.khmerName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="englishName" className="text-xs font-medium">
                  English Name
                </Label>
                <Input
                  id="englishName"
                  value={formData.englishName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, englishName: e.target.value })
                  }
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="khmerName" className="text-xs font-medium">
                  Khmer Name
                </Label>
                <Input
                  id="khmerName"
                  value={formData.khmerName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, khmerName: e.target.value })
                  }
                  placeholder="ឈ្មោះជាភាសាខ្មែរ"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-medium">
                Phone
              </Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+855 12 345 678"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="position" className="text-xs font-medium">
                  Position
                </Label>
                <Input
                  id="position"
                  value={formData.position || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                  placeholder="e.g. Manager"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-xs font-medium">
                  Department
                </Label>
                <Input
                  id="department"
                  value={formData.department || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  placeholder="e.g. Sales"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-medium">
                Status
              </Label>
              <select
                id="status"
                value={formData.status || "active"}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};