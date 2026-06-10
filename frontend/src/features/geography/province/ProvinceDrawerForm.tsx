// src/features/geography/province/ProvinceDrawerForm.tsx
import React from 'react';
import { StatusBadge } from '../components/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Province } from './province.types';

interface ProvinceDrawerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProvince: Province | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export const ProvinceDrawerForm: React.FC<ProvinceDrawerFormProps> = ({
  open,
  onOpenChange,
  editingProvince,
  onSubmit,
  isSubmitting,
}) => {
  const [formData, setFormData] = React.useState({
    name: '',
    code: '',
    status: 'active' as const,
  });

  React.useEffect(() => {
    if (editingProvince) {
      setFormData({
        name: editingProvince.name,
        code: editingProvince.code,
        status: editingProvince.status,
      });
    } else {
      setFormData({ name: '', code: '', status: 'active' });
    }
  }, [editingProvince, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {editingProvince ? 'Edit Province' : 'Add New Province'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {editingProvince 
              ? 'Update province information and configuration.' 
              : 'Enter the details for the new operational territory.'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Province Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Ontario"
                required
                className="h-10 bg-background border-border focus-visible:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Province Code
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., ON"
                required
                maxLength={3}
                className="h-10 font-mono bg-background border-border focus-visible:ring-primary/20 uppercase"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Operational Status
              </Label>
              <RadioGroup 
                value={formData.status} 
                onValueChange={(val) => setFormData({ ...formData, status: val as 'active' | 'inactive' })}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="active" />
                  <Label htmlFor="active" className="cursor-pointer">
                    <StatusBadge status="active" />
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inactive" id="inactive" />
                  <Label htmlFor="inactive" className="cursor-pointer">
                    <StatusBadge status="inactive" />
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="h-10 px-6"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="h-10 px-6 min-w-[120px]" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingProvince ? 'Save Changes' : 'Create Province'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
